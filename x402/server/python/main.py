import os
import sys
from typing import Any, cast

import stripe
import uvicorn
from cdp.auth import GetAuthHeadersOptions, get_auth_headers
from dotenv import load_dotenv
from fastapi import FastAPI
from x402.http import FacilitatorConfig, HTTPFacilitatorClient, PaymentOption
from x402.http.facilitator_client_base import AuthHeaders
from x402.http.middleware.fastapi import PaymentMiddlewareASGI
from x402.http.types import RouteConfig
from x402.mechanisms.evm.exact import ExactEvmServerScheme
from x402.server import x402ResourceServer

load_dotenv()

# Don't put any keys in code. Use an environment variable (as shown
# here) or secrets vault to supply keys to your integration.
#
# See https://docs.stripe.com/keys-best-practices and find your
# keys at https://dashboard.stripe.com/apikeys.
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
if not STRIPE_SECRET_KEY:
    print("STRIPE_SECRET_KEY environment variable is required", file=sys.stderr)
    raise SystemExit(1)

TEMPO_DEPOSIT_ADDRESS = os.getenv("TEMPO_DEPOSIT_ADDRESS")
if not TEMPO_DEPOSIT_ADDRESS:
    print("TEMPO_DEPOSIT_ADDRESS environment variable is required", file=sys.stderr)
    print(
        "Create one with: stripe post /v1/crypto/deposit_addresses"
        " --live --stripe-version 2026-05-27.preview -d network=base",
        file=sys.stderr,
    )
    raise SystemExit(1)

CDP_API_KEY_ID = os.getenv("CDP_API_KEY_ID")
CDP_API_KEY_SECRET = os.getenv("CDP_API_KEY_SECRET")
if not CDP_API_KEY_ID or not CDP_API_KEY_SECRET:
    print(
        "CDP_API_KEY_ID and CDP_API_KEY_SECRET environment variables are required",
        file=sys.stderr,
    )
    raise SystemExit(1)

# Stripe deposit address created via the Stripe CLI:
# stripe post /v1/crypto/deposit_addresses --live \
#   --stripe-version 2026-05-27.preview -d network=base
TEMPO_DEPOSIT_ADDRESS = TEMPO_DEPOSIT_ADDRESS.lower()

stripe.api_key = STRIPE_SECRET_KEY
stripe.api_version = "2026-05-27.preview"  # type: ignore[assignment]
stripe.set_app_info(
    "stripe-samples/machine-payments",
    url="https://github.com/stripe-samples/machine-payments",
    version="1.0.0",
)

# The Coinbase Developer Platform (CDP) facilitator verifies and settles
# x402 payments on-chain.
# See: https://docs.cdp.coinbase.com/x402/quickstart-for-sellers
CDP_FACILITATOR_URL = "https://api.cdp.coinbase.com/platform/v2/x402"
CDP_FACILITATOR_HOST = "api.cdp.coinbase.com"
CDP_FACILITATOR_PATH = "/platform/v2/x402"


class CdpAuthProvider:
    """Generates CDP JWT auth headers for the x402 facilitator."""

    def get_auth_headers(self) -> AuthHeaders:
        verify_headers = get_auth_headers(
            GetAuthHeadersOptions(  # type: ignore[call-arg]
                api_key_id=CDP_API_KEY_ID,
                api_key_secret=CDP_API_KEY_SECRET,
                request_method="POST",
                request_host=CDP_FACILITATOR_HOST,
                request_path=f"{CDP_FACILITATOR_PATH}/verify",
            )
        )
        settle_headers = get_auth_headers(
            GetAuthHeadersOptions(  # type: ignore[call-arg]
                api_key_id=CDP_API_KEY_ID,
                api_key_secret=CDP_API_KEY_SECRET,
                request_method="POST",
                request_host=CDP_FACILITATOR_HOST,
                request_path=f"{CDP_FACILITATOR_PATH}/settle",
            )
        )
        supported_headers = get_auth_headers(
            GetAuthHeadersOptions(  # type: ignore[call-arg]
                api_key_id=CDP_API_KEY_ID,
                api_key_secret=CDP_API_KEY_SECRET,
                request_method="GET",
                request_host=CDP_FACILITATOR_HOST,
                request_path=f"{CDP_FACILITATOR_PATH}/supported",
            )
        )
        return AuthHeaders(
            verify=verify_headers,
            settle=settle_headers,
            supported=supported_headers,
        )


facilitator = HTTPFacilitatorClient(
    FacilitatorConfig(
        url=CDP_FACILITATOR_URL,
        auth_provider=CdpAuthProvider(),
    )
)

server = x402ResourceServer(facilitator)
server.register("eip155:8453", ExactEvmServerScheme())  # type: ignore[arg-type]


# Record settled on-chain payments as Stripe PaymentIntents
# using transaction_verification mode.
SUPPORTED_METHODS = ["evm/charge"]


async def record_payment(context) -> None:
    result = context.result
    requirements = context.requirements

    tx_hash = result.transaction
    if not tx_hash or not result.success:
        return

    # requirements.amount is in atomic USDC units (6 decimals).
    # $0.01 = 10000 atomic units. Convert to cents for Stripe.
    amount_in_cents = round(int(requirements.amount) / 10000)
    if amount_in_cents < 1:
        return

    pi = stripe.PaymentIntent.create(
        amount=amount_in_cents,
        currency="usd",
        confirm=True,
        payment_method_data={"type": "crypto"},
        payment_method_types=["crypto"],
        payment_method_options=cast(
            Any,
            {
                "crypto": {
                    "mode": "transaction_verification",
                    "transaction_verification_options": {
                        "network": "base",
                        "transaction_hash": tx_hash,
                    },
                }
            },
        ),
        idempotency_key=tx_hash,
    )

    print(f"Stripe PI {pi.id}: {amount_in_cents}¢ on base for tx {tx_hash}")


server.on_after_settle(record_payment)

routes = {
    "GET /paid": RouteConfig(
        accepts=[
            PaymentOption(
                scheme="exact",
                price="$0.01",
                network="eip155:8453",
                pay_to=TEMPO_DEPOSIT_ADDRESS,
            )
        ],
        description="Data retrieval endpoint",
        mime_type="application/json",
    )
}

app = FastAPI(title="x402 REST API")

app.add_middleware(PaymentMiddlewareASGI, routes=routes, server=server)


@app.get("/paid")
async def get_paid():
    return {"foo": "bar"}


if __name__ == "__main__":
    print("Server listening at http://localhost:4242")
    uvicorn.run(app, host="0.0.0.0", port=4242)
