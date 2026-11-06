# x402 Batch Payout - TypeScript

This sample demonstrates how to distribute revenue to multiple recipients in a single on-chain transaction after collecting an x402 payment, using [Spraay Protocol](https://spraay.app) for batch payouts on Base.

**Use case:** Your API earns money via x402. You need to split that revenue — to affiliates, vendors, team members, or service providers. Spraay Protocol's batch payment infrastructure lets you pay them all in one transaction instead of N separate transfers.

See Stripe's [x402 documentation](https://docs.stripe.com/payments/machine/x402) and [Spraay Protocol documentation](https://docs.spraay.app) for more information.

## How it works

1. An agent sends a request to `GET /paid` with an x402 payment
2. The server verifies the payment via the CDP facilitator
3. On success, the server calls Spraay's free `GET /free/estimate-batch` endpoint (no wallet or API key required) to preview a batch payout
4. The response includes the batch estimate — gas cost, protocol fee, recipient count, and supported chains
5. The settled payment is recorded as a Stripe PaymentIntent

To execute the actual batch payout, call `POST /api/v1/batch/execute` on the Spraay gateway. See the [Spraay API reference](https://docs.spraay.app) for details.

## Requirements

- Node.js 20+
- [pnpm](https://pnpm.io/) package manager
- `make`
- Stripe account with crypto payments enabled
- A Stripe deposit address (created via the Stripe CLI)

## Setup

1. Create a crypto deposit address:
```bash
stripe post /v1/crypto/deposit_addresses --live --stripe-version 2026-05-27.preview -d network=base
```

2. Configure environment variables:
```bash
cp ../../../.env.template .env
# Edit .env with your credentials:
# - STRIPE_SECRET_KEY
# - TEMPO_DEPOSIT_ADDRESS (from step 1)
# - CDP_API_KEY_ID (from Coinbase Developer Platform)
# - CDP_API_KEY_SECRET (from Coinbase Developer Platform)
# - SPRAAY_GATEWAY_URL (optional, defaults to https://gateway.spraay.app)
```

3. Install dependencies:
```bash
make install
```

## Run the server

```bash
make run
```

## Development commands

- `make lint` — run lint and formatting checks without changing files
- `make format` — apply automatic formatting fixes
- `make typecheck` — run the sample's type checker or build validation
- `make test` — run the automated test suite
- `make ci` — run the full local CI sequence (`install`, `lint`, `typecheck`, and `test`)

## Test the sample

```bash
purl http://localhost:4242/paid
```
