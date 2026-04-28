"""
Collaborative filtering recommender.

Signal matrix:
  rows    = learners
  columns = content items
  values  = implicit feedback score (0–1):
              0.3 × (viewed) + 0.5 × (saved) + 0.2 × (shared)
              + 0.8 × (assessment passed on linked concept)
              + badge_score × 0.4 (if badge issued for content's concept)

For cold-start learners (< cold_start_threshold signals):
  fall back to popularity-ranked content in their track.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone

import numpy as np
from scipy.sparse import csr_matrix
from scipy.sparse.linalg import svds

from config import settings
from schemas import ContentItem, FeedBucket


class CollaborativeRecommender:
    """Thin SVD-based CF recommender operating on sparse implicit feedback."""

    def __init__(self) -> None:
        self._user_idx: dict[str, int] = {}
        self._item_idx: dict[str, int] = {}
        self._items_meta: dict[str, dict] = {}
        self._U: np.ndarray | None = None
        self._sigma: np.ndarray | None = None
        self._Vt: np.ndarray | None = None
        self._fitted = False

    def fit(
        self,
        interactions: list[dict],  # [{learnerId, contentId, score, trackId, …}]
        items_meta: list[dict],     # [{id, title, type, trackId, moduleId, …}]
    ) -> None:
        if not interactions or not items_meta:
            return

        self._items_meta = {m["id"]: m for m in items_meta}
        learners = sorted({r["learnerId"] for r in interactions})
        items = sorted({r["contentId"] for r in interactions})
        self._user_idx = {u: i for i, u in enumerate(learners)}
        self._item_idx = {it: i for i, it in enumerate(items)}

        rows, cols, data = [], [], []
        for r in interactions:
            u = self._user_idx.get(r["learnerId"])
            it = self._item_idx.get(r["contentId"])
            if u is not None and it is not None:
                rows.append(u)
                cols.append(it)
                data.append(float(r["score"]))

        mat = csr_matrix(
            (data, (rows, cols)),
            shape=(len(learners), len(items)),
            dtype=np.float32,
        )

        k = min(50, min(mat.shape) - 1)
        if k < 1:
            return

        self._U, self._sigma, self._Vt = svds(mat, k=k)
        self._fitted = True

    def predict(
        self,
        learner_id: str,
        track_id: str,
        excluded_ids: set[str],
        limit: int,
    ) -> list[ContentItem]:
        if not self._fitted or learner_id not in self._user_idx:
            return []

        u_idx = self._user_idx[learner_id]
        scores = self._U[u_idx] @ np.diag(self._sigma) @ self._Vt

        # Map index → (content_id, score)
        idx_to_item = {v: k for k, v in self._item_idx.items()}
        ranked = sorted(
            ((idx_to_item[i], float(scores[i])) for i in range(len(scores))),
            key=lambda x: x[1],
            reverse=True,
        )

        results: list[ContentItem] = []
        for content_id, score in ranked:
            if content_id in excluded_ids:
                continue
            meta = self._items_meta.get(content_id, {})
            if meta.get("trackId") != track_id:
                continue
            results.append(
                ContentItem(
                    id=content_id,
                    title=meta.get("title", ""),
                    type=meta.get("type", "LECTURE"),
                    trackId=track_id,
                    moduleId=meta.get("moduleId"),
                    conceptId=meta.get("conceptId"),
                    muxPlaybackId=meta.get("muxPlaybackId"),
                    thumbnailUrl=meta.get("thumbnailUrl"),
                    duration=meta.get("duration"),
                    bucket=FeedBucket.DISCOVERY,
                    score=min(max(score, 0.0), 1.0),
                )
            )
            if len(results) >= limit:
                break

        return results

    def similar(
        self,
        content_id: str,
        track_id: str,
        limit: int,
    ) -> list[ContentItem]:
        if not self._fitted or content_id not in self._item_idx:
            return []

        it_idx = self._item_idx[content_id]
        item_vec = self._Vt[:, it_idx]
        sims = self._Vt.T @ item_vec  # cosine via dot on normalised Vt

        idx_to_item = {v: k for k, v in self._item_idx.items()}
        ranked = sorted(
            ((idx_to_item[i], float(sims[i])) for i in range(len(sims))),
            key=lambda x: x[1],
            reverse=True,
        )

        results: list[ContentItem] = []
        for cid, score in ranked:
            if cid == content_id:
                continue
            meta = self._items_meta.get(cid, {})
            if meta.get("trackId") != track_id:
                continue
            results.append(
                ContentItem(
                    id=cid,
                    title=meta.get("title", ""),
                    type=meta.get("type", "LECTURE"),
                    trackId=track_id,
                    moduleId=meta.get("moduleId"),
                    conceptId=meta.get("conceptId"),
                    muxPlaybackId=meta.get("muxPlaybackId"),
                    thumbnailUrl=meta.get("thumbnailUrl"),
                    duration=meta.get("duration"),
                    bucket=FeedBucket.DISCOVERY,
                    score=min(max(score, 0.0), 1.0),
                )
            )
            if len(results) >= limit:
                break

        return results


# Module-level singleton — rebuilt on /admin/retrain
_recommender = CollaborativeRecommender()


def get_recommender() -> CollaborativeRecommender:
    return _recommender
