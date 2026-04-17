# TickerDB - Market context for agents.

[![npm version](https://img.shields.io/npm/v/tickerdb.svg)](https://www.npmjs.com/package/tickerdb)

Pre-computed EOD market context that improves reasoning, reduces token usage, and replaces data pipelines.

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
});
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

Summary payloads are intentionally forward-compatible. Current snapshots include top-level freshness like `as_of_date`, richer `volume` fields such as `price_direction_on_volume`, optional level metadata such as `support_level.status_meta` when requested, Pro `sector_context` fields like `agreement` and `overbought_count`, and stock-only nested `fundamentals.insider_activity` when available.

Summary stays band-first by default, so sibling `_meta` / `status_meta` stability objects are omitted unless you opt in:

```typescript
const { data } = await client.summary("AAPL", {
  meta: true,
});

const { data: narrow } = await client.summary("AAPL", {
  fields: ["trend.direction", "trend.direction_meta"],
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
  .select('ticker', 'sector', 'momentum_rsi_zone', 'fundamentals_valuation_zone')
  .eq('momentum_rsi_zone', 'oversold')
  .eq('sector', 'Technology')
  .sort('extremes_condition_percentile', 'asc')
  .limit(10)
  .execute()
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
