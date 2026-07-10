// ──────────────────────────────────────────────────────────────────────────────
// Client configuration
// ──────────────────────────────────────────────────────────────────────────────

export interface TickerDBConfig {
  /** Your TickerDB API key. */
  apiKey: string;
  /** Override the default base URL (https://api.tickerdb.com/v1). */
  baseUrl?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Shared types
// ──────────────────────────────────────────────────────────────────────────────

export type Timeframe = "daily" | "weekly";

export type Stability = "fresh" | "holding" | "established" | "volatile";
export type SearchOperator = "eq" | "neq" | "in" | "gt" | "gte" | "lt" | "lte";
export type SchemaOperator = SearchOperator;
export type SchemaFieldType = "text" | "integer" | "numeric" | "boolean" | "bigint";

/** Full band metadata available on paid tiers when requested on summary or included in watchlist responses. */
export interface BandMeta {
  timeframe: "daily" | "weekly";
  periods_in_current_state: number;
  flips_recent: number;
  flips_lookback: string;
  stability: Stability;
}

// ──────────────────────────────────────────────────────────────────────────────
// Rate limit info (parsed from response headers)
// ──────────────────────────────────────────────────────────────────────────────

export interface RateLimitInfo {
  requestLimit: number | null;
  requestsUsed: number | null;
  requestsRemaining: number | null;
  requestReset: string | null;
  hourlyRequestLimit: number | null;
  hourlyRequestsUsed: number | null;
  hourlyRequestsRemaining: number | null;
  hourlyRequestReset: string | null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Generic API response wrapper
// ──────────────────────────────────────────────────────────────────────────────

export interface APIResponse<T> {
  data: T;
  rateLimit: RateLimitInfo;
}

// ──────────────────────────────────────────────────────────────────────────────
// Error response shape from the API
// ──────────────────────────────────────────────────────────────────────────────

export interface APIErrorBody {
  error: {
    type: string;
    message: string;
    upgrade_url?: string;
    reset?: string;
    [key: string]: unknown;
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /v1/summary/:ticker
// ──────────────────────────────────────────────────────────────────────────────

export interface SummaryOptions {
  /** "daily" or "weekly". Defaults to "daily". */
  timeframe?: Timeframe;
  /** ISO 8601 date string (YYYY-MM-DD) for point-in-time snapshot. */
  date?: string;
  /** Range start date (YYYY-MM-DD). When provided with end, returns historical series. */
  start?: string;
  /** Range end date (YYYY-MM-DD). Used with start for historical series. */
  end?: string;
  /**
   * Optional summary fields to return. Pass sections like `trend`
   * or dotted paths like `trend.direction`, `momentum.rsi_zone`,
   * `fundamentals.valuation_zone`, `fundamentals.free_cash_flow`, or `levels`.
   */
  fields?: string[];
  /**
   * Snapshot and history modes only. Set true to include sibling `_meta`
   * and `status_meta` stability objects. Explicit `*_meta` field paths in
   * `fields` still work without this flag.
   */
  meta?: boolean;
  /** Date range mode only. Use "even" to evenly sample snapshots across the full start/end range. */
  sample?: 'even';
  /** Band field name for event queries (e.g. "momentum_rsi_zone", "pattern_bull_flag", "pattern_ascending_triangle", "trend_direction", "trend_ma_crossover_event", "trend_distance_ma50", "fundamentals_free_cash_flow"). */
  field?: string;
  /** Filter to a specific band value for event queries (e.g. "deep_oversold"). MA distance fields also support grouped "above" and "below" aliases. */
  band?: string;
  /** For event mode: max results (1-50), returned newest-first by default. For sample=even date ranges: requested sampled rows, capped by plan. */
  limit?: number;
  /** Return events before this date (YYYY-MM-DD). */
  before?: string;
  /** Return events after this date (YYYY-MM-DD). */
  after?: string;
  /** Event mode only. Set true to return aggregate stats instead of raw event rows. */
  stats?: boolean;
  /** Cross-asset correlation: a second ticker (e.g. "SPY"). Requires context_field and context_band. Plus/Pro only. */
  context_ticker?: string;
  /** Band field to check on the context ticker (e.g. "trend_direction", "trend_ma_crossover_event", or "trend_distance_ma50"). */
  context_field?: string;
  /** Only return events where the context ticker was in this band (e.g. "downtrend"). */
  context_band?: string;
}

/** The shape returned by the summary endpoint. Kept as a generic record so the
 *  SDK stays forward-compatible as the API evolves. */
export type SummaryResponse = Record<string, unknown>;

// ──────────────────────────────────────────────────────────────────────────────
// GET /v1/ohlcv/:ticker
// ──────────────────────────────────────────────────────────────────────────────

export interface OhlcvOptions {
  /** Range start date (YYYY-MM-DD). Clamped to your plan's history window. */
  start?: string;
  /** Range end date (YYYY-MM-DD). */
  end?: string;
  /** Pagination cursor (YYYY-MM-DD) — pass the previous response's `next_cursor`. */
  cursor?: string;
  /** Bar order. Defaults to "desc" (newest first). */
  order?: "asc" | "desc";
  /** Max bars to return (1-1000). Defaults to 100. Cost is ceil(rows / 100) credits. */
  limit?: number;
}

export interface OhlcvBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OhlcvResponse {
  ticker: string;
  asset_class: string;
  currency: string | null;
  timeframe: "daily";
  data_status: "eod";
  /** "split_and_dividend_adjusted" for equities/ETFs, "none" for crypto. */
  adjustment: "split_and_dividend_adjusted" | "none";
  order: "asc" | "desc";
  start: string;
  end: string | null;
  row_count: number;
  has_more: boolean;
  /** Feed back into `cursor` to fetch the next page, or null when exhausted. */
  next_cursor: string | null;
  bars: OhlcvBar[];
  plan_history_days: number;
  plan: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /v1/account
// ──────────────────────────────────────────────────────────────────────────────

export interface AccountLimits {
  monthly_requests: number;
  overage_enabled: boolean;
  watchlist_limit: number;
  search_results: number;
  webhook_urls: number;
  history_days: number;
}

export interface AccountUsage {
  monthly_requests_used: number;
  monthly_requests_remaining: number;
  credit_balance: number;
}

export interface AccountResponse {
  /** Base tier slug (e.g. "free", "plus", "pro", "business"). */
  tier: string;
  /** Full tier identifier, including seat variants where applicable. */
  tier_full: string;
  email: string;
  limits: AccountLimits;
  usage: AccountUsage;
  /** Pending scheduled tier change (e.g. a downgrade), or null. */
  scheduled_tier: string | null;
  /** ISO timestamp for when the scheduled change takes effect, or null. */
  scheduled_change_at: string | null;
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /v1/search
// ──────────────────────────────────────────────────────────────────────────────

export interface SearchFilter {
  /**
   * Canonical field name from /v1/schema/fields.
   * The API still accepts some legacy aliases for compatibility, but new clients
   * should prefer the flat snake_case schema field names.
   */
  field: string;
  op: SearchOperator;
  value: unknown;
}

export interface SearchOptions {
  /**
   * Search filters as an array of { field, op, value } objects.
   * Example:
   * [{ field: "momentum_rsi_zone", op: "eq", value: "oversold" }]
   */
  filters?: SearchFilter[];
  /** "daily" or "weekly". Defaults to "daily". */
  timeframe?: Timeframe;
  /** Optional historical snapshot date (YYYY-MM-DD). Omit for the latest snapshot. */
  date?: string;
  /** Max results to return. */
  limit?: number;
  /** Pagination offset. */
  offset?: number;
  /**
   * Columns to return in each result. Pass an array of field names
   * (e.g. `["ticker", "sector", "momentum_rsi_zone"]`) or `["*"]` for all 120+ fields.
   * Default if omitted: ticker, asset_class, sector, performance, trend_direction,
   * trend_ma20_slope, trend_ma_compression_band, trend_ma_crossover_event,
   * momentum_rsi_zone, extremes_condition, extremes_condition_rarity, volatility_regime,
   * volume_ratio_band, pattern_bull_flag, pattern_bear_flag, pattern_ascending_triangle,
   * pattern_descending_triangle, pattern_symmetrical_triangle, pattern_rising_wedge,
   * pattern_falling_wedge,
   * fundamentals_valuation_zone, range_position.
   * Request fundamentals_free_cash_flow explicitly for the stock-only free cash flow burn/surplus band.
   * Request ma8 through ma200 for raw MA values.
   * Request trend_ma8_slope through trend_ma200_slope for the full MA slope set.
   * `ticker` is always included.
   */
  fields?: string[];
  /** Column name to sort results by. Must be a valid field from the schema. */
  sort_by?: string;
  /** Sort direction. Defaults to "desc". */
  sort_direction?: 'asc' | 'desc';
}

export interface SearchResponse {
  timeframe: Timeframe;
  /** Resolved snapshot date for the query, or null if no snapshot was available. */
  date: string | null;
  fields: string[];
  filter_count: number;
  result_count: number;
  results: Array<Record<string, unknown>>;
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /v1/schema/fields
// ──────────────────────────────────────────────────────────────────────────────

export interface SchemaField {
  name: string;
  type: SchemaFieldType;
  category: string;
  values?: string[];
  description: string;
}

export interface SchemaResponse {
  total_fields: number;
  categories: string[];
  operators: SchemaOperator[];
  fields: SchemaField[];
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /v1/watchlist
// ──────────────────────────────────────────────────────────────────────────────

export interface WatchlistOptions {
  /** Optional historical snapshot date (YYYY-MM-DD). Omit for the latest saved-watchlist snapshot. */
  date?: string;
}

export type WatchlistResponse = Record<string, unknown>;

// POST /v1/watchlist

export interface AddToWatchlistResponse {
  added: string[];
  already_saved: string[];
  watchlist_count: number;
  watchlist_limit: number;
}

// DELETE /v1/watchlist

export interface RemoveFromWatchlistResponse {
  removed: string[];
  watchlist_count: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /v1/watchlist/changes
// ──────────────────────────────────────────────────────────────────────────────

export interface WatchlistChangesOptions {
  timeframe?: Timeframe;
}

export interface WatchlistChangeEntry {
  field: string;
  from: unknown;
  to: unknown;
  stability?: Stability;
  periods_in_current_state?: number;
  flips_recent?: number;
  flips_lookback?: string;
}

export interface TickerContext {
  last_changed_date: string | null;
}

export interface WatchlistChangesResponse {
  timeframe: string;
  run_date: string | null;
  changes: Record<string, WatchlistChangeEntry[]>;
  ticker_context: Record<string, TickerContext>;
  tickers_checked: number;
  tickers_changed: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// Webhook CRUD
// ──────────────────────────────────────────────────────────────────────────────

/** Known webhook event types. New types may be added server-side over time. */
export type WebhookEventType = "watchlist.changes" | "data.ready";

/** Map of event type -> enabled. Known types autocomplete; arbitrary keys stay
 *  allowed so the SDK remains forward-compatible with new server event types. */
export type WebhookEvents =
  & Partial<Record<WebhookEventType, boolean>>
  & Record<string, boolean>;

export interface CreateWebhookOptions {
  url: string;
  events?: WebhookEvents;
}

export interface UpdateWebhookOptions {
  id: string;
  url?: string;
  events?: WebhookEvents;
  active?: boolean;
}

export interface DeleteWebhookOptions {
  id: string;
}

export interface Webhook {
  id: string;
  url: string;
  events: WebhookEvents;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WebhookCreated {
  id: string;
  url: string;
  secret: string;
  events: WebhookEvents;
  active: boolean;
  created_at: string;
}

export interface WebhookListResponse {
  webhooks: Webhook[];
  webhook_count: number;
  webhook_limit: number;
}

export interface WebhookUpdateResponse {
  updated: boolean;
  id: string;
}

export interface WebhookDeleteResponse {
  deleted: string;
  webhook_count: number;
}

// GET /v1/webhooks/deliveries

export interface WebhookDeliveriesOptions {
  /** Filter to a single webhook's deliveries. */
  webhook_id?: string;
  /** Max deliveries to return (1-200). Defaults to 50. */
  limit?: number;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event_type: string;
  timeframe: string;
  run_date: string;
  status: string;
  attempt_count: number | null;
  http_status: number | null;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface WebhookDeliveriesResponse {
  deliveries: WebhookDelivery[];
  count: number;
  limit: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// Screeners CRUD (GET/POST/PUT/DELETE /v1/screeners)
// ──────────────────────────────────────────────────────────────────────────────

export type ScreenerTimeframe = Timeframe;
/** "default" for built-in screeners, "custom" for user-saved ones. */
export type ScreenerKind = "default" | "custom";
export type ScreenerFilterOp =
  | "eq" | "neq" | "in" | "gt" | "gte" | "lt" | "lte" | "exists" | "changed";
/** "value" filters match the current snapshot; "change" filters match a band transition. */
export type ScreenerFilterKind = "value" | "change";

export interface ScreenerFilter {
  /** Defaults to "value". Use "change" (with `from`/`to`) for transition filters. */
  type?: ScreenerFilterKind;
  field: string;
  op: ScreenerFilterOp;
  /** For value filters. Arrays are used with the "in" operator. */
  value?: string | number | boolean | Array<string | number | boolean>;
  /** Change filters: the prior band value. */
  from?: string | number | boolean;
  /** Change filters: the new band value. */
  to?: string | number | boolean;
  /** Change filters: lookback window in periods. */
  periods?: number;
}

export interface ScreenerSort {
  field: string;
  direction: "asc" | "desc";
}

export interface Screener {
  id: string;
  kind: ScreenerKind;
  name: string;
  description: string;
  timeframe: ScreenerTimeframe;
  filters: ScreenerFilter[];
  return_fields: string[];
  sort: ScreenerSort | null;
  /** True for built-in default screeners, which cannot be edited. */
  readonly?: boolean;
}

export interface ScreenerListResponse {
  defaults: Screener[];
  saved: Screener[];
  /** Convenience: defaults followed by saved screeners. */
  screeners: Screener[];
  /** The searchable field catalog, same shape as GET /v1/schema/fields. */
  fields: SchemaField[];
}

export interface CreateScreenerOptions {
  filters: ScreenerFilter[];
  name?: string;
  timeframe?: ScreenerTimeframe;
  sort?: ScreenerSort | null;
  /** Result cap for the saved screener (1-50). Defaults to 30. */
  limit_count?: number;
}

export interface UpdateScreenerOptions {
  id: string;
  filters?: ScreenerFilter[];
  name?: string;
  timeframe?: ScreenerTimeframe;
  sort?: ScreenerSort | null;
  limit_count?: number;
}

export interface DeleteScreenerOptions {
  id: string;
  /** "custom" (default) deletes a saved screener; "default" hides a built-in one. */
  kind?: ScreenerKind;
}

export interface ScreenerMutationResponse {
  screener: Screener;
}

export interface DeleteScreenerResponse {
  ok: boolean;
  deleted?: boolean;
  hidden?: boolean;
  id: string;
  kind: ScreenerKind;
}

