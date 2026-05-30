import redis.asyncio as aioredis
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from db import get_db
from schemas import HealthResponse

router = APIRouter()

VERSION = "1.0.0"


@router.get("/health", response_model=HealthResponse, tags=["ops"])
async def health(db: AsyncSession = Depends(get_db)) -> HealthResponse:
    # DB check
    db_status = "ok"
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        db_status = "error"

    # Redis check
    redis_status = "ok"
    try:
        r = aioredis.from_url(settings.redis_url, socket_connect_timeout=2)
        await r.ping()
        await r.aclose()
    except Exception:
        redis_status = "error"

    overall = "ok" if db_status == "ok" and redis_status == "ok" else "degraded"

    return HealthResponse(
        status=overall,
        version=VERSION,
        db=db_status,
        redis=redis_status,
    )
