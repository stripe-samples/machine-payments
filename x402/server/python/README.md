# x402 REST API - Python

This is the Python implementation of the x402 REST API sample using FastAPI.

## Requirements

- Python 3.10+
- [uv](https://github.com/astral-sh/uv) package manager
- `make`
- Stripe account with crypto payments enabled
- EVM wallet with testnet USDC

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
