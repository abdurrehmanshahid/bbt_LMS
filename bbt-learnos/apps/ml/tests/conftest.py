import os
import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))


@pytest.fixture
def client():
    # Patch DB and Redis so tests don't need real services
    with patch("db.get_db") as mock_db, \
         patch("routers.health.aioredis") as mock_redis:

        mock_session = AsyncMock()
        mock_session.execute = AsyncMock(return_value=MagicMock(fetchone=lambda: (0,), fetchall=lambda: []))
        mock_db.return_value = mock_session

        mock_redis.from_url.return_value.__aenter__ = AsyncMock(return_value=MagicMock(ping=AsyncMock(), aclose=AsyncMock()))
        mock_redis.from_url.return_value.__aexit__ = AsyncMock(return_value=False)

        from main import app
        with TestClient(app, raise_server_exceptions=False) as c:
            yield c
