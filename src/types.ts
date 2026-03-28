// ──────────────────────────────────────────────────────────────────────────────
// Client configuration
// ──────────────────────────────────────────────────────────────────────────────

export interface TickerAPIConfig {
  /** Your TickerAPI API key. */
  apiKey: string;
  /** Override the default base URL (https://api.tickerapi.ai/v1). */
  baseUrl?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Shared types
// ──────────────────────────────────────────────────────────────────────────────

export type Timeframe = "daily" | "weekly";

export type AssetClass = "stock" | "crypto" | "etf" | "all";

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
// GET /v1/summary/{ticker}
// ──────────────────────────────────────────────────────────────────────────────

export interface SummaryOptions {
  /** "daily" or "weekly". Defaults to "daily". */
  timeframe?: Timeframe;
  /** ISO 8601 date string (YYYY-MM-DD). */
  date?: string;
}

/** The shape returned by the summary endpoint. Kept as a generic record so the
 *  SDK stays forward-compatible as the API evolves. */
export type SummaryResponse = Record<string, unknown>;

// ──────────────────────────────────────────────────────────────────────────────
// GET /v1/compare
// ──────────────────────────────────────────────────────────────────────────────

export interface CompareOptions {
  timeframe?: Timeframe;
  date?: string;
}

export type CompareResponse = Record<string, unknown>;

// ──────────────────────────────────────────────────────────────────────────────
// POST /v1/watchlist
// ──────────────────────────────────────────────────────────────────────────────

export interface WatchlistOptions {
  timeframe?: Timeframe;
}

export type WatchlistResponse = Record<string, unknown>;

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
}

export interface WatchlistChangesResponse {
  timeframe: string;
  run_date: string | null;
  changes: Record<string, WatchlistChangeEntry[]>;
  tickers_checked: number;
  tickers_changed: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /v1/assets
// ──────────────────────────────────────────────────────────────────────────────

export type AssetsResponse = Record<string, unknown>;

// ──────────────────────────────────────────────────────────────────────────────
// Scan endpoints – shared
// ──────────────────────────────────────────────────────────────────────────────

interface BaseScanOptions {
  timeframe?: Timeframe;
  asset_class?: AssetClass;
  sector?: string;
  /** Number of results to return (1-50). */
  limit?: number;
  /** ISO 8601 date string (YYYY-MM-DD). */
  date?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /v1/scan/oversold
// ──────────────────────────────────────────────────────────────────────────────

export type OversoldSeverity = "oversold" | "deep_oversold";
export type OversoldSortBy = "severity" | "days_oversold" | "condition_percentile";

export interface OversoldOptions extends BaseScanOptions {
  min_severity?: OversoldSeverity;
  sort_by?: OversoldSortBy;
}

export type OversoldResponse = Record<string, unknown>;

// ──────────────────────────────────────────────────────────────────────────────
// GET /v1/scan/breakouts
// ──────────────────────────────────────────────────────────────────────────────

export type BreakoutDirection = "bullish" | "bearish" | "all";
export type BreakoutSortBy = "volume_ratio" | "level_strength" | "condition_percentile";

export interface BreakoutsOptions extends BaseScanOptions {
  direction?: BreakoutDirection;
  sort_by?: BreakoutSortBy;
}

export type BreakoutsResponse = Record<string, unknown>;

// ──────────────────────────────────────────────────────────────────────────────
// GET /v1/scan/unusual-volume
// ──────────────────────────────────────────────────────────────────────────────

export type VolumeRatioBand =
  | "extremely_low"
  | "low"
  | "normal"
  | "above_average"
  | "high"
  | "extremely_high";
export type UnusualVolumeSortBy = "volume_percentile";

export interface UnusualVolumeOptions extends BaseScanOptions {
  min_ratio_band?: VolumeRatioBand;
  sort_by?: UnusualVolumeSortBy;
}

export type UnusualVolumeResponse = Record<string, unknown>;

// ──────────────────────────────────────────────────────────────────────────────
// GET /v1/scan/valuation
// ──────────────────────────────────────────────────────────────────────────────

export type ValuationDirection = "undervalued" | "overvalued" | "all";
export type ValuationSeverity = "deep_value" | "deeply_overvalued";
export type ValuationSortBy = "valuation_percentile" | "pe_vs_history";

export interface ValuationOptions extends Omit<BaseScanOptions, "asset_class"> {
  direction?: ValuationDirection;
  min_severity?: ValuationSeverity;
  sort_by?: ValuationSortBy;
}

export type ValuationResponse = Record<string, unknown>;

// ──────────────────────────────────────────────────────────────────────────────
// GET /v1/scan/insider-activity
// ──────────────────────────────────────────────────────────────────────────────

export type InsiderDirection = "buying" | "selling" | "all";
export type InsiderSortBy = "zone_severity" | "shares_volume" | "net_ratio";

export interface InsiderActivityOptions extends Omit<BaseScanOptions, "asset_class"> {
  direction?: InsiderDirection;
  sort_by?: InsiderSortBy;
}

export type InsiderActivityResponse = Record<string, unknown>;

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
