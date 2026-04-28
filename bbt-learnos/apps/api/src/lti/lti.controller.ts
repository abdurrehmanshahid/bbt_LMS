import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { LtiService } from './lti.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { LTI_MESSAGE_TYPE_DEEP_LINK } from './lti.interfaces';

@Controller('lti')
export class LtiController {
  constructor(private readonly ltiService: LtiService) {}

  // ── OIDC Login initiation — platform POSTs here first ──────────────────────

  @Post('login')
  @HttpCode(HttpStatus.FOUND)
  async login(
    @Body()
    body: {
      iss: string;
      login_hint: string;
      target_link_uri: string;
      lti_message_hint?: string;
      client_id?: string;
    },
    @Res() res: Response,
  ): Promise<void> {
    const redirectUrl = await this.ltiService.initiateLogin({
      iss: body.iss,
      login_hint: body.login_hint,
      target_link_uri: body.target_link_uri,
      ...(body.lti_message_hint ? { lti_message_hint: body.lti_message_hint } : {}),
      ...(body.client_id ? { client_id: body.client_id } : {}),
    });
    res.redirect(302, redirectUrl);
  }

  // ── OIDC auth response — platform POSTs JWT here ───────────────────────────

  @Post('launch')
  @HttpCode(HttpStatus.OK)
  async launch(
    @Body('id_token') idToken: string,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.ltiService.processLaunch(idToken);

    if (result.messageType === LTI_MESSAGE_TYPE_DEEP_LINK) {
      // Redirect to deep linking content selector in Next.js
      res.redirect(
        302,
        `/lti/deep-link?launchId=${result.launchId}${result.trackId ? `&trackId=${result.trackId}` : ''}`,
      );
      return;
    }

    // Regular resource link launch — redirect learner into BBT
    const target = result.trackId
      ? `/track/${result.trackId}?ltiLaunchId=${result.launchId}`
      : `/dashboard?ltiLaunchId=${result.launchId}`;

    res.redirect(302, target);
  }

  // ── Deep linking response (called by Next.js UI) ────────────────────────────

  @Post('deep-link/response')
  @UseGuards(JwtAuthGuard)
  async deepLinkResponse(
    @Body()
    body: {
      launchId: string;
      items: Array<{ type: 'ltiResourceLink'; title: string; url: string; trackId: string }>;
    },
    @Res() res: Response,
  ): Promise<void> {
    const { returnUrl, jwt } = await this.ltiService.buildDeepLinkResponse(body.launchId, body.items);

    // Render auto-submit form (must POST JWT to platform)
    res.setHeader('Content-Type', 'text/html');
    res.send(`<!doctype html>
<html>
<body onload="document.forms[0].submit()">
  <form method="POST" action="${returnUrl}">
    <input type="hidden" name="JWT" value="${jwt}" />
    <noscript><button type="submit">Return to LMS</button></noscript>
  </form>
</body>
</html>`);
  }

  // ── Admin: platform management ──────────────────────────────────────────────

  @Post('platforms')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  registerPlatform(
    @Body()
    body: {
      name: string;
      clientId: string;
      authLoginUrl: string;
      authTokenUrl: string;
      keySetUrl: string;
      accessTokenUrl: string;
    },
  ) {
    return this.ltiService.registerPlatform(body);
  }

  @Get('platforms')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  listPlatforms() {
    return this.ltiService.listPlatforms();
  }

  @Delete('platforms/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePlatform(@Param('id') id: string) {
    return this.ltiService.deletePlatform(id);
  }

  // ── Admin: NRPS roster sync ─────────────────────────────────────────────────

  @Post('launches/:launchId/sync-roster')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  syncRoster(
    @Param('launchId') launchId: string,
    @Body('trackId') trackId: string,
  ) {
    return this.ltiService.syncRoster(launchId, trackId);
  }

  // ── Tool public JWKS (platforms fetch our public key) ──────────────────────

  @Get('.well-known/jwks.json')
  async getJwks(): Promise<object> {
    // In production: load LTI_PUBLIC_KEY, export as JWKS
    // Returning empty keyset stub — key is generated at deploy time
    return { keys: [] };
  }
}
