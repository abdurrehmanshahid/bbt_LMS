"""Validate that schema models parse and serialise correctly."""
import pytest
from schemas import ContentItem, FeedBucket, FeedRequest, FeedResponse, RecommendRequest


def test_content_item_score_clamped():
    item = ContentItem(
        id="x", title="T", type="LECTURE", trackId="t1",
        bucket=FeedBucket.PROGRESSION, score=0.75,
    )
    assert item.score == 0.75


def test_feed_request_defaults():
    req = FeedRequest(learnerId="u1", trackId="t1")
    assert req.limit == 20
    assert req.viewedContentIds == []


def test_feed_request_limit_bounds():
    with pytest.raises(Exception):
        FeedRequest(learnerId="u1", trackId="t1", limit=0)
    with pytest.raises(Exception):
        FeedRequest(learnerId="u1", trackId="t1", limit=51)


def test_recommend_request_defaults():
    req = RecommendRequest(learnerId="u1", trackId="t1")
    assert req.limit == 10
    assert req.conceptId is None
