import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jose from 'jose';
import { firstValueFrom } from 'rxjs';

import { PrismaService } from '../prisma/prisma.service';


import type { LtiClaims, AgsScore } from './lti.interfaces';
import { LTI_VERSION } from './lti.interfaces';

type DecodedLtiClaims = Omit<LtiClaims, 'aud'> & { aud: string | string[] };

@Injectable()
export class LtiService {
  private readonly logger = new Logger(LtiService.name);
  private readonly toolUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.toolUrl = this.config.get<string>('APP_URL', 'https://bbt.edu.pk');
  }

  // ── Platform management ─────────────────────────────────────────────────────

  async registerPlatform(dto: {
    name: string;
    clientId: string;
    authLoginUrl: string;
    authTokenUrl: string;
    keySetUrl: string;
    accessTokenUrl: string;
  }) {
    const platform = await this.prisma.ltiPlatform.upsert({
      where: { clientId: dto.clientId },
      update: { ...dto, isActive: true },
      create: { ...dto },
    });
    return platform;
  }

  async listPlatforms() {
    return this.prisma.ltiPlatform.findMany({ where: { isActive: true } });
  }

  async deletePlatform(id: string) {
    await this.prisma.ltiPlatform.update({ where: { id }, data: { isActive: false } });
  }

  // ── OIDC Login initiation (step 1) ─────────────────────────────────────────

  async initiateLogin(params: {
    iss: string;
    login_hint: string;
    target_link_uri: string;
    lti_message_hint?: string;
    client_id?: string;
  }): Promise<string> {
    const clientId = params.client_id;
    const platform = await this.prisma.ltiPlatform.findFirst({
      where: {
        isActive: true,
        ...(clientId ? { clientId } : {}),
      },
    });
    if (!platform) throw new NotFoundException('LTI platform not registered');

    const nonce = jose.base64url.encode(crypto.getRandomValues(new Uint8Array(16)));
    const state = jose.base64url.encode(crypto.getRandomValues(new Uint8Array(16)));

    // Persist nonce (5 min TTL)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await this.prisma.ltiNonce.create({ data: { nonce, expiresAt } });

    const params_ = new URLSearchParams({
      scope: 'openid',
      response_type: 'id_token',
      client_id: platform.clientId,
      redirect_uri: `${this.toolUrl}/lti/launch`,
      login_hint: params.login_hint,
      state,
      response_mode: 'form_post',
      nonce,
      prompt: 'none',
      ...(params.lti_message_hint ? { lti_message_hint: params.lti_message_hint } : {}),
    });

    return `${platform.authLoginUrl}?${params_.toString()}`;
  }

  // ── LTI Launch / OIDC auth response (step 2) ───────────────────────────────

  async processLaunch(idToken: string): Promise<{
    launchId: string;
    messageType: string;
    learnerId: string | null;
    trackId: string | null;
    lineItemUrl: string | null;
    deepLinkReturnUrl: string | null;
    claims: LtiClaims;
  }> {
    // Decode header to find key id and issuer
    const decoded = jose.decodeJwt(idToken) as unknown as DecodedLtiClaims;
    const iss = decoded.iss;
    const aud = Array.isArray(decoded.aud) ? decoded.aud[0] : decoded.aud;
    if (!iss || typeof aud !== 'string') throw new BadRequestException('Invalid LTI token: missing iss/aud');
    const claims: LtiClaims = { ...decoded, aud };

    const platform = await this.prisma.ltiPlatform.findFirst({
      where: { clientId: aud, isActive: true },
    });
    if (!platform) throw new UnauthorizedException('Platform not registered');

    // Validate JWT against platform's JWKS
    await this.verifyToken(idToken, platform.keySetUrl, aud);

    // Validate nonce (replay protection)
    await this.consumeNonce(decoded.nonce);

    // Validate LTI version
    const version = decoded['https://purl.imsglobal.org/spec/lti/claim/version'];
    if (version !== LTI_VERSION) throw new BadRequestException(`Unsupported LTI version: ${version}`);

    const messageType = decoded['https://purl.imsglobal.org/spec/lti/claim/message_type'];
    const context = decoded['https://purl.imsglobal.org/spec/lti/claim/context'];
    const resourceLink = decoded['https://purl.imsglobal.org/spec/lti/claim/resource_link'];
    const agsClaim = decoded['https://purl.imsglobal.org/spec/lti-ags/claim/endpoint'];
    const nrpsClaim = decoded['https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice'];
    const dlSettings = decoded['https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings'];

    // Find or create BBT user from LTI sub
    const learnerId = await this.resolveUser(claims, platform.clientId);

    // Resolve custom track claim
    const custom = decoded['https://purl.imsglobal.org/spec/lti/claim/custom'];
    const trackId = custom?.['trackId'] ?? null;

    // Persist launch record
    const launch = await this.prisma.ltiLaunch.create({
      data: {
        platformId: platform.id,
        ...(learnerId ? { learnerId } : {}),
        contextId: context?.id ?? resourceLink.id,
        resourceLinkId: resourceLink.id,
        ...(agsClaim?.lineitem ? { lineItemUrl: agsClaim.lineitem } : {}),
        ...(nrpsClaim?.context_memberships_url ? { nrpsUrl: nrpsClaim.context_memberships_url } : {}),
        ...(dlSettings ? { deepLinkingData: dlSettings as object } : {}),
      },
    });

    return {
      launchId: launch.id,
      messageType,
      learnerId,
      trackId,
      lineItemUrl: agsClaim?.lineitem ?? null,
      deepLinkReturnUrl: dlSettings?.deep_link_return_url ?? null,
      claims,
    };
  }

  // ── Deep Linking response ───────────────────────────────────────────────────

  async buildDeepLinkResponse(
    launchId: string,
    items: Array<{ type: 'ltiResourceLink'; title: string; url: string; trackId: string }>,
  ): Promise<{ returnUrl: string; jwt: string }> {
    const launch = await this.prisma.ltiLaunch.findUnique({
      where: { id: launchId },
      include: { platform: true },
    });
    if (!launch?.deepLinkingData) throw new NotFoundException('Launch not found or not a deep linking session');

    const dlData = launch.deepLinkingData as {
      deep_link_return_url: string;
      accept_types: string[];
    };

    const contentItems = items.map((item) => ({
      type: item.type,
      title: item.title,
      url: item.url,
      custom: { trackId: item.trackId },
    }));

    const privateKey = await this.getToolPrivateKey();

    const jwt = await new jose.SignJWT({
      'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiDeepLinkingResponse',
      'https://purl.imsglobal.org/spec/lti/claim/version': LTI_VERSION,
      'https://purl.imsglobal.org/spec/lti/claim/deployment_id': 'bbt-deployment',
      'https://purl.imsglobal.org/spec/lti-dl/claim/content_items': contentItems,
    })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuer(this.toolUrl)
      .setAudience(launch.platform.clientId)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey);

    return { returnUrl: dlData.deep_link_return_url, jwt };
  }

  // ── AGS — Grade passback ────────────────────────────────────────────────────

  async postScore(lineItemUrl: string, platformId: string, score: AgsScore): Promise<void> {
    const platform = await this.prisma.ltiPlatform.findUnique({ where: { id: platformId } });
    if (!platform) throw new NotFoundException('Platform not found');

    const accessToken = await this.getAccessToken(
      platform.accessTokenUrl,
      platform.clientId,
      ['https://purl.imsglobal.org/spec/lti-ags/scope/score'],
    );

    const scoreUrl = lineItemUrl.endsWith('/scores') ? lineItemUrl : `${lineItemUrl}/scores`;

    await firstValueFrom(
      this.http.post(scoreUrl, score, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/vnd.ims.lis.v1.score+json',
        },
      }),
    );

    this.logger.log(`AGS score posted to ${scoreUrl} for user ${score.userId}`);
  }

  // ── NRPS — Roster sync ──────────────────────────────────────────────────────

  async syncRoster(launchId: string, trackId: string): Promise<{ enrolled: number; skipped: number }> {
    const launch = await this.prisma.ltiLaunch.findUnique({
      where: { id: launchId },
      include: { platform: true },
    });
    if (!launch?.nrpsUrl) throw new NotFoundException('No NRPS URL for this launch');

    const accessToken = await this.getAccessToken(
      launch.platform.accessTokenUrl,
      launch.platform.clientId,
      ['https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly'],
    );

    const res = await firstValueFrom(
      this.http.get<{ members: Array<{ user_id: string; name: string; email: string; roles: string[] }> }>(
        launch.nrpsUrl,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.ims.lti-nrps.v2.membershipcontainer+json',
          },
        },
      ),
    );

    let enrolled = 0;
    let skipped = 0;

    for (const member of res.data.members ?? []) {
      const isLearner = member.roles.some((r) =>
        r.includes('Learner') || r.includes('Student'),
      );
      if (!isLearner) { skipped++; continue; }

      const email = member.email?.toLowerCase();
      if (!email) { skipped++; continue; }

      // Find or create user
      let user = await this.prisma.user.findFirst({ where: { email } });
      if (!user) {
        user = await this.prisma.user.create({
          data: {
            email,
            name: member.name ?? email,
            passwordHash: '',
            role: 'LEARNER',
            emailVerified: true,
          },
        });
        await this.prisma.learnerProfile.create({ data: { userId: user.id } });
      }

      // Enroll in track if not already enrolled
      if (trackId) {
        const existing = await this.prisma.enrollment.findUnique({
          where: { learnerId_trackId: { learnerId: user.id, trackId } },
        });
        if (!existing) {
          await this.prisma.enrollment.create({
            data: { learnerId: user.id, trackId, plan: 'FREE' },
          });
        }
      }
      enrolled++;
    }

    return { enrolled, skipped };
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private async verifyToken(idToken: string, keySetUrl: string, audience: string): Promise<void> {
    const JWKS = jose.createRemoteJWKSet(new URL(keySetUrl));
    await jose.jwtVerify(idToken, JWKS, {
      audience,
      clockTolerance: 30,
    });
  }

  private async consumeNonce(nonce: string): Promise<void> {
    const record = await this.prisma.ltiNonce.findUnique({ where: { nonce } });
    if (!record) throw new UnauthorizedException('Invalid or replayed nonce');
    if (record.expiresAt < new Date()) throw new UnauthorizedException('Nonce expired');
    await this.prisma.ltiNonce.delete({ where: { nonce } });
  }

  private async resolveUser(claims: LtiClaims, _clientId: string): Promise<string | null> {
    if (!claims.email) return null;
    const email = claims.email.toLowerCase();

    let user = await this.prisma.user.findFirst({ where: { email } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          name: claims.name ?? claims.given_name ?? email,
          passwordHash: '',
          role: 'LEARNER',
          emailVerified: true,
          ...(claims.picture ? { avatarUrl: claims.picture } : {}),
        },
      });
      await this.prisma.learnerProfile.create({ data: { userId: user.id } });
    }
    return user.id;
  }

  private async getAccessToken(
    tokenUrl: string,
    clientId: string,
    scopes: string[],
  ): Promise<string> {
    const privateKey = await this.getToolPrivateKey();
    const clientAssertion = await new jose.SignJWT({})
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuer(clientId)
      .setSubject(clientId)
      .setAudience(tokenUrl)
      .setIssuedAt()
      .setExpirationTime('1m')
      .setJti(crypto.randomUUID())
      .sign(privateKey);

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: clientAssertion,
      scope: scopes.join(' '),
    });

    const res = await firstValueFrom(
      this.http.post<{ access_token: string }>(tokenUrl, body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }),
    );

    return res.data.access_token;
  }

  private async getToolPrivateKey(): Promise<object> {
    const privateKeyPem = this.config.get<string>('LTI_PRIVATE_KEY', '');
    if (!privateKeyPem) throw new Error('LTI_PRIVATE_KEY not configured');
    return jose.importPKCS8(privateKeyPem, 'RS256') as Promise<object>;
  }
}
