import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

const COMMENT_MAX_LEN = 1000;
const VALID_REACTIONS = new Set(['LIKE', 'FIRE', 'MIND_BLOWN']);

@Injectable()
export class SocialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  // ── Follow ───────────────────────────────────────────────────────────────────

  async follow(followerId: string, creatorId: string) {
    if (followerId === creatorId) throw new BadRequestException('Cannot follow yourself');

    const creator = await this.prisma.user.findUnique({
      where: { id: creatorId },
      select: { id: true, name: true, creatorProfile: { select: { displayName: true } } },
    });
    if (!creator) throw new NotFoundException('Creator not found');

    try {
      await this.prisma.follow.create({ data: { followerId, creatorId } });
    } catch {
      throw new ConflictException('Already following');
    }

    // Notify creator (non-blocking)
    void this.notifications.sendPush({
      userId: creatorId,
      title: 'New follower',
      body: 'Someone started following your content',
      category: 'COHORT_ACTIVITY',
      data: { type: 'NEW_FOLLOWER', followerId },
    }).catch(() => undefined);

    return { following: true, creatorId };
  }

  async unfollow(followerId: string, creatorId: string) {
    const deleted = await this.prisma.follow.deleteMany({ where: { followerId, creatorId } });
    if (deleted.count === 0) throw new NotFoundException('Not following this creator');
    return { following: false, creatorId };
  }

  async getFollowStats(creatorId: string) {
    const [followerCount, contentCount] = await Promise.all([
      this.prisma.follow.count({ where: { creatorId } }),
      this.prisma.content.count({ where: { creatorId, status: 'APPROVED' } }),
    ]);
    return { followerCount, contentCount };
  }

  async isFollowing(followerId: string, creatorId: string): Promise<boolean> {
    const row = await this.prisma.follow.findUnique({
      where: { followerId_creatorId: { followerId, creatorId } },
      select: { followerId: true },
    });
    return row !== null;
  }

  // ── Social feed (followed creators' new content) ──────────────────────────────

  async getSocialFeed(userId: string, cursor?: string) {
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { creatorId: true },
    });
    const creatorIds = following.map((f) => f.creatorId);

    if (creatorIds.length === 0) return { items: [], nextCursor: null };

    const items = await this.prisma.content.findMany({
      where: {
        creatorId: { in: creatorIds },
        status: 'APPROVED',
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true, title: true, type: true, thumbnailUrl: true, duration: true,
        viewCount: true, saveCount: true, shareCount: true, createdAt: true,
        trackId: true, moduleId: true,
        creator: {
          select: {
            id: true, name: true, avatarUrl: true,
            creatorProfile: { select: { displayName: true, tier: true } },
          },
        },
        track: { select: { title: true, slug: true, icon: true } },
        _count: { select: { comments: true, reactions: true } },
      },
    });

    const nextCursor = items.length === 20
      ? items[items.length - 1]?.createdAt.toISOString() ?? null
      : null;

    return { items, nextCursor };
  }

  // ── Comments ─────────────────────────────────────────────────────────────────

  async getComments(contentId: string, cursor?: string) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      select: { status: true },
    });
    if (!content || content.status !== 'APPROVED') throw new NotFoundException('Content not found');

    const comments = await this.prisma.contentComment.findMany({
      where: {
        contentId,
        parentId: null,
        isDeleted: false,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true, body: true, createdAt: true, updatedAt: true,
        user: { select: { id: true, name: true, avatarUrl: true, creatorProfile: { select: { displayName: true, tier: true } } } },
        replies: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'asc' },
          take: 10,
          select: {
            id: true, body: true, createdAt: true,
            user: { select: { id: true, name: true, avatarUrl: true, creatorProfile: { select: { displayName: true } } } },
          },
        },
        _count: { select: { replies: true } },
      },
    });

    const nextCursor = comments.length === 20
      ? comments[comments.length - 1]?.createdAt.toISOString() ?? null
      : null;

    return { comments, nextCursor };
  }

  async addComment(userId: string, contentId: string, body: string, parentId?: string) {
    if (!body.trim()) throw new BadRequestException('Comment body is required');
    if (body.length > COMMENT_MAX_LEN) throw new BadRequestException(`Comment max ${COMMENT_MAX_LEN} characters`);

    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      select: { status: true, creatorId: true },
    });
    if (!content || content.status !== 'APPROVED') throw new NotFoundException('Content not found');

    if (parentId) {
      const parent = await this.prisma.contentComment.findUnique({ where: { id: parentId } });
      if (!parent || parent.contentId !== contentId) throw new NotFoundException('Parent comment not found');
      if (parent.parentId) throw new BadRequestException('Cannot reply to a reply');
    }

    const comment = await this.prisma.contentComment.create({
      data: { contentId, userId, body: body.trim(), ...(parentId ? { parentId } : {}) },
      select: {
        id: true, body: true, createdAt: true, parentId: true,
        user: { select: { id: true, name: true, avatarUrl: true, creatorProfile: { select: { displayName: true, tier: true } } } },
      },
    });

    // Notify content creator (not if they commented on their own content)
    if (content.creatorId !== userId) {
      void this.notifications.sendPush({
        userId: content.creatorId,
        title: 'New comment on your content',
        body: body.length > 60 ? `${body.slice(0, 57)}…` : body,
        category: 'COHORT_ACTIVITY',
        data: { type: 'CONTENT_COMMENT', contentId, commentId: comment.id },
      }).catch(() => undefined);
    }

    return comment;
  }

  async deleteComment(userId: string, commentId: string) {
    const comment = await this.prisma.contentComment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId !== userId) throw new ForbiddenException('Not your comment');

    await this.prisma.contentComment.update({
      where: { id: commentId },
      data: { isDeleted: true, body: '[deleted]' },
    });

    return { deleted: commentId };
  }

  // ── Reactions ─────────────────────────────────────────────────────────────────

  async react(userId: string, contentId: string, type: string) {
    if (!VALID_REACTIONS.has(type)) throw new BadRequestException('Invalid reaction type');

    const content = await this.prisma.content.findUnique({
      where: { id: contentId, status: 'APPROVED' },
      select: { id: true },
    });
    if (!content) throw new NotFoundException('Content not found');

    // Upsert reaction (change type if already reacted)
    await this.prisma.contentReaction.upsert({
      where: { userId_contentId: { userId, contentId } },
      create: { userId, contentId, type },
      update: { type },
    });

    const counts = await this.getReactionCounts(contentId);
    return { contentId, userReaction: type, counts };
  }

  async unreact(userId: string, contentId: string) {
    await this.prisma.contentReaction.deleteMany({ where: { userId, contentId } });
    const counts = await this.getReactionCounts(contentId);
    return { contentId, userReaction: null, counts };
  }

  async getReactionCounts(contentId: string) {
    const rows = await this.prisma.contentReaction.groupBy({
      by: ['type'],
      where: { contentId },
      _count: { type: true },
    });
    const result: Record<string, number> = { LIKE: 0, FIRE: 0, MIND_BLOWN: 0 };
    for (const r of rows) result[r.type] = r._count.type;
    return result;
  }

  // ── Leaderboard ────────────────────────────────────────────────────────────────

  async getLeaderboard(trackId?: string, period: 'week' | 'month' | 'all' = 'month') {
    const since =
      period === 'week' ? new Date(Date.now() - 7 * 86400_000)
      : period === 'month' ? new Date(Date.now() - 30 * 86400_000)
      : new Date(0);

    // Count badges issued in period per learner, optionally filtered by track's concepts
    const badges = await this.prisma.skillBadge.groupBy({
      by: ['learnerId'],
      where: {
        issuedAt: { gte: since },
        isRevoked: false,
        ...(trackId ? {
          concept: { module: { trackId } },
        } : {}),
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 50,
    });

    if (badges.length === 0) return [];

    const learnerIds = badges.map((b) => b.learnerId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: learnerIds } },
      select: {
        id: true, name: true, avatarUrl: true,
        learnerProfile: { select: { currentTrackId: true, absorptionStatus: true, streakDays: true } },
      },
    });

    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    return badges.map((b, idx) => ({
      rank: idx + 1,
      learnerId: b.learnerId,
      name: userMap[b.learnerId]?.name ?? 'Unknown',
      avatarUrl: userMap[b.learnerId]?.avatarUrl ?? null,
      badgesEarned: b._count.id,
      streakDays: userMap[b.learnerId]?.learnerProfile?.streakDays ?? 0,
      absorptionStatus: userMap[b.learnerId]?.learnerProfile?.absorptionStatus ?? 'INELIGIBLE',
    }));
  }

  // ── Public creator list (for sitemap) ─────────────────────────────────────────

  async getPublicCreatorList() {
    return this.prisma.creatorProfile.findMany({
      where: { user: { isActive: true } },
      select: {
        displayName: true,
        user: { select: { updatedAt: true } },
      },
      take: 1000,
    }).then((rows) =>
      rows.map((r) => ({
        creatorProfile: { displayName: r.displayName },
        updatedAt: r.user.updatedAt.toISOString(),
      })),
    );
  }

  // ── Public creator profile ─────────────────────────────────────────────────────

  async getPublicCreatorProfile(displayName: string, viewerId?: string) {
    const creator = await this.prisma.user.findFirst({
      where: { creatorProfile: { displayName } },
      select: {
        id: true, name: true, avatarUrl: true,
        creatorProfile: {
          select: {
            displayName: true, bio: true, tier: true,
            isVerified: true, qualityScore: true,
          },
        },
        content: {
          where: { status: 'APPROVED' },
          orderBy: { viewCount: 'desc' },
          take: 12,
          select: {
            id: true, title: true, type: true, thumbnailUrl: true,
            duration: true, viewCount: true, createdAt: true,
            track: { select: { title: true, slug: true, icon: true } },
            _count: { select: { comments: true, reactions: true } },
          },
        },
        _count: { select: { followers: true, following: true } },
      },
    });

    if (!creator) throw new NotFoundException('Creator not found');

    const isFollowing = viewerId
      ? await this.isFollowing(viewerId, creator.id)
      : false;

    return {
      ...creator,
      followerCount: creator._count.followers,
      followingCount: creator._count.following,
      isFollowing,
    };
  }
}
