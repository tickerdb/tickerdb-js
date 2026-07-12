# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-07-12

### Added
- `client.ohlcv(ticker, options)` — raw daily OHLCV price bars with cursor
  pagination (`GET /v1/ohlcv/:ticker`), plus `client.ohlcvBars(ticker, options)`,
  an async generator that streams every bar across pages via `next_cursor`.
- `client.account()` — plan tier, limits, and usage (`GET /v1/account`);
  read-only, does not consume request quota.
- `client.screeners` namespace for saved-screener CRUD over
  `GET`/`POST`/`PUT`/`DELETE /v1/screeners`: `list`, `create`, `update`,
  `delete`. Supports value and change filters and hiding built-in defaults.
- `client.team` namespace for team management over `GET`/`POST /v1/team`:
  `list`, `create`, `invite`, `removeMember`, `cancelInvite`, `resendInvite`,
  `promote`, `leave`, `rename`, and `setSeats` (one method per action).
- `client.webhooks.deliveries(options)` — webhook delivery history
  (`GET /v1/webhooks/deliveries`).
- Historical `date` parameter on `search()` and a `.date()` method on the
  fluent query builder.
- `WebhookEventType` union (`"watchlist.changes" | "data.ready"`); `WebhookEvents`
  now autocompletes known types while remaining forward-compatible.
- `timeout` client option — aborts a request that exceeds the given number of
  milliseconds and rejects with a `TickerDBError` of type `"timeout"` (408).
- `maxRetries` client option — automatically retries transient failures (HTTP
  429, 408, and 5xx, plus network/timeout errors) with exponential backoff and
  jitter. Defaults to 0 (disabled).
- Per-call `signal` (`AbortSignal`) on `summary`, `search`, `ohlcv`, and
  `ohlcvBars` (plus `.signal()` on the query builder) for request cancellation.
  Composes with `timeout`; cancelled requests are never retried.
- Exported `VERSION` constant, also sent on every request via an
  `X-TickerDB-Client` header for server-side observability.
- New types for all of the above: `OhlcvOptions`/`OhlcvBar`/`OhlcvResponse`,
  `AccountResponse`, `Screener`/`ScreenerFilter`/`ScreenerSort`/etc., `Team`
  and per-action team types, `WebhookDelivery` types, and `RequestOptions`.
- Test suite (vitest) covering the request layer and every public method, and a
  CI workflow (GitHub Actions) running build and tests on Node 20.x and 22.x.

### Removed
- Stale compiled `*.js` / `*.d.ts` files that were committed under `src/`. The
  published build is generated to `dist/`.
