import type { Hono } from "hono";
import { beforeAll, describe, expect, it, vi } from "vitest";

// Stub env vars before importing the app
vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fake");
vi.stubEnv("TEMPO_DEPOSIT_ADDRESS", "0x1234567890abcdef1234567890abcdef12345678");

// Mock @hono/node-server so `serve()` is a no-op
vi.mock("@hono/node-server", () => ({
  serve: vi.fn(),
}));

// Mock process.exit to prevent it from killing the test runner
vi.spyOn(process, "exit").mockImplementation((() => {}) as never);

// Mock @coinbase/x402 facilitator config
vi.mock("@coinbase/x402", () => ({
  createFacilitatorConfig: vi.fn().mockReturnValue({
    url: "https://api.cdp.coinbase.com/platform/v2/x402",
    createAuthHeaders: vi.fn().mockResolvedValue({
      verify: { Authorization: "Bearer fake" },
      settle: { Authorization: "Bearer fake" },
    }),
  }),
}));

// Mock x402 modules so we don't need real payment infra
vi.mock("@x402/hono", () => ({
  paymentMiddleware: vi.fn().mockReturnValue(async (_c: unknown, next: () => Promise<void>) => {
    await next();
  }),
  x402ResourceServer: vi.fn().mockImplementation(
    class {
      register = vi.fn().mockReturnThis();
      onAfterSettle = vi.fn().mockReturnThis();
    },
  ),
}));

vi.mock("@x402/evm/exact/server", () => ({
  ExactEvmScheme: vi.fn().mockImplementation(class {}),
}));

vi.mock("@x402/core/server", () => ({
  HTTPFacilitatorClient: vi.fn().mockImplementation(class {}),
}));

let app: Hono;

beforeAll(async () => {
  const mod = await import("./main.ts");
  app = mod.app;
});

describe("x402 server", () => {
  it("exports a Hono app", () => {
    expect(app).toBeDefined();
    expect(app.fetch).toBeInstanceOf(Function);
  });

  it("GET /paid returns JSON with mocked middleware", async () => {
    const res = await app.request("/paid");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ foo: "bar" });
  });
});
