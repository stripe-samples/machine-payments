import hashlib
import hmac
import os
from typing import Any, cast

import stripe
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from mpp import Credential, Receipt
from mpp.methods.tempo import (
    ChargeIntent,
    tempo,
)
from mpp.server import Mpp  # pyright: ignore[reportPrivateImportUsage]

load_dotenv()

# Don't put any keys in code. Use an environment variable (as shown
# here) or secrets vault to supply keys to your integration.
#
# See https://docs.stripe.com/keys-best-practices and find your
# keys at https://dashboard.stripe.com/apikeys.
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
if not STRIPE_SECRET_KEY:
    raise ValueError("STRIPE_SECRET_KEY environment variable is required")

TEMPO_DEPOSIT_ADDRESS = os.getenv("TEMPO_DEPOSIT_ADDRESS")
if not TEMPO_DEPOSIT_ADDRESS:
    raise ValueError(
        "TEMPO_DEPOSIT_ADDRESS environment variable is required.\n"
        "Create one with: stripe post /v1/crypto/deposit_addresses "
        "--live --stripe-version 2026-05-27.preview -d network=tempo"
    )

stripe.api_key = STRIPE_SECRET_KEY
stripe.api_version = "2026-05-27.preview"
stripe.set_app_info(
    "stripe-samples/machine-payments",
    url="https://github.com/stripe-samples/machine-payments",
    version="1.0.0",
)

# USDC on Tempo (mainnet)
TEMPO_USDC = "0x20c000000000000000000000b9537d11c60e8b50"

# Secret used to secure payment challenges.
# https://mpp.dev/protocol/challenges#challenge-binding
mpp_secret_key = hmac.new(
    STRIPE_SECRET_KEY.encode(),
    b"mpp-challenge-signing",
    hashlib.sha256,
).hexdigest()

PRICE_USD = "0.01"

server = Mpp.create(
    method=tempo(
        intents={"charge": ChargeIntent()},
        currency=TEMPO_USDC,
        recipient=TEMPO_DEPOSIT_ADDRESS,
        decimals=2,
    ),
    secret_key=mpp_secret_key,
)

app = FastAPI(title="MPP REST API")


@app.get("/paid")
@server.pay(amount=PRICE_USD)
async def get_paid(request: Request, credential: Credential, receipt: Receipt):
    tx_hash = receipt.reference
    if tx_hash:
        amount_in_cents = max(1, round(float(PRICE_USD) * 100))
        stripe.PaymentIntent.create(
            amount=amount_in_cents,
            currency="usd",
            confirm=True,
            payment_method_data=cast(Any, {"type": "crypto"}),
            payment_method_types=["crypto"],
            payment_method_options=cast(
                Any,
                {
                    "crypto": {
                        "mode": "transaction_verification",
                        "transaction_verification_options": {
                            "network": "tempo",
                            "transaction_hash": tx_hash,
                        },
                    }
                },
            ),
            idempotency_key=tx_hash,
        )
        print(f"Stripe PI created: {amount_in_cents}¢ on tempo for tx {tx_hash}")

    return JSONResponse(content={"foo": "bar"})


if __name__ == "__main__":
    print("Server listening at http://localhost:4242")
    uvicorn.run(app, host="0.0.0.0", port=4242)
