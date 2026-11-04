# Contributing

Thanks for contributing to this Stripe sample!

## Code of Conduct

All interactions with this project follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Filing Issues

Issues should be relevant to this sample repository specifically. For broader questions or issues:

- [Stripe Support](https://support.stripe.com/)
- [Stripe Discord](https://stripe.com/go/developer-chat)
- [x402 Documentation](https://www.x402.org/)
- [MPP Documentation](https://mpp.tempo.xyz/)

## Code Review

All submissions, including those by project members, require review. We use GitHub pull requests for this purpose.

## Development

### Project Structure

```
machine-payments/
├── x402/               # x402 protocol integration
│   ├── batch-payout/
│   │   └── node-typescript/
│   └── server/
│       ├── python/
│       └── node-typescript/
└── mpp/                # MPP protocol integration
    └── server/
        └── node-typescript/
```

### Running Samples Locally

**x402 — Python:**
```bash
cd x402/server/python
uv sync
uv run python main.py
```

**x402 — TypeScript:**
```bash
cd x402/server/node-typescript
pnpm install
pnpm run dev
```

**MPP — TypeScript:**
```bash
cd mpp/server/node-typescript
pnpm install
pnpm run dev
```

### Testing

Before submitting a PR, ensure:

1. TypeScript compiles without errors
2. Python type checking passes (if applicable)
3. The sample runs successfully with test credentials

## Resources

- [Stripe API Documentation](https://stripe.com/docs/api)
- [x402 Protocol Specification](https://www.x402.org/)
- [Machine Payments Protocol](https://mpp.tempo.xyz/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
