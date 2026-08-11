# MPP REST API - TypeScript

This is the TypeScript implementation of the MPP REST API sample using Hono. It accepts Tempo and Stripe shared payment token (SPT) payments and automatically records successful payments as Stripe PaymentIntents.

## Requirements

- Node.js 20+
- [pnpm](https://pnpm.io/) package manager
- `make`
- Stripe account with crypto payments enabled
- A Stripe deposit address (created via the Stripe CLI)

## Setup

1. Create a crypto deposit address:
```bash
stripe post /v1/crypto/deposit_addresses --live --stripe-version 2026-05-27.preview -d network=tempo
```

The server passes this address to mppx during synchronous startup. If no address is provided to `stripe.create`, mppx can instead fetch an existing address or create one.

2. Configure environment variables:
```bash
cp ../../../.env.template .env
# Edit .env with your credentials:
# - STRIPE_SECRET_KEY
# - TEMPO_DEPOSIT_ADDRESS (from step 1)
# - STRIPE_PROFILE_ID (from your Stripe profile)
```

3. Install dependencies:
```bash
make install
```

## Run the server

```bash
make run
```

## Validate the implementation

```bash
npx mppx@latest validate http://localhost:4242
```

The server exposes an OpenAPI discovery document with payment metadata at
`http://localhost:4242/openapi.json`:

```bash
curl http://localhost:4242/openapi.json
```

## Development commands

- `make lint` — run lint and formatting checks without changing files
- `make format` — apply automatic formatting fixes
- `make typecheck` — run the sample's type checker or build validation
- `make test` — run the automated test suite
- `make ci` — run the full local CI sequence (`install`, `lint`, `typecheck`, and `test`)

## Test the sample

### With Link (card payments)

Stripe requires a minimum charge of 0.50 USD (or equivalent) for card payments via SPT.

```bash
npx @stripe/link-cli mpp pay http://localhost:4242/paid \
  -X POST \
  --context "Testing the MPP machine payments integration sample server running locally on localhost:4242, verifying end-to-end payment flow with Stripe shared payment tokens"
```

### With Tempo (crypto payments)

```bash
curl -fsSL https://tempo.xyz/install | bash
tempo wallet login
tempo wallet fund
tempo request -X POST --json '{}' http://localhost:4242/paid
```
