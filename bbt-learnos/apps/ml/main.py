import os
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

import routers.admin as admin_router
from db import AsyncSessionLocal
from routers import admin, feed, health, recommend
from services.trainer import retrain

log = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warm up recommender on startup
    log.info("startup.retrain_begin")
    try:
        async with AsyncSessionLocal() as db:
            result = await retrain(db)
            log.info("startup.retrain_done", **result)
    except Exception as exc:
        log.warning("startup.retrain_failed", error=str(exc))

    # Set internal secret for admin routes
    admin_router._INTERNAL_SECRET = os.getenv("ML_INTERNAL_SECRET", "")

    yield
    log.info("shutdown")


app = FastAPI(
    title="BBT LearnOS ML Service",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("API_ORIGIN", "http://localhost:4000")],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

Instrumentator().instrument(app).expose(app, endpoint="/metrics")

app.include_router(health.router)
app.include_router(feed.router)
app.include_router(recommend.router)
app.include_router(admin.router)


@app.get("/", include_in_schema=False)
async def root() -> dict:
    return {"service": "bbt-ml", "version": "1.0.0"}
