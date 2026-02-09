import base64
import json
import os
from typing import Any

import stripe
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI
from x402.http import FacilitatorConfig, HTTPFacilitatorClient, PaymentOption
from x402.http.middleware.fastapi import PaymentMiddlewareASGI
from x402.http.types import RouteConfig
from x402.mechanisms.evm.exact import ExactEvmServerScheme
from x402.server import x402ResourceServer

load_dotenv()

# Stripe handles payment processing and provides the crypto deposit address.
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
if not STRIPE_SECRET_KEY:
    raise ValueError("STRIPE_SECRET_KEY environment variable is required")

stripe.api_key = STRIPE_SECRET_KEY
stripe.set_app_info(
    "stripe-samples/machine-payments",
    url="https://github.com/stripe-samples/machine-payments",
    version="1.0.0",
)

# The facilitator verifies payment proofs and settles transactions on-chain.
# In this example, we use the x402.org testnet facilitator.
FACILITATOR_URL = os.getenv("FACILITATOR_URL", "https://x402.org/facilitator")
facilitator = HTTPFacilitatorClient(FacilitatorConfig(url=FACILITATOR_URL))

# Set up resource server and register the payment scheme handler for Base Sepolia
server = x402ResourceServer(facilitator)
server.register("eip155:84532", ExactEvmServerScheme())


async def create_pay_to_address(context: Any) -> str | None:
    """
    This function determines where payments should be sent. It either:
    1. Extracts the address from an existing payment header (for retry/verification), or
    2. Creates a new Stripe PaymentIntent to generate a fresh deposit address.
    """
    # If a payment header exists, extract the destination address from it
    payment_header = getattr(context, "payment_header", None) or getattr(
        context, "paymentHeader", None
    )
    if payment_header:
        try:
            decoded = json.loads(base64.b64decode(payment_header).decode())
            to_address = decoded.get("payload", {}).get("authorization", {}).get("to")

            if to_address and isinstance(to_address, str):
                return to_address.lower()
        except (json.JSONDecodeError, base64.binascii.Error):
            pass

        return None

    # Create a new PaymentIntent to get a fresh crypto deposit address
    decimals = 6  # USDC has 6 decimals
    amount_in_cents = int(10000 / (10 ** (decimals - 2)))

    payment_intent = stripe.PaymentIntent.create(
        amount=amount_in_cents,
        currency="usd",
        payment_method_types=["crypto"],
        payment_method_data={"type": "crypto"},
        payment_method_options={"crypto": {"mode": "custom"}},
        confirm=True,
    )

    next_action = payment_intent.get("next_action", {})
    deposit_details = next_action.get("crypto_collect_deposit_details", {})

    if not deposit_details:
        raise ValueError("PaymentIntent did not return expected crypto deposit details")

    # Extract the Base network deposit address from the PaymentIntent
    deposit_addresses = deposit_details.get("deposit_addresses", {})
    base_address = deposit_addresses.get("base", {})
    pay_to_address = base_address.get("address")

    if not pay_to_address:
        raise ValueError("PaymentIntent did not return expected crypto deposit details")

    print(
        f"Created PaymentIntent {payment_intent['id']} "
        f"for ${amount_in_cents / 100:.2f} -> {pay_to_address}"
    )

    return pay_to_address


# Define resource configuration for the x402 payment middleware
routes = {
    # Define pricing for protected endpoints
    "GET /paid": RouteConfig(
        accepts=[
            PaymentOption(
                scheme="exact",  # Exact amount payment scheme
                price="$0.01",  # Cost per request
                network="eip155:84532",  # Base Sepolia testnet
                pay_to=create_pay_to_address,  # Dynamic address resolution
            )
        ],
        description="Data retrieval endpoint",
        mime_type="application/json",
    )
}


# Create FastAPI app
app = FastAPI(title="x402 REST API")

# Add x402 middleware
app.add_middleware(PaymentMiddlewareASGI, routes=routes, server=server)


# This endpoint is only accessible after valid payment is verified.
@app.get("/paid")
async def get_paid():
    return {"foo": "bar"}


if __name__ == "__main__":
    print("Server listening at http://localhost:4242")
    uvicorn.run(app, host="0.0.0.0", port=4242)
