import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LiveSessionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

interface DailyRoom {
  id: string;
  name: string;
  url: string;
}

interface DailyToken {
  token: string;
}

export interface CreateLiveSessionDto {
  trackId: string;
  title: string;
  description?: string;
  scheduledAt: string; // ISO string
  maxParticipants?: number;
}

@Injectable()
export class LiveSessionService {
  private readonly logger = new Logger(LiveSessionService.name);
  private readonly dailyApiKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationService,
  ) {
    this.dailyApiKey = this.config.get<string>('DAILY_API_KEY', '');
  }

  // ── Creator operations ──────────────────────────────────────────────────────

  async createSession(creatorId: string, dto: CreateLiveSessionDto) {
    const track = await this.prisma.track.findUnique({ where: { id: dto.trackId } });
    if (!track) throw new NotFoundException('Track not found');

    const scheduledAt = new Date(dto.scheduledAt);
    if (isNaN(scheduledAt.getTime())) throw new BadRequestException('Invalid scheduledAt date');

    // Create Daily.co room (expires 1h after scheduled time)
    const expAt = Math.floor(scheduledAt.getTime() / 1000) + 4 * 3600; // 4h window
    const room = await this.createDailyRoom({
      privacy: 'private',
      properties: {
        exp: expAt,
        max_participants: dto.maxParticipants ?? 100,
        enable_screenshare: true,
        enable_recording: 'cloud',
      },
    });

    return this.prisma.liveSession.create({
      data: {
        creatorId,
        trackId: dto.trackId,
        title: dto.title,
        ...(dto.description ? { description: dto.description } : {}),
        scheduledAt,
        maxParticipants: dto.maxParticipants ?? 100,
        ...(room ? { dailyRoomName: room.name, dailyRoomUrl: room.url } : {}),
        status: LiveSessionStatus.SCHEDULED,
      },
      select: this.sessionSelect(),
    });
  }

  async listCreatorSessions(creatorId: string) {
    return this.prisma.liveSession.findMany({
      where: { creatorId },
      orderBy: { scheduledAt: 'desc' },
      take: 50,
      select: this.sessionSelect(),
    });
  }

  async startSession(creatorId: string, sessionId: string): Promise<{ ownerToken: string } & Record<string, unknown>> {
    const session = await this.getSessionOrThrow(sessionId);
    if (session.creatorId !== creatorId) throw new ForbiddenException();
    if (session.status !== LiveSessionStatus.SCHEDULED) {
      throw new BadRequestException('Session is not in SCHEDULED state');
    }

    await this.prisma.liveSession.update({
      where: { id: sessionId },
      data: { status: LiveSessionStatus.LIVE, startedAt: new Date() },
    });

    // Notify all enrolled learners in the track
    const enrollments = await this.prisma.enrollment.findMany({
      where: { trackId: session.trackId, status: 'ACTIVE' },
      select: { learnerId: true },
    });

    const notifyAll = enrollments.map((e) =>
      this.notifications.sendPush({
        userId: e.learnerId,
        title: '🔴 Live now',
        body: `${session.title} is starting on ${session.track.title}`,
        category: 'COHORT_ACTIVITY',
        data: { liveSessionId: sessionId, type: 'LIVE_START' },
      }).catch(() => undefined),
    );
    void Promise.all(notifyAll);

    const ownerToken = await this.createMeetingToken(session.dailyRoomName ?? '', creatorId, true);
    const updated = await this.prisma.liveSession.findUnique({ where: { id: sessionId }, select: this.sessionSelect() });

    return { ...updated!, ownerToken };
  }

  async endSession(creatorId: string, sessionId: string) {
    const session = await this.getSessionOrThrow(sessionId);
    if (session.creatorId !== creatorId) throw new ForbiddenException();
    if (session.status !== LiveSessionStatus.LIVE) {
      throw new BadRequestException('Session is not LIVE');
    }

    await this.prisma.liveSession.update({
      where: { id: sessionId },
      data: { status: LiveSessionStatus.ENDED, endedAt: new Date() },
    });

    // Delete the Daily.co room to free up resources
    if (session.dailyRoomName) {
      await this.deleteDailyRoom(session.dailyRoomName);
    }

    return { sessionId, status: 'ENDED' };
  }

  async cancelSession(creatorId: string, sessionId: string) {
    const session = await this.getSessionOrThrow(sessionId);
    if (session.creatorId !== creatorId) throw new ForbiddenException();
    if (session.status === LiveSessionStatus.LIVE || session.status === LiveSessionStatus.ENDED) {
      throw new BadRequestException('Cannot cancel an active or ended session');
    }

    await this.prisma.liveSession.update({
      where: { id: sessionId },
      data: { status: LiveSessionStatus.CANCELLED },
    });

    if (session.dailyRoomName) {
      await this.deleteDailyRoom(session.dailyRoomName);
    }

    return { sessionId, status: 'CANCELLED' };
  }

  // ── Learner operations ──────────────────────────────────────────────────────

  async listUpcomingSessions(learnerId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { learnerId, status: 'ACTIVE' },
      select: { trackId: true },
    });
    const trackIds = enrollments.map((e) => e.trackId);

    return this.prisma.liveSession.findMany({
      where: {
        trackId: { in: trackIds },
        status: { in: [LiveSessionStatus.SCHEDULED, LiveSessionStatus.LIVE] },
        scheduledAt: { gte: new Date(Date.now() - 3600_000) }, // include sessions started up to 1h ago
      },
      orderBy: { scheduledAt: 'asc' },
      take: 20,
      select: this.sessionSelect(),
    });
  }

  async joinSession(learnerId: string, sessionId: string): Promise<{ participantToken: string } & Record<string, unknown>> {
    const session = await this.getSessionOrThrow(sessionId);

    // Check enrollment
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { learnerId, trackId: session.trackId, status: 'ACTIVE' },
    });
    if (!enrollment) throw new ForbiddenException('You must be enrolled in this track to join the session');

    if (session.status === LiveSessionStatus.CANCELLED || session.status === LiveSessionStatus.ENDED) {
      throw new BadRequestException('Session is no longer available');
    }

    const participantToken = await this.createMeetingToken(session.dailyRoomName ?? '', learnerId, false);

    return { ...session, participantToken };
  }

  // ── Daily.co API helpers ────────────────────────────────────────────────────

  private async createDailyRoom(opts: {
    privacy: 'private' | 'public';
    properties: {
      exp: number;
      max_participants: number;
      enable_screenshare: boolean;
      enable_recording: string;
    };
  }): Promise<DailyRoom | null> {
    if (!this.dailyApiKey) {
      this.logger.warn('DAILY_API_KEY not set — returning null room');
      return null;
    }

    try {
      const res = await fetch('https://api.daily.co/v1/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.dailyApiKey}`,
        },
        body: JSON.stringify(opts),
      });

      if (!res.ok) {
        const text = await res.text();
        this.logger.warn(`Daily.co room create failed: ${res.status} ${text}`);
        return null;
      }

      return res.json() as Promise<DailyRoom>;
    } catch (err) {
      this.logger.warn(`Daily.co room create error: ${(err as Error).message}`);
      return null;
    }
  }

  private async deleteDailyRoom(roomName: string): Promise<void> {
    if (!this.dailyApiKey) return;
    try {
      await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${this.dailyApiKey}` },
      });
    } catch (err) {
      this.logger.warn(`Daily.co room delete error: ${(err as Error).message}`);
    }
  }

  private async createMeetingToken(roomName: string, userId: string, isOwner: boolean): Promise<string> {
    if (!this.dailyApiKey || !roomName) return '';

    try {
      const exp = Math.floor(Date.now() / 1000) + 4 * 3600;
      const res = await fetch('https://api.daily.co/v1/meeting-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.dailyApiKey}`,
        },
        body: JSON.stringify({
          properties: {
            room_name: roomName,
            is_owner: isOwner,
            user_id: userId,
            exp,
          },
        }),
      });

      if (!res.ok) return '';
      const data = await res.json() as DailyToken;
      return data.token;
    } catch {
      return '';
    }
  }

  // ── Shared ──────────────────────────────────────────────────────────────────

  private async getSessionOrThrow(sessionId: string) {
    const session = await this.prisma.liveSession.findUnique({
      where: { id: sessionId },
      include: { track: { select: { title: true } } },
    });
    if (!session) throw new NotFoundException('Live session not found');
    return session;
  }

  private sessionSelect() {
    return {
      id: true,
      title: true,
      description: true,
      scheduledAt: true,
      status: true,
      dailyRoomUrl: true,
      maxParticipants: true,
      startedAt: true,
      endedAt: true,
      createdAt: true,
      creatorId: true,
      trackId: true,
      creator: { select: { name: true, avatarUrl: true, creatorProfile: { select: { displayName: true } } } },
      track: { select: { title: true, icon: true } },
    } as const;
  }
}
