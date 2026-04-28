from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from services.trainer import retrain

router = APIRouter(prefix="/admin", tags=["admin"])

# Simple shared-secret guard for internal calls from NestJS
_INTERNAL_SECRET = None  # loaded from env in main.py


def _check_secret(x_internal_secret: str = Header(default="")) -> None:
    if _INTERNAL_SECRET and x_internal_secret != _INTERNAL_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")


@router.post("/retrain", dependencies=[Depends(_check_secret)])
async def trigger_retrain(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Trigger async model retraining. Returns immediately; retrain runs in background."""
    background_tasks.add_task(retrain, db)
    return {"status": "retrain_queued"}


@router.post("/retrain/sync", dependencies=[Depends(_check_secret)])
async def trigger_retrain_sync(db: AsyncSession = Depends(get_db)) -> dict:
    """Synchronous retrain — blocks until complete. Use for testing only."""
    return await retrain(db)
