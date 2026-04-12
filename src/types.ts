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

/** Full band metadata returned for Plus/Pro tiers on summary and watchlist endpoints. */
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
  /** Band field name for event queries (e.g. "rsi_zone", "trend_direction"). */
  field?: string;
  /** Filter to a specific band value for event queries (e.g. "deep_oversold"). */
  band?: string;
  /** Max event results (1-100). Only used with field param. */
  limit?: number;
  /** Return events before this date (YYYY-MM-DD). */
  before?: string;
  /** Return events after this date (YYYY-MM-DD). */
  after?: string;
  /** Cross-asset correlation: a second ticker (e.g. "SPY"). Requires context_field and context_band. Plus/Pro only. */
  context_ticker?: string;
  /** Band field to check on the context ticker (e.g. "trend_direction"). */
  context_field?: string;
  /** Only return events where the context ticker was in this band (e.g. "downtrend"). */
  context_band?: string;
}

/** The shape returned by the summary endpoint. Kept as a generic record so the
 *  SDK stays forward-compatible as the API evolves. */
export type SummaryResponse = Record<string, unknown>;

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
  /** Max results to return. */
  limit?: number;
  /** Pagination offset. */
  offset?: number;
  /**
   * Columns to return in each result. Pass an array of field names
   * (e.g. `["ticker", "sector", "momentum_rsi_zone"]`) or `["*"]` for all 120+ fields.
   * Default if omitted: ticker, asset_class, sector, performance, trend_direction,
   * momentum_rsi_zone, extremes_condition, extremes_condition_rarity, volatility_regime,
   * volume_ratio_band, fundamentals_valuation_zone, range_position.
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

export type WebhookEvents = Record<string, boolean>;

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

