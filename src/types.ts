// ──────────────────────────────────────────────────────────────────────────────
// Client configuration
// ──────────────────────────────────────────────────────────────────────────────

export interface TickerDBConfig {
  /** Your TickerDB API key. */
  apiKey: string;
  /** Override the default base URL (https://api.tickerdb.com/v1). */
  baseUrl?: string;
  /**
   * Per-request timeout in milliseconds. When set, a request that does not
   * complete in time is aborted and rejects with a `TickerDBError` of type
   * "timeout" (status 408). Omit or set to 0 to disable (the default).
   */
  timeout?: number;
  /**
   * Maximum number of automatic retries for transient failures (HTTP 429, 408,
   * and 5xx, plus network/timeout errors), using exponential backoff with
   * jitter. Defaults to 0 (disabled). Retries apply to all requests, including
   * non-idempotent writes, so enable with that in mind.
   */
  maxRetries?: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// Shared types
// ──────────────────────────────────────────────────────────────────────────────

export type Timeframe = "daily" | "weekly";

/** Per-request controls shared across endpoints that accept an options object. */
export interface RequestOptions {
  /**
   * An `AbortSignal` to cancel this request. Composes with the client-level
   * `timeout`; a cancelled request rejects with the signal's reason and is
   * never retried.
   */
  signal?: AbortSignal;
}

export type Stability = "fresh" | "holding" | "established" | "volatile";
export type SearchOperator = "eq" | "neq" | "in" | "gt" | "gte" | "lt" | "lte";
export type SchemaOperator = SearchOperator;
export type SchemaFieldType = "text" | "integer" | "numeric" | "boolean" | "bigint";

/** Full band metadata available on paid tiers when requested on summary. */
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

export interface SummaryOptions extends RequestOptions {
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

export interface OhlcvOptions extends RequestOptions {
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
  search_results: number;
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

export interface SearchOptions extends RequestOptions {
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
// Team management (GET /v1/team, POST /v1/team actions) — Business tier
// ──────────────────────────────────────────────────────────────────────────────

export type TeamRole = "owner" | "admin" | "member";
/** Roles that can be assigned to a member (owner is fixed to the team creator). */
export type AssignableTeamRole = "admin" | "member";

export interface TeamMember {
  user_id: string;
  email: string;
  name: string | null;
  role: TeamRole;
  joined_at: string | null;
}

export interface TeamPendingInvite {
  id: string;
  email: string;
  role: AssignableTeamRole;
  expires_at: string | null;
  created_at: string | null;
}

export interface Team {
  id: string;
  name: string;
  max_seats: number;
  extra_seats: number;
  seats_used: number;
  seats_available: number;
  your_role: TeamRole;
  members: TeamMember[];
  pending_invites: TeamPendingInvite[];
}

export interface MyTeamInvite {
  id: string;
  team_id: string;
  team_name: string;
  role: AssignableTeamRole;
  inviter_email: string;
  expires_at: string | null;
}

export interface TeamListResponse {
  teams: Team[];
  my_pending_invites: MyTeamInvite[];
}

export interface CreateTeamOptions {
  name: string;
}

export interface CreateTeamResponse {
  team: { id: string; name: string; max_seats: number; your_role: "owner" };
  message: string;
}

export interface InviteTeamMemberOptions {
  team_id: string;
  email: string;
  /** Defaults to "member". */
  role?: AssignableTeamRole;
}

export interface InviteTeamMemberResponse {
  invite: {
    id: string;
    email: string;
    role: AssignableTeamRole;
    expires_at: string;
    team_id: string;
  };
  message: string;
}

export interface RemoveTeamMemberOptions {
  team_id: string;
  user_id: string;
}

export interface RemoveTeamMemberResponse {
  removed: string;
  message: string;
}

export interface CancelTeamInviteOptions {
  team_id: string;
  invite_id: string;
}

export interface CancelTeamInviteResponse {
  cancelled: string;
  message: string;
}

export interface ResendTeamInviteOptions {
  team_id: string;
  invite_id: string;
}

export interface ResendTeamInviteResponse {
  resent: string;
  expires_at: string;
  message: string;
}

export interface PromoteTeamMemberOptions {
  team_id: string;
  user_id: string;
  role: AssignableTeamRole;
}

export interface PromoteTeamMemberResponse {
  user_id: string;
  previous_role: TeamRole;
  new_role: AssignableTeamRole;
  message: string;
}

export interface LeaveTeamOptions {
  team_id: string;
}

export interface LeaveTeamResponse {
  message: string;
}

export interface RenameTeamOptions {
  team_id: string;
  name: string;
}

export interface RenameTeamResponse {
  team_id: string;
  name: string;
  message: string;
}

export interface SetTeamSeatsOptions {
  team_id: string;
  /** Desired total capacity (included + extra seats). */
  total_seats: number;
}

export interface SetTeamSeatsResponse {
  team_id: string;
  max_seats: number;
  extra_seats: number;
  seats_used: number;
  seat_price_monthly: number;
  message: string;
}

