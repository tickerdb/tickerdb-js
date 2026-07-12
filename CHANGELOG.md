# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `client.ohlcvBars(ticker, options)` — async generator that streams every
  OHLCV bar across pages, transparently following `next_cursor`.
- `timeout` client option — aborts a request that exceeds the given number of
  milliseconds and rejects with a `TickerDBError` of type `"timeout"` (408).
- Test suite (vitest) covering the request layer and every public method.

### Removed
- Stale compiled `*.js` / `*.d.ts` files that were committed under `src/`. The
  published build is generated to `dist/`.

## [0.4.0]

### Added
- `client.team` namespace for team management over `GET`/`POST /v1/team`:
  `list`, `create`, `invite`, `removeMember`, `cancelInvite`, `resendInvite`,
  `promote`, `leave`, `rename`, and `setSeats` (one method per action).
- Team types: `Team`, `TeamMember`, `TeamPendingInvite`, `MyTeamInvite`,
  `TeamListResponse`, `TeamRole`, `AssignableTeamRole`, and per-action
  option/response types.

## [0.3.0]

### Added
- `client.screeners` namespace for saved-screener CRUD over
  `GET`/`POST`/`PUT`/`DELETE /v1/screeners`: `list`, `create`, `update`,
  `delete`. Supports value and change filters and hiding built-in defaults.
- Screener types: `Screener`, `ScreenerFilter`, `ScreenerSort`,
  `ScreenerListResponse`, and the create/update/delete option and response
  types.

## [0.2.0]

### Added
- `client.ohlcv(ticker, options)` — raw daily OHLCV price bars with cursor
  pagination (`GET /v1/ohlcv/:ticker`).
- `client.account()` — plan tier, limits, and usage (`GET /v1/account`);
  read-only, does not consume request quota.
- `client.webhooks.deliveries(options)` — webhook delivery history
  (`GET /v1/webhooks/deliveries`).
- Historical `date` parameter on `search()` and a `.date()` method on the
  fluent query builder.
- `WebhookEventType` union (`"watchlist.changes" | "data.ready"`); `WebhookEvents`
  now autocompletes known types while remaining forward-compatible.
