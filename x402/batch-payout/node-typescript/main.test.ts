import type { Hono } from "hono";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// Stub env vars before importing the app
vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fake");
vi.stubEnv("TEMPO_DEPOSIT_ADDRESS", "0x1234567890abcdef1234567890abcdef12345678");
vi.stubEnv("CDP_API_KEY_ID", "fake_key_id");
vi.stubEnv("CDP_API_KEY_SECRET", "fake_key_secret");

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

// Canned response from Spraay's GET /free/estimate-batch endpoint
const cannedEstimate = {
  estimate: {
    chain: "base",
    recipients: 3,
    totalAmount: 1,
    protocolFeeBps: 30,
    protocolFeeUSD: 0.003,
    estimatedGasUSD: 0.056,
    estimatedTotalCostUSD: 0.059,
    supported: true,
    supportedChains: ["base", "peaq"],
  },
};

let app: Hono;

beforeAll(async () => {
  const mod = await import("./main.ts");
  app = mod.app;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("x402 batch payout server", () => {
  it("exports a Hono app", () => {
    expect(app).toBeDefined();
    expect(app.fetch).toBeInstanceOf(Function);
  });

  it("GET /paid returns batch estimate with mocked middleware", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(cannedEstimate));
    vi.stubGlobal("fetch", fetchMock);

    const res = await app.request("/paid");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toContain("Batch payout estimated");
    expect(body.batchEstimate).toEqual(cannedEstimate.estimate);
    expect(body.recipientCount).toBe(3);
    expect(body.spraayDocs).toBe("https://docs.spraay.app");

    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe("/free/estimate-batch");
    expect(url.searchParams.get("recipients")).toBe("3");
    expect(url.searchParams.get("amount")).toBe("1.00");
  });

  it("GET /paid handles Spraay gateway errors gracefully", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const res = await app.request("/paid");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe("Payment received. Batch estimate unavailable.");
    expect(body.error).toBe("network down");
  });
});
