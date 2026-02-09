# x402 REST API - TypeScript

This is the TypeScript implementation of the x402 REST API sample using Hono.

## Requirements

- Node.js 20+
- [pnpm](https://pnpm.io/) package manager
- Stripe account with crypto payments enabled
- EVM wallet with testnet USDC

## How to run

1. Install dependencies:
```bash
pnpm install
```

2. Configure environment variables:
```bash
cp ../../.env.template .env
# Edit .env with your credentials
```

3. Start the server:
```bash
pnpm run dev
```

4. Test with a client

```bash
purl http://localhost:4242/paid
```
