"""
Feed composer — assembles the 40/30/20/10 feed for a learner.

Bucket definitions:
  40% PROGRESSION   — next unwatched content in current module (by order)
  30% REINFORCEMENT — other explanations of already-covered concepts in same track
  20% DISCOVERY     — CF recommendations in same track not yet viewed
  10% SOCIAL        — cohort activity / creator announcements (stub: empty list)

Cold-start (<20 engagement signals): 100% PROGRESSION content, no CF.
"""
from __future__ import annotations

import math
from datetime import UTC, datetime

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from schemas import ContentItem, FeedBucket, FeedResponse
from services.recommender import get_recommender


async def compose_feed(
    learner_id: str,
    track_id: str,
    current_module_id: str | None,
    viewed_ids: set[str],
    limit: int,
    db: AsyncSession,
) -> FeedResponse:
    signal_count = await _count_signals(learner_id, db)
    is_cold = signal_count < settings.cold_start_threshold

    n_prog = math.ceil(limit * settings.feed_progression_pct)
    n_rein = math.ceil(limit * settings.feed_reinforcement_pct) if not is_cold else 0
    n_disc = math.ceil(limit * settings.feed_discovery_pct) if not is_cold else 0

    progression = await _progression(learner_id, track_id, current_module_id, viewed_ids, n_prog, db)
    reinforcement = await _reinforcement(learner_id, track_id, viewed_ids, n_rein, db) if not is_cold else []
    discovery = get_recommender().predict(learner_id, track_id, viewed_ids, n_disc) if not is_cold else []

    # Fill gaps if buckets are smaller than target
    all_items = progression + reinforcement + discovery
    if len(all_items) < limit and not is_cold:
        extra = await _popularity(track_id, {i.id for i in all_items} | viewed_ids, limit - len(all_items), db)
        all_items += extra

    return FeedResponse(
        learnerId=learner_id,
        items=all_items[:limit],
        isColdStart=is_cold,
        generatedAt=datetime.now(UTC).isoformat(),
    )


async def _count_signals(learner_id: str, db: AsyncSession) -> int:
    result = await db.execute(
        text("""
            SELECT COUNT(*) FROM assessments WHERE learner_id = :lid
        """),
        {"lid": learner_id},
    )
    row = result.fetchone()
    return int(row[0]) if row else 0


async def _progression(
    learner_id: str,
    track_id: str,
    module_id: str | None,
    viewed_ids: set[str],
    limit: int,
    db: AsyncSession,
) -> list[ContentItem]:
    if limit <= 0:
        return []

    query = text("""
        SELECT c.id, c.title, c.type, c.track_id, c.module_id, c.concept_id,
               c.mux_playback_id, c.thumbnail_url, c.duration,
               (c.view_count + 1.0) / NULLIF(c.view_count + c.save_count + 1, 0) AS pop_score
        FROM content c
        JOIN modules m ON m.id = c.module_id
        WHERE c.track_id = :tid
          AND c.status = 'APPROVED'
          AND c.id != ALL(:excl)
          AND (:mid IS NULL OR m.order >= (
                SELECT COALESCE(MIN(m2.order), 0)
                FROM modules m2
                WHERE m2.id = :mid
              ))
        ORDER BY m.order ASC, c.created_at ASC
        LIMIT :lim
    """)
    rows = (await db.execute(query, {
        "tid": track_id,
        "excl": list(viewed_ids) or [""],
        "mid": module_id,
        "lim": limit,
    })).fetchall()

    return [_row_to_item(r, FeedBucket.PROGRESSION) for r in rows]


async def _reinforcement(
    learner_id: str,
    track_id: str,
    viewed_ids: set[str],
    limit: int,
    db: AsyncSession,
) -> list[ContentItem]:
    if limit <= 0:
        return []

    # Find concepts the learner has been assessed on
    result = await db.execute(
        text("""
            SELECT DISTINCT m.id AS module_id
            FROM assessments a
            JOIN modules m ON m.id = a.module_id
            JOIN tracks t ON t.id = m.track_id
            WHERE a.learner_id = :lid AND t.id = :tid AND a.passed = TRUE
        """),
        {"lid": learner_id, "tid": track_id},
    )
    module_ids = [r[0] for r in result.fetchall()]
    if not module_ids:
        return []

    rows = (await db.execute(text("""
        SELECT c.id, c.title, c.type, c.track_id, c.module_id, c.concept_id,
               c.mux_playback_id, c.thumbnail_url, c.duration,
               c.save_count::float / NULLIF(c.view_count, 0) AS pop_score
        FROM content c
        WHERE c.track_id = :tid
          AND c.module_id = ANY(:mids)
          AND c.status = 'APPROVED'
          AND c.id != ALL(:excl)
        ORDER BY c.view_count DESC
        LIMIT :lim
    """), {
        "tid": track_id,
        "mids": module_ids,
        "excl": list(viewed_ids) or [""],
        "lim": limit,
    })).fetchall()

    return [_row_to_item(r, FeedBucket.REINFORCEMENT) for r in rows]


async def _popularity(
    track_id: str,
    excluded_ids: set[str],
    limit: int,
    db: AsyncSession,
) -> list[ContentItem]:
    if limit <= 0:
        return []

    rows = (await db.execute(text("""
        SELECT c.id, c.title, c.type, c.track_id, c.module_id, c.concept_id,
               c.mux_playback_id, c.thumbnail_url, c.duration,
               (c.view_count * 0.5 + c.save_count * 1.0 + c.share_count * 0.3) AS pop_score
        FROM content c
        WHERE c.track_id = :tid
          AND c.status = 'APPROVED'
          AND c.id != ALL(:excl)
        ORDER BY pop_score DESC
        LIMIT :lim
    """), {
        "tid": track_id,
        "excl": list(excluded_ids) or [""],
        "lim": limit,
    })).fetchall()

    return [_row_to_item(r, FeedBucket.DISCOVERY) for r in rows]


def _row_to_item(row: object, bucket: FeedBucket) -> ContentItem:
    r = row._mapping  # type: ignore[attr-defined]
    raw_score = float(r.get("pop_score") or 0.0)
    return ContentItem(
        id=r["id"],
        title=r["title"],
        type=r["type"],
        trackId=r["track_id"],
        moduleId=r.get("module_id"),
        conceptId=r.get("concept_id"),
        muxPlaybackId=r.get("mux_playback_id"),
        thumbnailUrl=r.get("thumbnail_url"),
        duration=r.get("duration"),
        bucket=bucket,
        score=min(max(raw_score, 0.0), 1.0),
    )
