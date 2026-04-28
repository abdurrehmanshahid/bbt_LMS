import json
from datetime import datetime, timezone

import redis.asyncio as aioredis
from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from db import get_db
from schemas import FeedRequest, FeedResponse
from services.feed_composer import compose_feed

router = APIRouter(prefix="/feed", tags=["feed"])


def _cache_key(req: FeedRequest) -> str:
    viewed_hash = hash(frozenset(req.viewedContentIds))
    return f"ml:feed:{req.learnerId}:{req.trackId}:{viewed_hash}"


@router.post("", response_model=FeedResponse)
async def get_feed(
    req: FeedRequest,
    db: AsyncSession = Depends(get_db),
) -> FeedResponse:
    cache_key = _cache_key(req)

    # Try cache
    try:
        r = aioredis.from_url(settings.redis_url)
        cached = await r.get(cache_key)
        await r.aclose()
        if cached:
            return FeedResponse.model_validate_json(cached)
    except Exception:
        pass

    feed = await compose_feed(
        learner_id=req.learnerId,
        track_id=req.trackId,
        current_module_id=req.currentModuleId,
        viewed_ids=set(req.viewedContentIds),
        limit=req.limit,
        db=db,
    )

    # Cache result
    try:
        r = aioredis.from_url(settings.redis_url)
        await r.setex(cache_key, settings.feed_cache_ttl, feed.model_dump_json())
        await r.aclose()
    except Exception:
        pass

    return feed
