import pytest
from fastapi import FastAPI


@pytest.fixture(autouse=True)
def _set_env(monkeypatch):
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test_fake")
    monkeypatch.setenv(
        "TEMPO_DEPOSIT_ADDRESS",
        "0x1234567890abcdef1234567890abcdef12345678",
    )
    monkeypatch.setenv("CDP_API_KEY_ID", "fake_key_id")
    monkeypatch.setenv("CDP_API_KEY_SECRET", "fake_key_secret")


def test_app_is_fastapi():
    from main import app

    assert isinstance(app, FastAPI)


def test_app_has_paid_route():
    from main import app

    routes = [getattr(r, "path", None) for r in app.routes]
    assert "/paid" in routes
