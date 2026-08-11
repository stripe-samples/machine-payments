import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient


@pytest.fixture(autouse=True)
def _set_env(monkeypatch):
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test_fake")
    monkeypatch.setenv("TEMPO_DEPOSIT_ADDRESS", "0xtest_deposit_address")


def test_app_is_fastapi():
    from main import app

    assert isinstance(app, FastAPI)


@pytest.mark.asyncio
async def test_get_paid_returns_402_without_payment():
    from main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/paid")

    assert response.status_code == 402
