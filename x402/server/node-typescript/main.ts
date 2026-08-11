import { createFacilitatorConfig } from "@coinbase/x402";
import { serve } from "@hono/node-server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { config } from "dotenv";
import { Hono } from "hono";
import Stripe from "stripe";

config();

// Don't put any keys in code. Use an environment variable (as shown
// here) or secrets vault to supply keys to your integration.
//
// See https://docs.stripe.com/keys-best-practices and find your
// keys at https://dashboard.stripe.com/apikeys.
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("STRIPE_SECRET_KEY environment variable is required");
  process.exit(1);
}

if (!process.env.TEMPO_DEPOSIT_ADDRESS) {
  console.error("TEMPO_DEPOSIT_ADDRESS environment variable is required");
  console.error(
    "Create one with: stripe post /v1/crypto/deposit_addresses --live --stripe-version 2026-05-27.preview -d network=base",
  );
  process.exit(1);
}

// Stripe deposit address created via:
// stripe post /v1/crypto/deposit_addresses --live \
//   --stripe-version 2026-05-27.preview -d network=base
const TEMPO_DEPOSIT_ADDRESS = process.env.TEMPO_DEPOSIT_ADDRESS.toLowerCase();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  // @ts-expect-error preview API version required for crypto PaymentIntents
  apiVersion: "2026-05-27.preview",
  appInfo: {
    name: "stripe-samples/machine-payments",
    url: "https://github.com/stripe-samples/machine-payments",
    version: "1.0.0",
  },
});

// The Coinbase Developer Platform (CDP) facilitator verifies and settles x402 payments on-chain.
// See: https://docs.cdp.coinbase.com/x402/quickstart-for-sellers#running-on-mainnet
if (!process.env.CDP_API_KEY_ID || !process.env.CDP_API_KEY_SECRET) {
  console.error("CDP_API_KEY_ID and CDP_API_KEY_SECRET environment variables are required");
  process.exit(1);
}

const facilitatorClient = new HTTPFacilitatorClient(
  createFacilitatorConfig(process.env.CDP_API_KEY_ID, process.env.CDP_API_KEY_SECRET),
);

const resourceServer = new x402ResourceServer(facilitatorClient).register(
  "eip155:8453",
  new ExactEvmScheme(),
);

// Record settled on-chain payments as Stripe PaymentIntents using transaction_verification mode.
resourceServer.onAfterSettle(async ({ result, requirements }) => {
  const txHash = result.transaction;
  if (!txHash || !result.success) return;

  // requirements.amount is in atomic USDC units (6 decimals).
  // $0.01 = 10000 atomic units. Convert to cents for Stripe.
  const amountInCents = Math.round(Number(requirements.amount) / 10000);
  if (amountInCents < 1) return;

  const pi = await stripe.paymentIntents.create(
    {
      amount: amountInCents,
      currency: "usd",
      confirm: true,
      payment_method_data: { type: "crypto" },
      payment_method_types: ["crypto"],
      payment_method_options: {
        crypto: {
          mode: "transaction_verification",
          transaction_verification_options: {
            network: "base",
            transaction_hash: txHash,
          },
        },
      },
    } as Stripe.PaymentIntentCreateParams,
    { idempotencyKey: txHash },
  );

  console.log(`Stripe PI ${pi.id}: ${amountInCents}¢ on base for tx ${txHash}`);
});

const app = new Hono();

app.use(
  paymentMiddleware(
    {
      "GET /paid": {
        accepts: [
          {
            scheme: "exact",
            price: "$0.01",
            network: "eip155:8453",
            payTo: TEMPO_DEPOSIT_ADDRESS,
          },
        ],
        description: "Data retrieval endpoint",
        mimeType: "application/json",
      },
    },
    resourceServer,
  ),
);

app.get("/paid", (c) => {
  return c.json({
    foo: "bar",
  });
});

serve({
  fetch: app.fetch,
  port: 4242,
});

console.log("Server listening at http://localhost:4242");

export { app };
