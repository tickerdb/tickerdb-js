import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TickerDB, TickerDBError, VERSION } from "../src/index.js";

// ──────────────────────────────────────────────────────────────────────────────
// Test helpers
// ──────────────────────────────────────────────────────────────────────────────

type FetchCall = { url: string; init: RequestInit };

let calls: FetchCall[] = [];

/** Queue of responses to hand back, one per fetch call (FIFO). */
let responses: Response[] = [];

function jsonResponse(
  body: unknown,
  init?: { status?: number; headers?: Record<string, string> },
): Response {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
}

function queue(...res: Response[]) {
  responses.push(...res);
}

beforeEach(() => {
  calls = [];
  responses = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const next = responses.shift();
    if (!next) throw new Error(`Unexpected fetch call to ${url}`);
    return next;
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function client() {
  return new TickerDB({ apiKey: "tdb_test_key", baseUrl: "https://api.example.com/v1" });
}

function lastCall() {
  return calls[calls.length - 1];
}

// ──────────────────────────────────────────────────────────────────────────────
// Construction
// ──────────────────────────────────────────────────────────────────────────────

describe("version", () => {
  it("VERSION matches package.json", () => {
    const pkg = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    ) as { version: string };
    expect(VERSION).toBe(pkg.version);
  });
});

describe("construction", () => {
  it("throws when apiKey is missing", () => {
    // @ts-expect-error intentionally missing apiKey
    expect(() => new TickerDB({})).toThrow(/apiKey is required/);
  });

  it("strips trailing slashes from baseUrl", async () => {
    const c = new TickerDB({ apiKey: "k", baseUrl: "https://api.example.com/v1///" });
    queue(jsonResponse({ ok: true }));
    await c.account();
    expect(lastCall().url).toBe("https://api.example.com/v1/account");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Request layer: auth, headers, rate limits, errors
// ──────────────────────────────────────────────────────────────────────────────

describe("request layer", () => {
  it("sends bearer auth and Accept headers", async () => {
    queue(jsonResponse({ hello: "world" }));
    const { data } = await client().account();
    const headers = lastCall().init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer tdb_test_key");
    expect(headers.Accept).toBe("application/json");
    expect(data).toEqual({ hello: "world" });
  });

  it("sends a client-identifying header", async () => {
    queue(jsonResponse({}));
    await client().account();
    const headers = lastCall().init.headers as Record<string, string>;
    expect(headers["X-TickerDB-Client"]).toMatch(/^tickerdb-js\/\d+\.\d+\.\d+$/);
  });

  it("parses rate limit headers", async () => {
    queue(jsonResponse({}, {
      headers: {
        "x-request-limit": "1000",
        "x-requests-used": "42",
        "x-requests-remaining": "958",
        "x-request-reset": "2026-08-01T00:00:00Z",
      },
    }));
    const { rateLimit } = await client().account();
    expect(rateLimit.requestLimit).toBe(1000);
    expect(rateLimit.requestsUsed).toBe(42);
    expect(rateLimit.requestsRemaining).toBe(958);
    expect(rateLimit.requestReset).toBe("2026-08-01T00:00:00Z");
    expect(rateLimit.hourlyRequestLimit).toBeNull();
  });

  it("throws a TickerDBError on non-2xx with parsed fields", async () => {
    queue(jsonResponse(
      { error: { type: "rate_limit_exceeded", message: "Slow down", upgrade_url: "https://x/pricing", reset: "2026-08-01" } },
      { status: 429 },
    ));
    await expect(client().summary("AAPL")).rejects.toMatchObject({
      status: 429,
      type: "rate_limit_exceeded",
      message: "Slow down",
      upgradeUrl: "https://x/pricing",
      resetAt: "2026-08-01",
    });
  });

  it("falls back to a generic error when the body is not JSON", async () => {
    queue(new Response("gateway blew up", { status: 502 }));
    const err = await client().summary("AAPL").catch((e) => e);
    expect(err).toBeInstanceOf(TickerDBError);
    expect(err.status).toBe(502);
    expect(err.type).toBe("unknown_error");
  });

  it("rejects immediately when given an already-aborted signal", async () => {
    const err = await client()
      .summary("AAPL", { signal: AbortSignal.abort(new Error("cancelled")) })
      .catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("cancelled");
    expect(calls.length).toBe(0); // never hit the network
  });

  it("does not retry after a caller aborts", async () => {
    const controller = new AbortController();
    // fetch rejects only when the (composed) signal aborts.
    vi.stubGlobal("fetch", vi.fn((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError")),
        );
        controller.abort(new DOMException("user cancelled", "AbortError"));
      }),
    ));
    const c = new TickerDB({ apiKey: "k", baseUrl: "https://api.example.com/v1", maxRetries: 3 });
    const err = await c.summary("AAPL", { signal: controller.signal }).catch((e) => e);
    expect(err).toBeInstanceOf(DOMException);
    expect(err.name).toBe("AbortError");
    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  it("throws a timeout TickerDBError when a request exceeds the configured timeout", async () => {
    // fetch never resolves on its own; it rejects only when the signal aborts.
    vi.stubGlobal("fetch", vi.fn((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError")),
        );
      }),
    ));
    const c = new TickerDB({ apiKey: "k", baseUrl: "https://api.example.com/v1", timeout: 20 });
    const err = await c.account().catch((e) => e);
    expect(err).toBeInstanceOf(TickerDBError);
    expect(err.status).toBe(408);
    expect(err.type).toBe("timeout");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Retries
// ──────────────────────────────────────────────────────────────────────────────

describe("retries", () => {
  it("retries a transient 5xx and then succeeds", async () => {
    vi.useFakeTimers();
    try {
      queue(
        jsonResponse({ error: { type: "server_error", message: "boom" } }, { status: 503 }),
        jsonResponse({ ok: true }),
      );
      const c = new TickerDB({ apiKey: "k", baseUrl: "https://api.example.com/v1", maxRetries: 2 });
      const promise = c.account();
      await vi.advanceTimersByTimeAsync(30_000);
      const { data } = await promise;
      expect(data).toEqual({ ok: true });
      expect(calls.length).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("gives up after maxRetries and throws the last error", async () => {
    vi.useFakeTimers();
    try {
      queue(
        jsonResponse({ error: { type: "server_error", message: "boom" } }, { status: 503 }),
        jsonResponse({ error: { type: "server_error", message: "boom" } }, { status: 503 }),
        jsonResponse({ error: { type: "server_error", message: "boom" } }, { status: 503 }),
      );
      const c = new TickerDB({ apiKey: "k", baseUrl: "https://api.example.com/v1", maxRetries: 2 });
      const promise = c.account();
      const settled = promise.catch((e) => e);
      await vi.advanceTimersByTimeAsync(30_000);
      const err = await settled;
      expect(err).toBeInstanceOf(TickerDBError);
      expect(err.status).toBe(503);
      expect(calls.length).toBe(3); // initial + 2 retries
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not retry a non-retryable 4xx", async () => {
    queue(jsonResponse({ error: { type: "invalid_parameter", message: "bad" } }, { status: 400 }));
    const c = new TickerDB({ apiKey: "k", baseUrl: "https://api.example.com/v1", maxRetries: 3 });
    const err = await c.account().catch((e) => e);
    expect(err).toBeInstanceOf(TickerDBError);
    expect(err.status).toBe(400);
    expect(calls.length).toBe(1);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Summary
// ──────────────────────────────────────────────────────────────────────────────

describe("summary", () => {
  it("builds a snapshot URL", async () => {
    queue(jsonResponse({}));
    await client().summary("AAPL");
    expect(lastCall().url).toBe("https://api.example.com/v1/summary/AAPL");
  });

  it("serializes fields as JSON and passes meta", async () => {
    queue(jsonResponse({}));
    await client().summary("AAPL", { fields: ["trend.direction"], meta: true });
    const url = new URL(lastCall().url);
    expect(url.searchParams.get("fields")).toBe('["trend.direction"]');
    expect(url.searchParams.get("meta")).toBe("true");
  });

  it("passes event-mode params", async () => {
    queue(jsonResponse({}));
    await client().summary("AAPL", { field: "momentum_rsi_zone", band: "deep_oversold", stats: true });
    const url = new URL(lastCall().url);
    expect(url.searchParams.get("field")).toBe("momentum_rsi_zone");
    expect(url.searchParams.get("band")).toBe("deep_oversold");
    expect(url.searchParams.get("stats")).toBe("true");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// OHLCV + auto-pagination
// ──────────────────────────────────────────────────────────────────────────────

describe("ohlcv", () => {
  it("builds a URL with range and order params", async () => {
    queue(jsonResponse({ bars: [] }));
    await client().ohlcv("AAPL", { start: "2025-01-01", end: "2025-03-31", order: "asc", limit: 500 });
    const url = new URL(lastCall().url);
    expect(url.pathname).toBe("/v1/ohlcv/AAPL");
    expect(url.searchParams.get("start")).toBe("2025-01-01");
    expect(url.searchParams.get("order")).toBe("asc");
    expect(url.searchParams.get("limit")).toBe("500");
  });

  it("ohlcvBars() follows next_cursor across pages", async () => {
    queue(
      jsonResponse({ bars: [{ date: "2025-01-01", open: 1, high: 1, low: 1, close: 1, volume: 1 }], has_more: true, next_cursor: "2025-01-01" }),
      jsonResponse({ bars: [{ date: "2025-01-02", open: 2, high: 2, low: 2, close: 2, volume: 2 }], has_more: false, next_cursor: null }),
    );
    const dates: string[] = [];
    for await (const bar of client().ohlcvBars("AAPL", { order: "asc" })) {
      dates.push(bar.date);
    }
    expect(dates).toEqual(["2025-01-01", "2025-01-02"]);
    // Second call must carry the cursor from the first page.
    expect(new URL(calls[1].url).searchParams.get("cursor")).toBe("2025-01-01");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Search + query builder
// ──────────────────────────────────────────────────────────────────────────────

describe("search", () => {
  it("serializes filters as JSON and includes date", async () => {
    queue(jsonResponse({ results: [] }));
    await client().search({
      filters: [{ field: "momentum_rsi_zone", op: "eq", value: "oversold" }],
      date: "2025-01-15",
    });
    const url = new URL(lastCall().url);
    expect(JSON.parse(url.searchParams.get("filters")!)).toEqual([
      { field: "momentum_rsi_zone", op: "eq", value: "oversold" },
    ]);
    expect(url.searchParams.get("date")).toBe("2025-01-15");
  });

  it("query builder forwards an abort signal", async () => {
    const err = await client()
      .query()
      .eq("sector", "Technology")
      .signal(AbortSignal.abort(new Error("cancelled")))
      .execute()
      .catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("cancelled");
    expect(calls.length).toBe(0);
  });

  it("query builder threads filters, select, sort and date", async () => {
    queue(jsonResponse({ results: [] }));
    await client()
      .query()
      .select("ticker", "sector")
      .eq("sector", "Technology")
      .sort("market_cap", "asc")
      .date("2025-01-15")
      .limit(5)
      .execute();
    const url = new URL(lastCall().url);
    expect(JSON.parse(url.searchParams.get("filters")!)).toEqual([
      { field: "sector", op: "eq", value: "Technology" },
    ]);
    expect(JSON.parse(url.searchParams.get("fields")!)).toEqual(["ticker", "sector"]);
    expect(url.searchParams.get("sort_by")).toBe("market_cap");
    expect(url.searchParams.get("sort_direction")).toBe("asc");
    expect(url.searchParams.get("date")).toBe("2025-01-15");
    expect(url.searchParams.get("limit")).toBe("5");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Watchlist mutations
// ──────────────────────────────────────────────────────────────────────────────

describe("watchlist", () => {
  it("uppercases tickers on add and sends a POST body", async () => {
    queue(jsonResponse({ added: ["AAPL"] }));
    await client().addToWatchlist(["aapl", "msft"]);
    const { init } = lastCall();
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ tickers: ["AAPL", "MSFT"] });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Screeners
// ──────────────────────────────────────────────────────────────────────────────

describe("screeners", () => {
  it("delete uses a query string with id and kind", async () => {
    queue(jsonResponse({ ok: true }));
    await client().screeners.delete({ id: "oversold", kind: "default" });
    const { url, init } = lastCall();
    expect(init.method).toBe("DELETE");
    const parsed = new URL(url);
    expect(parsed.pathname).toBe("/v1/screeners");
    expect(parsed.searchParams.get("id")).toBe("oversold");
    expect(parsed.searchParams.get("kind")).toBe("default");
  });

  it("create posts filters in the body", async () => {
    queue(jsonResponse({ screener: {} }));
    await client().screeners.create({ filters: [{ field: "sector", op: "eq", value: "Technology" }] });
    const { init } = lastCall();
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string).filters).toEqual([
      { field: "sector", op: "eq", value: "Technology" },
    ]);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Team
// ──────────────────────────────────────────────────────────────────────────────

describe("team", () => {
  it("create posts an action discriminator with the payload", async () => {
    queue(jsonResponse({ team: {} }));
    await client().team.create({ name: "Research desk" });
    const { url, init } = lastCall();
    expect(url).toBe("https://api.example.com/v1/team");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ action: "create", name: "Research desk" });
  });

  it("setSeats posts the set_seats action", async () => {
    queue(jsonResponse({ team_id: "t1" }));
    await client().team.setSeats({ team_id: "t1", total_seats: 8 });
    expect(JSON.parse(lastCall().init.body as string)).toEqual({
      action: "set_seats",
      team_id: "t1",
      total_seats: 8,
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Webhooks
// ──────────────────────────────────────────────────────────────────────────────

describe("webhooks", () => {
  it("deliveries builds a filtered query", async () => {
    queue(jsonResponse({ deliveries: [] }));
    await client().webhooks.deliveries({ webhook_id: "wh1", limit: 25 });
    const url = new URL(lastCall().url);
    expect(url.pathname).toBe("/v1/webhooks/deliveries");
    expect(url.searchParams.get("webhook_id")).toBe("wh1");
    expect(url.searchParams.get("limit")).toBe("25");
  });
});
