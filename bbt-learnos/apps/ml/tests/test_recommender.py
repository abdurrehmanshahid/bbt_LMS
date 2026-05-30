"""Unit tests for the CF recommender (no DB required)."""
from schemas import FeedBucket
from services.recommender import CollaborativeRecommender

ITEMS = [
    {"id": "c1", "title": "Intro to Python", "type": "LECTURE", "trackId": "t1", "moduleId": "m1"},
    {"id": "c2", "title": "Python OOP", "type": "LECTURE", "trackId": "t1", "moduleId": "m1"},
    {"id": "c3", "title": "Django basics", "type": "REEL", "trackId": "t1", "moduleId": "m2"},
    {"id": "c4", "title": "SQL fundamentals", "type": "LECTURE", "trackId": "t2", "moduleId": "m3"},
]

INTERACTIONS = [
    {"learnerId": "u1", "contentId": "c1", "trackId": "t1", "score": 0.9},
    {"learnerId": "u1", "contentId": "c2", "trackId": "t1", "score": 0.7},
    {"learnerId": "u2", "contentId": "c1", "trackId": "t1", "score": 0.8},
    {"learnerId": "u2", "contentId": "c3", "trackId": "t1", "score": 0.6},
    {"learnerId": "u3", "contentId": "c2", "trackId": "t1", "score": 0.5},
    {"learnerId": "u3", "contentId": "c3", "trackId": "t1", "score": 0.9},
]


def make_fitted_recommender() -> CollaborativeRecommender:
    r = CollaborativeRecommender()
    r.fit(INTERACTIONS, ITEMS)
    return r


class TestCollaborativeRecommender:
    def test_fit_marks_fitted(self):
        r = make_fitted_recommender()
        assert r._fitted is True

    def test_fit_empty_does_not_crash(self):
        r = CollaborativeRecommender()
        r.fit([], [])
        assert r._fitted is False

    def test_predict_returns_items_for_known_user(self):
        r = make_fitted_recommender()
        items = r.predict("u1", "t1", set(), limit=5)
        assert isinstance(items, list)
        # All returned items must be from track t1
        for item in items:
            assert item.trackId == "t1"

    def test_predict_excludes_viewed(self):
        r = make_fitted_recommender()
        items = r.predict("u1", "t1", {"c1", "c2", "c3"}, limit=5)
        ids = {i.id for i in items}
        assert "c1" not in ids
        assert "c2" not in ids

    def test_predict_unknown_user_returns_empty(self):
        r = make_fitted_recommender()
        items = r.predict("unknown-user", "t1", set(), limit=5)
        assert items == []

    def test_predict_cross_track_filtered(self):
        r = make_fitted_recommender()
        items = r.predict("u2", "t1", set(), limit=10)
        for item in items:
            assert item.trackId == "t1", "Cross-track content must be excluded"

    def test_scores_in_range(self):
        r = make_fitted_recommender()
        items = r.predict("u3", "t1", set(), limit=10)
        for item in items:
            assert 0.0 <= item.score <= 1.0

    def test_similar_returns_different_content(self):
        r = make_fitted_recommender()
        items = r.similar("c1", "t1", limit=5)
        ids = {i.id for i in items}
        assert "c1" not in ids

    def test_similar_unknown_content_returns_empty(self):
        r = make_fitted_recommender()
        items = r.similar("unknown-content", "t1", limit=5)
        assert items == []

    def test_bucket_set_to_discovery(self):
        r = make_fitted_recommender()
        items = r.predict("u1", "t1", set(), limit=5)
        for item in items:
            assert item.bucket == FeedBucket.DISCOVERY
