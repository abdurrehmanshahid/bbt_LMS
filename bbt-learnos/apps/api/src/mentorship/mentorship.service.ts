import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

export interface CreateSlotDto {
  title?: string;
  durationMin?: number;
  startsAt: string; // ISO string
}

interface DailyRoom {
  name: string;
  url: string;
}


@Injectable()
export class MentorshipService {
  private readonly logger = new Logger(MentorshipService.name);
  private readonly dailyApiKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationService,
  ) {
    this.dailyApiKey = this.config.get<string>('DAILY_API_KEY', '');
  }

  // ── Creator: manage slots ───────────────────────────────────────────────────

  async createSlot(creatorId: string, dto: CreateSlotDto) {
    await this.assertMentorEligible(creatorId);

    const startsAt = new Date(dto.startsAt);
    if (isNaN(startsAt.getTime())) throw new BadRequestException('Invalid startsAt date');
    if (startsAt < new Date()) throw new BadRequestException('Slot must be in the future');

    return this.prisma.mentorshipSlot.create({
      data: {
        creatorId,
        title: dto.title ?? 'Office Hours',
        durationMin: dto.durationMin ?? 30,
        startsAt,
      },
      select: this.slotSelect(),
    });
  }

  async listCreatorSlots(creatorId: string) {
    return this.prisma.mentorshipSlot.findMany({
      where: { creatorId, startsAt: { gte: new Date() } },
      orderBy: { startsAt: 'asc' },
      take: 50,
      select: this.slotSelect(),
    });
  }

  async deleteSlot(creatorId: string, slotId: string) {
    const slot = await this.prisma.mentorshipSlot.findUnique({ where: { id: slotId }, include: { booking: true } });
    if (!slot) throw new NotFoundException('Slot not found');
    if (slot.creatorId !== creatorId) throw new ForbiddenException();
    if (slot.isBooked) throw new ConflictException('Cannot delete a booked slot — cancel the booking first');

    await this.prisma.mentorshipSlot.delete({ where: { id: slotId } });
    return { deleted: slotId };
  }

  // ── Creator: tier upgrade request ───────────────────────────────────────────

  async requestTierUpgrade(creatorId: string) {
    const profile = await this.prisma.creatorProfile.findUnique({ where: { userId: creatorId } });
    if (!profile) throw new NotFoundException('Creator profile not found');
    if (profile.tier >= 3) throw new BadRequestException('Already at maximum tier');
    if (profile.tierUpgradeRequestedAt) throw new ConflictException('Upgrade request already pending');

    // Minimum quality bar: qualityScore >= 0.5, no more than 3 moderation flags
    if (profile.qualityScore < 0.5) throw new BadRequestException('Quality score below minimum (50) for tier upgrade');
    if (profile.moderationFlags >= 3) throw new BadRequestException('Too many moderation flags for tier upgrade');

    await this.prisma.creatorProfile.update({
      where: { userId: creatorId },
      data: { tierUpgradeRequestedAt: new Date() },
    });

    return { requested: true, currentTier: profile.tier, requestedTier: profile.tier + 1 };
  }

  // ── Learner: browse + book ──────────────────────────────────────────────────

  async listAvailableCreators(trackId?: string) {
    const profiles = await this.prisma.creatorProfile.findMany({
      where: { tier: { gte: 2 } },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            content: {
              where: { status: 'APPROVED', ...(trackId ? { trackId } : {}) },
              orderBy: { viewCount: 'desc' },
              take: 3,
              select: { id: true, title: true, thumbnailUrl: true, trackId: true },
            },
            mentorshipSlots: {
              where: { isBooked: false, startsAt: { gte: new Date() } },
              orderBy: { startsAt: 'asc' },
              take: 5,
              select: { id: true, title: true, durationMin: true, startsAt: true },
            },
          },
        },
      },
    });

    return profiles
      .filter((p) => p.user.mentorshipSlots.length > 0)
      .map((p) => ({
        creatorId: p.userId,
        displayName: p.displayName,
        name: p.user.name,
        avatarUrl: p.user.avatarUrl,
        tier: p.tier,
        qualityScore: Math.round(p.qualityScore * 100),
        bio: p.bio,
        topContent: p.user.content,
        availableSlots: p.user.mentorshipSlots,
      }));
  }

  async bookSlot(learnerId: string, slotId: string) {
    const slot = await this.prisma.mentorshipSlot.findUnique({
      where: { id: slotId },
      include: { creator: { select: { name: true } }, booking: true },
    });
    if (!slot) throw new NotFoundException('Slot not found');
    if (slot.isBooked) throw new ConflictException('This slot is already booked');
    if (slot.startsAt < new Date()) throw new BadRequestException('Slot is in the past');

    // Create Daily.co room for this 1:1 session
    const exp = Math.floor(slot.startsAt.getTime() / 1000) + slot.durationMin * 60 + 900; // slot duration + 15min buffer
    const room = await this.createDailyRoom(exp, 2);

    await this.prisma.$transaction([
      this.prisma.mentorshipSlot.update({
        where: { id: slotId },
        data: { isBooked: true },
      }),
      this.prisma.mentorshipBooking.create({
        data: {
          slotId,
          learnerId,
          ...(room ? { dailyRoomName: room.name, dailyRoomUrl: room.url } : {}),
          status: 'CONFIRMED',
        },
      }),
    ]);

    // Notify creator
    void this.notifications.sendPush({
      userId: slot.creatorId,
      title: 'Mentorship session booked',
      body: `A learner booked your "${slot.title}" slot on ${slot.startsAt.toLocaleDateString()}`,
      category: 'MODERATION',
      data: { type: 'MENTORSHIP_BOOKED', slotId },
    }).catch(() => undefined);

    return {
      slotId,
      learnerId,
      startsAt: slot.startsAt.toISOString(),
      durationMin: slot.durationMin,
      creatorName: slot.creator.name,
      roomUrl: room?.url ?? null,
    };
  }

  async listLearnerBookings(learnerId: string) {
    const bookings = await this.prisma.mentorshipBooking.findMany({
      where: { learnerId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        slot: {
          select: {
            title: true,
            durationMin: true,
            startsAt: true,
            creator: { select: { name: true, avatarUrl: true, creatorProfile: { select: { displayName: true, tier: true } } } },
          },
        },
      },
    });

    return bookings.map((b) => ({
      bookingId: b.id,
      status: b.status,
      roomUrl: b.dailyRoomUrl,
      startsAt: b.slot.startsAt.toISOString(),
      durationMin: b.slot.durationMin,
      title: b.slot.title,
      creatorName: b.slot.creator.name,
      creatorDisplayName: b.slot.creator.creatorProfile?.displayName ?? b.slot.creator.name,
      creatorTier: b.slot.creator.creatorProfile?.tier ?? 1,
    }));
  }

  async cancelBooking(learnerId: string, bookingId: string) {
    const booking = await this.prisma.mentorshipBooking.findUnique({
      where: { id: bookingId },
      include: { slot: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.learnerId !== learnerId) throw new ForbiddenException();
    if (booking.status === 'CANCELLED') throw new ConflictException('Already cancelled');

    // Must cancel at least 1h before session
    const hoursUntilSession = (booking.slot.startsAt.getTime() - Date.now()) / 3600_000;
    if (hoursUntilSession < 1) throw new BadRequestException('Cannot cancel within 1 hour of session');

    await this.prisma.$transaction([
      this.prisma.mentorshipBooking.update({ where: { id: bookingId }, data: { status: 'CANCELLED' } }),
      this.prisma.mentorshipSlot.update({ where: { id: booking.slotId }, data: { isBooked: false } }),
    ]);

    if (booking.dailyRoomName) await this.deleteDailyRoom(booking.dailyRoomName);

    return { cancelled: bookingId };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private async assertMentorEligible(creatorId: string) {
    const profile = await this.prisma.creatorProfile.findUnique({ where: { userId: creatorId } });
    if (!profile) throw new NotFoundException('Creator profile not found');
    if (profile.tier < 2) throw new ForbiddenException('Tier 2 or higher required to offer mentorship slots');
  }

  private async createDailyRoom(exp: number, maxParticipants: number): Promise<DailyRoom | null> {
    if (!this.dailyApiKey) return null;
    try {
      const res = await fetch('https://api.daily.co/v1/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.dailyApiKey}` },
        body: JSON.stringify({ privacy: 'private', properties: { exp, max_participants: maxParticipants, enable_screenshare: true } }),
      });
      if (!res.ok) return null;
      return res.json() as Promise<DailyRoom>;
    } catch {
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

  private slotSelect() {
    return {
      id: true,
      title: true,
      durationMin: true,
      startsAt: true,
      isBooked: true,
      createdAt: true,
    } as const;
  }

}
