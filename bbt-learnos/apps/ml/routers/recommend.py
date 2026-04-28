from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from schemas import RecommendRequest, RecommendResponse, SimilarContentResponse
from services.recommender import get_recommender
from services.feed_composer import _popularity

router = APIRouter(prefix="/recommend", tags=["recommend"])


@router.post("", response_model=RecommendResponse)
async def recommend(
    req: RecommendRequest,
    db: AsyncSession = Depends(get_db),
) -> RecommendResponse:
    items = get_recommender().predict(
        learner_id=req.learnerId,
        track_id=req.trackId,
        excluded_ids=set(),
        limit=req.limit,
    )

    # Fall back to popularity if CF has no prediction
    if not items:
        items = await _popularity(req.trackId, set(), req.limit, db)

    return RecommendResponse(learnerId=req.learnerId, items=items)


@router.get("/{content_id}/similar", response_model=SimilarContentResponse)
async def similar(
    content_id: str,
    track_id: str = Query(..., alias="trackId"),
    limit: int = Query(default=10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
) -> SimilarContentResponse:
    items = get_recommender().similar(
        content_id=content_id,
        track_id=track_id,
        limit=limit,
    )

    if not items:
        items = await _popularity(track_id, {content_id}, limit, db)

    return SimilarContentResponse(contentId=content_id, similar=items)
