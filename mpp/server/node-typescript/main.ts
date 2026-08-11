import crypto from "node:crypto";
import { serve } from "@hono/node-server";
import { config } from "dotenv";
import { Hono } from "hono";
import { discovery } from "mppx/hono";
import { Mppx, stripe } from "mppx/server";
import StripeClient from "stripe";

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

if (!process.env.STRIPE_PROFILE_ID) {
  console.error("STRIPE_PROFILE_ID environment variable is required");
  process.exit(1);
}

const tempoDepositAddress = process.env.TEMPO_DEPOSIT_ADDRESS;
if (!tempoDepositAddress) {
  console.error("TEMPO_DEPOSIT_ADDRESS environment variable is required");
  console.error(
    "Create one with: stripe post /v1/crypto/deposit_addresses --live --stripe-version 2026-05-27.preview -d network=tempo",
  );
  process.exit(1);
}

// Secret used to secure payment challenges
// https://mpp.dev/protocol/challenges#challenge-binding
const mppSecretKey = crypto
  .createHmac("sha256", process.env.STRIPE_SECRET_KEY!)
  .update("mpp-challenge-signing")
  .digest("base64");

const stripeClient = new StripeClient(process.env.STRIPE_SECRET_KEY!, {
  appInfo: {
    name: "stripe-samples/machine-payments",
    url: "https://github.com/stripe-samples/machine-payments",
    version: "1.0.0",
  },
});

const app = new Hono();

const stripeMachinePayments = stripe.create({
  client: stripeClient,
  networkId: process.env.STRIPE_PROFILE_ID!,
  livemode: !process.env.STRIPE_SECRET_KEY!.includes("_test_"),
  // If omitted, mppx fetches an existing deposit address or creates a new one.
  depositAddresses: { tempo: tempoDepositAddress },
});

const mppx = Mppx.create({
  // Returns Tempo and SPT methods today. Future mppx versions may include
  // additional methods Stripe can configure automatically.
  methods: stripeMachinePayments.defaultMethods(),
  secretKey: mppSecretKey,
});

const paid = mppx.compose(
  ["tempo/charge", { amount: "0.01" }],
  ["stripe/charge", { amount: "0.50" }],
);

app.post("/paid", async (c) => {
  const response = await paid(c.req.raw);

  if (response.status === 402) return response.challenge;

  return response.withReceipt(Response.json({ foo: "bar" }));
});

discovery(app, mppx, {
  info: { title: "MPP REST API", version: "1.0.0" },
  routes: [
    {
      handler: paid,
      method: "POST",
      path: "/paid",
      summary: "Returns paid content",
    },
  ],
});

serve({
  fetch: app.fetch,
  port: 4242,
});

console.log("Server listening at http://localhost:4242");

export { app };
