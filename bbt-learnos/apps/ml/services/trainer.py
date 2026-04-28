"""
Offline trainer — loads interaction data from Postgres and refits the recommender.

Called:
  - On startup (if data exists)
  - Via POST /admin/retrain (background task)
"""
from __future__ import annotations

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from services.recommender import get_recommender

log = structlog.get_logger()


async def retrain(db: AsyncSession) -> dict:
    log.info("retrain.start")

    # Interaction signals: assessments + content analytics events
    interactions_result = await db.execute(text("""
        SELECT
            a.learner_id AS "learnerId",
            c.id AS "contentId",
            c.track_id AS "trackId",
            LEAST(
                a.score * 0.8
                + CASE WHEN a.passed THEN 0.2 ELSE 0.0 END,
                1.0
            ) AS score
        FROM assessments a
        JOIN modules m ON m.id = a.module_id
        JOIN content c ON c.module_id = m.id AND c.status = 'APPROVED'
        WHERE a.score IS NOT NULL

        UNION ALL

        SELECT
            sb.learner_id AS "learnerId",
            c.id AS "contentId",
            c.track_id AS "trackId",
            LEAST(sb.score * 0.6, 1.0) AS score
        FROM skill_badges sb
        JOIN content c ON c.concept_id = sb.concept_id AND c.status = 'APPROVED'
        WHERE sb.is_revoked = FALSE
    """))
    interactions = [
        {
            "learnerId": r[0],
            "contentId": r[1],
            "trackId": r[2],
            "score": float(r[3]),
        }
        for r in interactions_result.fetchall()
    ]

    # Content metadata
    items_result = await db.execute(text("""
        SELECT id, title, type, track_id, module_id, concept_id,
               mux_playback_id, thumbnail_url, duration
        FROM content
        WHERE status = 'APPROVED'
    """))
    items_meta = [
        {
            "id": r[0],
            "title": r[1],
            "type": r[2],
            "trackId": r[3],
            "trackId": r[3],
            "moduleId": r[4],
            "conceptId": r[5],
            "muxPlaybackId": r[6],
            "thumbnailUrl": r[7],
            "duration": r[8],
        }
        for r in items_result.fetchall()
    ]

    get_recommender().fit(interactions, items_meta)

    log.info("retrain.done", interactions=len(interactions), items=len(items_meta))
    return {
        "status": "ok",
        "interactions": len(interactions),
        "items": len(items_meta),
    }
