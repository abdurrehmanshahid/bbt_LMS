from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


class FeedBucket(str, Enum):
    PROGRESSION = "progression"
    REINFORCEMENT = "reinforcement"
    DISCOVERY = "discovery"
    SOCIAL = "social"


class ContentItem(BaseModel):
    id: str
    title: str
    type: str
    trackId: str
    moduleId: str | None = None
    conceptId: str | None = None
    muxPlaybackId: str | None = None
    thumbnailUrl: str | None = None
    duration: int | None = None
    bucket: FeedBucket
    score: float = Field(ge=0.0, le=1.0)


class FeedRequest(BaseModel):
    learnerId: str
    trackId: str
    currentModuleId: str | None = None
    viewedContentIds: list[str] = Field(default_factory=list)
    limit: int = Field(default=20, ge=1, le=50)


class FeedResponse(BaseModel):
    learnerId: str
    items: list[ContentItem]
    isColdStart: bool
    generatedAt: str


class RecommendRequest(BaseModel):
    learnerId: str
    trackId: str
    conceptId: str | None = None
    limit: int = Field(default=10, ge=1, le=50)


class RecommendResponse(BaseModel):
    learnerId: str
    items: list[ContentItem]


class SimilarContentResponse(BaseModel):
    contentId: str
    similar: list[ContentItem]


class HealthResponse(BaseModel):
    status: str
    version: str
    db: str
    redis: str
