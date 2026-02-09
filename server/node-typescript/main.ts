import Stripe from "stripe";
import { config } from "dotenv";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
config();

const app = new Hono();

// Stripe handles payment processing and provides the crypto deposit address.
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("❌ STRIPE_SECRET_KEY environment variable is required");
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-01-28.clover",
  appInfo: {
    name: "stripe-samples/machine-payments",
    url: "https://github.com/stripe-samples/machine-payments",
    version: "1.0.0",
  },
});

// The facilitator verifies payment proofs and settles transactions on-chain.
// In this example, we us the x402.org testnet facilitator.
const facilitatorUrl = process.env.FACILITATOR_URL;
if (!facilitatorUrl) {
  console.error("❌ FACILITATOR_URL environment variable is required");
  process.exit(1);
}
const facilitatorClient = new HTTPFacilitatorClient({ url: facilitatorUrl });

// This function determines where payments should be sent. It either:
// 1. Extracts the address from an existing payment header (for retry/verification), or
// 2. Creates a new Stripe PaymentIntent to generate a fresh deposit address.
async function createPayToAddress(context: any): Promise<string> {
  // If a payment header exists, extract the destination address from it
  if (context.paymentHeader) {
    const decoded = JSON.parse(
      Buffer.from(context.paymentHeader, "base64").toString(),
    );
    const toAddress = decoded.payload?.authorization?.to;

    if (toAddress && typeof toAddress === "string") {
      return toAddress;
    }

    throw new Error(
      "PaymentIntent did not return expected crypto deposit details",
    );
  }

  // Create a new PaymentIntent to get a fresh crypto deposit address
  const decimals = 6; // USDC has 6 decimals
  const amountInCents = Number(10000) / Math.pow(10, decimals - 2);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: "usd",
    payment_method_types: ["crypto"],
    payment_method_data: {
      type: "crypto",
    },
    payment_method_options: {
      crypto: {
        // @ts-ignore - Stripe crypto payments beta feature
        mode: "custom",
      },
    },
    confirm: true,
  });

  if (
    !paymentIntent.next_action ||
    !("crypto_collect_deposit_details" in paymentIntent.next_action)
  ) {
    throw new Error(
      "PaymentIntent did not return expected crypto deposit details",
    );
  }

  // Extract the Base network deposit address from the PaymentIntent
  // @ts-ignore - crypto_collect_deposit_details is a beta feature
  const depositDetails = paymentIntent.next_action
    .crypto_collect_deposit_details as any;
  const payToAddress = depositDetails.deposit_addresses["base"]
    .address as string;

  console.log(
    `Created PaymentIntent ${paymentIntent.id} for $${(
      amountInCents / 100
    ).toFixed(2)} -> ${payToAddress}`,
  );

  return payToAddress;
}

// The middleware protects the route and declares the payment requirements.
app.use(
  paymentMiddleware(
    {
      // Define pricing for protected endpoints
      "GET /paid": {
        accepts: [
          {
            scheme: "exact", // Exact amount payment scheme
            price: "$0.01", // Cost per request
            network: "eip155:84532", // Base Sepolia testnet
            payTo: createPayToAddress, // Dynamic address resolution
          },
        ],
        description: "Data retrieval endpoint",
        mimeType: "application/json",
      },
    },
    // Register the payment scheme handler for Base Sepolia
    new x402ResourceServer(facilitatorClient).register(
      "eip155:84532",
      new ExactEvmScheme(),
    ),
  ),
);

// This endpoint is only accessible after valid payment is verified.
app.get("/paid", (c) => {
  return c.json({
    foo: "bar",
  });
});

serve({
  fetch: app.fetch,
  port: 4242,
});

console.log(`Server listening at http://localhost:4242`);
