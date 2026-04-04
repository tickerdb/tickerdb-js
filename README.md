# tickerapi

[![npm version](https://img.shields.io/npm/v/tickerapi.svg)](https://www.npmjs.com/package/tickerapi)

Official Node.js/TypeScript SDK for the [TickerAPI](https://tickerapi.ai) financial data API.

- Zero dependencies -- uses native `fetch` (Node.js 18+)
- First-class TypeScript support with full type definitions
- Both ESM and CommonJS builds included
- Rate limit info returned with every response

## Installation

```bash
npm install tickerapi
```

## Quick Start

```typescript
import { TickerAPI } from "tickerapi";

const client = new TickerAPI({ apiKey: "YOUR_API_KEY" });

// Get a summary for a single ticker
const { data, rateLimit } = await client.summary("AAPL");
console.log(data);
console.log(`Requests remaining: ${rateLimit.requestsRemaining}`);
```

## Usage

### Initialize the client

```typescript
import { TickerAPI } from "tickerapi";

const client = new TickerAPI({
  apiKey: "YOUR_API_KEY",
  // Optional: override the default base URL
  // baseUrl: "https://api.tickerapi.ai/v1",
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

### Compare

Compare multiple tickers side-by-side.

```typescript
const { data } = await client.compare(["AAPL", "MSFT", "GOOGL"]);

const { data: weekly } = await client.compare(["AAPL", "MSFT"], {
  timeframe: "weekly",
});
```

### Watchlist

Get watchlist data for a set of tickers (POST request).

```typescript
const { data } = await client.watchlist(["AAPL", "MSFT", "TSLA"]);

const { data: weekly } = await client.watchlist(["AAPL", "MSFT"], {
  timeframe: "weekly",
});
```

### Watchlist Changes

Get field-level state changes for your saved watchlist tickers since the last pipeline run.

```typescript
const { data } = await client.watchlistChanges();

const { data: weekly } = await client.watchlistChanges({
  timeframe: "weekly",
});
```

### Assets

List all available assets.

```typescript
const { data } = await client.assets();
```

### Scanners

All scanner endpoints are available under the `scan` namespace.

#### Oversold Scanner

```typescript
const { data } = await client.scan.oversold({
  asset_class: "stock",
  min_severity: "deep_oversold",
  sort_by: "severity",
  limit: 10,
});
```

#### Breakout Scanner

```typescript
const { data } = await client.scan.breakouts({
  direction: "bullish",
  asset_class: "stock",
  sort_by: "volume_ratio",
  limit: 20,
});
```

#### Unusual Volume Scanner

```typescript
const { data } = await client.scan.unusualVolume({
  min_ratio_band: "high",
  asset_class: "stock",
  limit: 15,
});
```

#### Valuation Scanner

```typescript
const { data } = await client.scan.valuation({
  direction: "undervalued",
  min_severity: "deep_value",
  sort_by: "valuation_percentile",
  limit: 10,
});
```

#### Insider Activity Scanner

```typescript
const { data } = await client.scan.insiderActivity({
  direction: "buying",
  sort_by: "zone_severity",
  limit: 10,
});
```

### Band Stability Metadata

Every band field (trend direction, momentum zone, etc.) now includes a sibling `_meta` object with stability context. This tells you how long a state has been held, how often it has flipped recently, and an overall stability label.

```typescript
const { data } = await client.summary("AAPL");

// The band value itself
console.log(data.trend.direction);          // "uptrend"

// Stability metadata for that band
console.log(data.trend.direction_meta);
// { stability: "established", periods_in_current_state: 18, flips_recent: 1, flips_lookback: 20 }

// New types available
import type { Stability, BandMeta } from "tickerapi";
```

`Stability` is one of `"fresh"`, `"holding"`, `"established"`, or `"volatile"`. `BandMeta` contains the full metadata object. Stability metadata is available on Plus and Pro tiers only.

Stability context also appears in related endpoints:

- **Watchlist Changes** include stability fields for each changed band.
- **Scanners** return `*_stability` and `*_flips_recent` columns for relevant bands.

## Error Handling

The SDK throws a `TickerAPIError` for all non-2xx responses. The error includes the HTTP status code, a machine-readable error type, a human-readable message, and optional metadata.

```typescript
import { TickerAPI, TickerAPIError } from "tickerapi";

const client = new TickerAPI({ apiKey: "YOUR_API_KEY" });

try {
  const { data } = await client.summary("AAPL");
} catch (error) {
  if (error instanceof TickerAPIError) {
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

- [API Documentation](https://tickerapi.ai/docs)
- [Website](https://tickerapi.ai)

## License

MIT
