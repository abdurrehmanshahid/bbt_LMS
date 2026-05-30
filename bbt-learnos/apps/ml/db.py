from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from config import settings

engine = create_async_engine(settings.database_url, pool_pre_ping=True, pool_size=5)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_db() -> AsyncSession:  # type: ignore[override]
    async with AsyncSessionLocal() as session:
        yield session
