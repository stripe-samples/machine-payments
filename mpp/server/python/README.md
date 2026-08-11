# MPP REST API - Python

This is the Python implementation of the MPP REST API sample using FastAPI.

## Requirements

- Python 3.12+
- [uv](https://github.com/astral-sh/uv) package manager
- `make`
- Stripe account with crypto payments enabled
- A Stripe deposit address (created via the Stripe CLI)

## Setup

1. Create a crypto deposit address:
```bash
stripe post /v1/crypto/deposit_addresses --live --stripe-version 2026-05-27.preview -d network=tempo
```

2. Configure environment variables:
```bash
cp ../../../.env.template .env
# Edit .env with your credentials:
# - STRIPE_SECRET_KEY
# - TEMPO_DEPOSIT_ADDRESS (from step 1)
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

## Development commands

- `make lint` — run lint and formatting checks without changing files
- `make format` — apply automatic formatting fixes
- `make typecheck` — run the sample's type checker or build validation
- `make test` — run the automated test suite
- `make ci` — run the full local CI sequence (`install`, `lint`, `typecheck`, and `test`)

## Test the sample

### With Link (card payments)

```bash
npx @stripe/link-cli mpp pay http://localhost:4242/paid \
  --context "Testing the MPP machine payments integration sample server running locally on localhost:4242, verifying end-to-end payment flow with Stripe shared payment tokens"
```

### With Tempo (crypto payments)

```bash
curl -fsSL https://tempo.xyz/install | bash
tempo wallet login
tempo wallet fund
tempo request http://localhost:4242/paid
```
