# TickerDB - Pre-computed market data for agents.

[![npm version](https://img.shields.io/npm/v/tickerdb.svg)](https://www.npmjs.com/package/tickerdb)
[![CI](https://github.com/tickerdb/tickerdb-js/actions/workflows/ci.yml/badge.svg)](https://github.com/tickerdb/tickerdb-js/actions/workflows/ci.yml)

Connect your agent to hundreds of indicators like trend_direction, support_level, and analyst_consensus to improve reasoning and reduce token usage.

- Zero dependencies -- uses native `fetch` (Node.js 18+)
- First-class TypeScript support with full type definitions
- Both ESM and CommonJS builds included
- Rate limit info returned with every response

## Installation

```bash
npm install tickerdb
```

## Quick Start

```typescript
import { TickerDB } from "tickerdb";

const client = new TickerDB({ apiKey: "tdb_your_api_key" });

// Get a summary for a single ticker
const { data, rateLimit } = await client.summary("AAPL");
console.log(data);
console.log(data.as_of_date); // "2026-04-11"
console.log(`Requests remaining: ${rateLimit.requestsRemaining}`);
```

## Usage

### Initialize the client

```typescript
import { TickerDB } from "tickerdb";

const client = new TickerDB({
  apiKey: "tdb_your_api_key",
  // Optional: override the default base URL
  // baseUrl: "https://api.tickerdb.com/v1",
  // Optional: abort requests that take longer than N milliseconds
  // timeout: 30000,
});
```

When `timeout` is set, a request that doesn't complete in time is aborted and rejects with a `TickerDBError` of type `"timeout"` (status `408`):

```typescript
const client = new TickerDB({ apiKey: "tdb_your_api_key", timeout: 30000 });

try {
  const { data } = await client.summary("AAPL");
} catch (error) {
  if (error instanceof TickerDBError && error.type === "timeout") {
    console.error("Request timed out");
  }
}
```

Set `maxRetries` to automatically retry transient failures (HTTP 429, 408, and 5xx, plus network/timeout errors) with exponential backoff and jitter. It defaults to `0` (disabled). Retries apply to all requests, including non-idempotent writes, so enable it with that in mind:

```typescript
const client = new TickerDB({ apiKey: "tdb_your_api_key", maxRetries: 2 });
```

Read methods (`summary`, `search`, `ohlcv`, `ohlcvBars`) accept a per-call `signal` to cancel a request. It composes with the client `timeout`, and a cancelled request is never retried:

```typescript
const controller = new AbortController();
setTimeout(() => controller.abort(), 100);

const { data } = await client.summary("AAPL", { signal: controller.signal });
```

The fluent query builder exposes the same via `.signal()`:

```typescript
const { data } = await client.query()
  .eq("momentum_rsi_zone", "oversold")
  .signal(controller.signal)
  .execute();
```

### Summary

Get a detailed summary for a single ticker.

```typescript
const { data } = await client.summary("AAPL");

// With options
const { data: weekly } = await client.summary("AAPL", {
  timeframe: "weekly",
  date: "2025-01-15",
});
```

Summary payloads are intentionally forward-compatible. Current snapshots include top-level freshness like `as_of_date`, same-candle `ohlcv.open/high/low/close/volume`, richer `volume` fields such as `price_direction_on_volume`, raw support/resistance prices such as `support_level.level_price`, optional level metadata such as `support_level.status_meta` when requested, Pro `sector_context` fields like `agreement` and `overbought_count`, and stock-only fundamentals such as `fundamentals.free_cash_flow` and nested `fundamentals.insider_activity` when available.

Summary stays band-first by default, so sibling `_meta` / `status_meta` stability objects are omitted unless you opt in:

```typescript
const { data } = await client.summary("AAPL", {
  meta: true,
});

const { data: narrow } = await client.summary("AAPL", {
  fields: ["trend.direction", "trend.direction_meta", "fundamentals.free_cash_flow"],
});
```

MA distance fields are available both in snapshots and events:

```typescript
const { data: maSnapshot } = await client.summary("AAPL", {
  fields: ["trend.distance_from_ma_band.ma_50"],
});

console.log(maSnapshot.trend.distance_from_ma_band.ma_50);
// "proximity_above"
```

Semantic MA fields are available in the same `trend` object:

```typescript
const { data: maSignals } = await client.summary("AAPL", {
  fields: [
    "trend.ma_slopes.ma_8",
    "trend.ma_slopes.ma_20",
    "trend.ma_slopes.ma_40",
    "trend.ma_slopes.ma_50",
    "trend.ma_slopes.ma_100",
    "trend.ma_slopes.ma_200",
    "trend.ma_compression_band",
    "trend.ma_crossover_event",
  ],
});
```

### Summary with Date Range

Get a summary series for one ticker across a date range by passing `start` and `end`.

```typescript
const { data } = await client.summary("AAPL", {
  start: "2025-01-01",
  end: "2025-03-31",
});
```

### Summary with Events Filter

Query event occurrences for a specific band field.

```typescript
const { data } = await client.summary("AAPL", {
  field: "momentum_rsi_zone",
  band: "deep_oversold",
});

const { data: extremes } = await client.summary("AAPL", {
  field: "extremes_condition",
  band: "deep_oversold",
});

const { data: maEvents } = await client.summary("BTCUSD", {
  field: "trend_distance_ma50",
  band: "above",
  context_ticker: "SPY",
  context_field: "trend_distance_ma50",
  context_band: "below",
});

const { data: fcfEvents } = await client.summary("AAPL", {
  field: "fundamentals_free_cash_flow",
  band: "moderate_surplus",
});
```

For MA distance event fields such as `trend_distance_ma50`, grouped `band: "above"` and `band: "below"` aliases are supported in addition to granular values like `"proximity_above"`.

Use `stats: true` when you want aggregate outcomes instead of raw event rows:

```typescript
const { data } = await client.summary("SOLUSD", {
  field: "trend_distance_ma20",
  band: "above",
  context_ticker: "QQQ",
  context_field: "trend_distance_ma20",
  context_band: "above",
  before: "2025-07-01",
  stats: true,
});

console.log(data.stats);
```

### OHLCV

Get raw daily OHLCV price bars for a single ticker. Bars are split/dividend-adjusted for equities and ETFs, and unadjusted for crypto. History depth is capped by your plan, and results are cursor-paginated.

```typescript
const { data } = await client.ohlcv("AAPL");

console.log(data.bars[0]);
// { date: "2026-04-11", open: 172.3, high: 174.1, low: 171.8, close: 173.5, volume: 51234000 }
```

Control the range, order, and page size, and follow `next_cursor` to paginate:

```typescript
const { data } = await client.ohlcv("AAPL", {
  start: "2025-01-01",
  end: "2025-03-31",
  order: "asc",
  limit: 500,
});

if (data.has_more) {
  const { data: next } = await client.ohlcv("AAPL", {
    cursor: data.next_cursor!,
    order: "asc",
  });
}
```

Each request costs `ceil(rows / 100)` credits (minimum 1).

To stream every bar across a range without managing the cursor yourself, use `ohlcvBars()`, which follows `next_cursor` automatically:

```typescript
for await (const bar of client.ohlcvBars("AAPL", { start: "2024-01-01", order: "asc" })) {
  console.log(bar.date, bar.close);
}
```

### Account

Get the authenticated account's tier, plan limits, and current usage. This is a read-only metadata endpoint and does not consume request quota.

```typescript
const { data } = await client.account();

console.log(data.tier);                          // "pro"
console.log(data.limits.monthly_requests);       // plan request cap
console.log(data.usage.monthly_requests_remaining);
console.log(data.usage.credit_balance);
```

### Watchlist

Get the saved watchlist snapshot for the authenticated account.

```typescript
const { data } = await client.watchlist();
console.log(data.as_of_date); // shared snapshot date when available

const { data: historical } = await client.watchlist({
  date: "2025-01-15",
});
```

Add tickers to the saved watchlist:

```typescript
const { data } = await client.addToWatchlist(["AAPL", "MSFT", "TSLA"]);
```

Remove tickers from the saved watchlist:

```typescript
const { data } = await client.removeFromWatchlist(["TSLA"]);
```

### Watchlist Changes

Get field-level state changes for your saved watchlist tickers since the last pipeline run.

```typescript
const { data } = await client.watchlistChanges();

const { data: weekly } = await client.watchlistChanges({
  timeframe: "weekly",
});
```

### Band Stability Metadata

Summary omits sibling `_meta` objects by default so the primary band label stays front-and-center. Set `meta: true` to include full paid-tier stability metadata across the response, or request just the few `*_meta` fields you need via `fields`.

Summary and watchlist responses also include `as_of_date` so you can see exactly which market session the snapshot represents.

```typescript
const { data } = await client.summary("AAPL", {
  meta: true,
});

// The band value itself
console.log(data.trend.direction);          // "uptrend"

// Stability metadata for that band
console.log(data.trend.direction_meta);
// { stability: "established", periods_in_current_state: 18, flips_recent: 1, flips_lookback: 20 }

// New types available
import type { Stability, BandMeta } from "tickerdb";
```

`Stability` is one of `"fresh"`, `"holding"`, `"established"`, or `"volatile"`. `BandMeta` contains the full metadata object. Stability metadata is available on Plus and Pro tiers only.

Stability context also appears in **Watchlist**, which still includes paid-tier `_meta` objects by default, and in **Watchlist Changes**, which include stability fields inline for each changed band.

### Query Builder

The SDK includes a fluent query builder for searching assets by categorical state. Chain methods in order: select, filters, sort, limit.

```typescript
const { data } = await client.query()
  .select('ticker', 'sector', 'trend_distance_ma50', 'momentum_rsi_zone', 'fundamentals_free_cash_flow')
  .eq('trend_distance_ma50', 'proximity_above')
  .eq('fundamentals_free_cash_flow', 'moderate_surplus')
  .eq('sector', 'Technology')
  .sort('extremes_condition_percentile', 'asc')
  .limit(10)
  .execute()
```

Pass `.date('YYYY-MM-DD')` (or `date` in `search()`) to query a historical snapshot instead of the latest one:

```typescript
const { data } = await client.query()
  .select('ticker', 'momentum_rsi_zone')
  .eq('momentum_rsi_zone', 'oversold')
  .date('2025-01-15')
  .execute()
```

### Webhooks

Manage webhook subscriptions for the authenticated account. Valid event types are `"watchlist.changes"` and `"data.ready"`.

```typescript
// List
const { data } = await client.webhooks.list();

// Create — returns the signing secret once, on creation
const { data: created } = await client.webhooks.create({
  url: "https://example.com/hooks/tickerdb",
  events: { "watchlist.changes": true },
});

// Update
await client.webhooks.update({ id: created.id, active: false });

// Delete
await client.webhooks.delete({ id: created.id });
```

Inspect delivery history for debugging, optionally filtered to a single webhook:

```typescript
const { data } = await client.webhooks.deliveries({
  webhook_id: created.id,
  limit: 50,
});

console.log(data.deliveries[0]);
// { id, webhook_id, event_type, status, http_status, attempt_count, ... }
```

### Team

Manage teams for the authenticated account. Listing teams works on any tier; creating teams and inviting members requires the Business plan.

```typescript
// List teams you belong to, plus your own pending invites
const { data } = await client.team.list();
console.log(data.teams[0]?.members);

// Create a team (Business tier)
const { data: created } = await client.team.create({ name: "Research desk" });
const teamId = created.team.id;

// Invite, promote, and manage members
await client.team.invite({ team_id: teamId, email: "analyst@example.com", role: "member" });
await client.team.promote({ team_id: teamId, user_id: "usr_123", role: "admin" });
await client.team.removeMember({ team_id: teamId, user_id: "usr_123" });

// Invites
await client.team.resendInvite({ team_id: teamId, invite_id: "inv_123" });
await client.team.cancelInvite({ team_id: teamId, invite_id: "inv_123" });

// Team administration
await client.team.rename({ team_id: teamId, name: "New name" });
await client.team.setSeats({ team_id: teamId, total_seats: 8 });
await client.team.leave({ team_id: teamId });
```

## Error Handling

The SDK throws a `TickerDBError` for all non-2xx responses. The error includes the HTTP status code, a machine-readable error type, a human-readable message, and optional metadata.

```typescript
import { TickerDB, TickerDBError } from "tickerdb";

const client = new TickerDB({ apiKey: "tdb_your_api_key" });

try {
  const { data } = await client.summary("AAPL");
} catch (error) {
  if (error instanceof TickerDBError) {
    console.error(`Status: ${error.status}`);
    console.error(`Type: ${error.type}`);
    console.error(`Message: ${error.message}`);

    if (error.status === 429) {
      console.error(`Rate limit resets at: ${error.resetAt}`);
    }

    if (error.upgradeUrl) {
      console.error(`Upgrade your plan: ${error.upgradeUrl}`);
    }
  }
}
```

## Rate Limits

Every response includes parsed rate limit information:

```typescript
const { data, rateLimit } = await client.summary("AAPL");

console.log(rateLimit.requestLimit);          // Total request limit
console.log(rateLimit.requestsUsed);          // Requests used
console.log(rateLimit.requestsRemaining);     // Requests remaining
console.log(rateLimit.requestReset);          // Reset timestamp
console.log(rateLimit.hourlyRequestLimit);    // Hourly limit
console.log(rateLimit.hourlyRequestsUsed);    // Hourly used
console.log(rateLimit.hourlyRequestsRemaining); // Hourly remaining
console.log(rateLimit.hourlyRequestReset);    // Hourly reset timestamp
```

## Requirements

- Node.js 18 or later (requires native `fetch`)

## Links

- [API Documentation](https://tickerdb.com/docs)
- [Website](https://tickerdb.com)

## License

MIT
