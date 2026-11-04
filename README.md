# Machine payments

This repository demonstrates how to implement machine-to-machine payments using different protocols:

- **[MPP](./mpp/)** — The Machine Payments Protocol using both Shared Payment Tokens for card payments as well as on-chain crypto payments
- **[Monetized MCP](./mcp/server/node-typescript/)** — A TypeScript MCP tool that charges agents through MPP Shared Payment Tokens
- **[x402](./x402/)** — The x402 HTTP payment protocol using on-chain crypto payments

## Prerequisites

- **Stripe account** with the relevant features enabled. 
- For MPP: [@stripe/link-cli](https://www.npmjs.com/package/@stripe/link-cli) or [Tempo wallet](https://tempo.xyz)
- For x402: Wallet with USDC on Base

## Getting Started

1. Clone this repository:
```bash
git clone https://github.com/stripe-samples/machine-payments
cd machine-payments
```

2. Copy the environment template:
```bash
cp .env.template .env
# Edit .env with your credentials
```

3. Install dependencies for all samples:
```bash
make install
```

4. Common repository-wide commands:
- `make install` — install dependencies for every sample in the repo
- `make lint` — run each sample's linter and formatting checks
- `make format` — apply automatic formatting fixes in each sample
- `make typecheck` — run type checking or build validation for each sample
- `make test` — run the automated test suite for each sample
- `make ci` — run the full per-sample CI command (`install`, `lint`, `typecheck`, and `test`)

```bash
make install
make lint
make format
make typecheck
make test
make ci
```

5. Follow the README in your chosen integration directory for the sample-specific `make run` command and test request:
- [MPP TypeScript](./mpp/server/node-typescript/)
- [MPP Python](./mpp/server/python/)
- [Monetized MCP TypeScript](./mcp/server/node-typescript/)
- [x402 TypeScript](./x402/server/node-typescript/)
- [x402 Python](./x402/server/python/)

## Support

- [Stripe Discord](https://stripe.com/go/developer-chat)
- [GitHub Issues](https://github.com/stripe-samples/machine-payments/issues)

## License

MIT
