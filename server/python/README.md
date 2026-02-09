# x402 REST API - Python

This is the Python implementation of the x402 REST API sample using FastAPI.

## Requirements

- Python 3.10+
- [uv](https://github.com/astral-sh/uv) package manager
- Stripe account with crypto payments enabled
- EVM wallet with testnet USDC

## How to run

1. Install dependencies:
```bash
uv sync
```

2. Configure environment variables:
```bash
cp ../../.env.template .env
# Edit .env with your credentials
```

3. Start the server:
```bash
uv run python main.py
```

4. Test with a client

```bash
purl http://localhost:4242/paid
```
