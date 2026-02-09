# Contributing

Thanks for contributing to this Stripe sample!

## Code of Conduct

All interactions with this project follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Filing Issues

Issues should be relevant to this sample repository specifically. For broader questions or issues:

- [Stripe Support](https://support.stripe.com/)
- [Stripe Discord](https://stripe.com/go/developer-chat)
- [x402 Documentation](https://www.x402.org/)

## Code Review

All submissions, including those by project members, require review. We use GitHub pull requests for this purpose.

## Development

### Project Structure

```
machine-payments/
├── x402-rest/          # REST API integration
│   └── server/
│       ├── python/
│       └── node-typescript/
└── x402-mcp/           # MCP server integration
    └── server/
        ├── python/
        └── node-typescript/
```

### Running Samples Locally

**Python:**
```bash
cd x402-rest/server/python
uv sync
uv run python src/server.py
```

**TypeScript:**
```bash
cd x402-rest/server/node-typescript
pnpm install
pnpm run server
```

### Testing

Before submitting a PR, ensure:

1. TypeScript compiles without errors
2. Python type checking passes (if applicable)
3. The sample runs successfully with test credentials

## Resources

- [Stripe API Documentation](https://stripe.com/docs/api)
- [x402 Protocol Specification](https://www.x402.org/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
