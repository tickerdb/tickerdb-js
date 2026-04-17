import { TickerDBError } from "./errors.js";
import type {
  AddToWatchlistResponse,
  APIErrorBody,
  APIResponse,
  CreateWebhookOptions,
  DeleteWebhookOptions,
  RemoveFromWatchlistResponse,
  RateLimitInfo,
  SchemaResponse,
  SearchFilter,
  SearchOptions,
  SearchResponse,
  SummaryOptions,
  SummaryResponse,
  TickerDBConfig,
  UpdateWebhookOptions,
  WatchlistChangesOptions,
  WatchlistChangesResponse,
  WatchlistOptions,
  WatchlistResponse,
  WebhookCreated,
  WebhookDeleteResponse,
  WebhookListResponse,
  WebhookUpdateResponse,
} from "./types.js";

const DEFAULT_BASE_URL = "https://api.tickerdb.com/v1";

// ──────────────────────────────────────────────────────────────────────────────
// Fluent search query builder
// ──────────────────────────────────────────────────────────────────────────────

export class SearchBuilder {
  private filters: SearchFilter[] = [];
  private _fields?: string[];
  private _sortBy?: string;
  private _sortDirection?: "asc" | "desc";
  private _timeframe?: "daily" | "weekly";
  private _limit?: number;
  private _offset?: number;
  private client: TickerDB;

  constructor(client: TickerDB) {
    this.client = client;
  }

  eq(field: string, value: string | number | boolean): this {
    this.filters.push({ field, op: "eq", value });
    return this;
  }

  neq(field: string, value: string | number | boolean): this {
    this.filters.push({ field, op: "neq", value });
    return this;
  }

  in(field: string, values: (string | number)[]): this {
    this.filters.push({ field, op: "in", value: values });
    return this;
  }

  gt(field: string, value: number): this {
    this.filters.push({ field, op: "gt", value });
    return this;
  }

  gte(field: string, value: number): this {
    this.filters.push({ field, op: "gte", value });
    return this;
  }

  lt(field: string, value: number): this {
    this.filters.push({ field, op: "lt", value });
    return this;
  }

  lte(field: string, value: number): this {
    this.filters.push({ field, op: "lte", value });
    return this;
  }

  select(...fields: string[]): this {
    this._fields = fields;
    return this;
  }

  sort(field: string, direction: "asc" | "desc" = "desc"): this {
    this._sortBy = field;
    this._sortDirection = direction;
    return this;
  }

  limit(n: number): this {
    this._limit = n;
    return this;
  }

  offset(n: number): this {
    this._offset = n;
    return this;
  }

  timeframe(tf: "daily" | "weekly"): this {
    this._timeframe = tf;
    return this;
  }

  async execute(): Promise<APIResponse<SearchResponse>> {
    return this.client.search({
      filters: this.filters,
      fields: this._fields,
      sort_by: this._sortBy,
      sort_direction: this._sortDirection,
      timeframe: this._timeframe,
      limit: this._limit,
      offset: this._offset,
    });
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Webhooks namespace interface
// ──────────────────────────────────────────────────────────────────────────────

export interface WebhookMethods {
  list(): Promise<APIResponse<WebhookListResponse>>;
  create(options: CreateWebhookOptions): Promise<APIResponse<WebhookCreated>>;
  update(options: UpdateWebhookOptions): Promise<APIResponse<WebhookUpdateResponse>>;
  delete(options: DeleteWebhookOptions): Promise<APIResponse<WebhookDeleteResponse>>;
}

// ──────────────────────────────────────────────────────────────────────────────
// Helper utilities
// ──────────────────────────────────────────────────────────────────────────────

function parseIntOrNull(value: string | null): number | null {
  if (value === null) return null;
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? null : n;
}

function parseRateLimitHeaders(headers: Headers): RateLimitInfo {
  return {
    requestLimit: parseIntOrNull(headers.get("x-request-limit")),
    requestsUsed: parseIntOrNull(headers.get("x-requests-used")),
    requestsRemaining: parseIntOrNull(headers.get("x-requests-remaining")),
    requestReset: headers.get("x-request-reset"),
    hourlyRequestLimit: parseIntOrNull(headers.get("x-hourly-request-limit")),
    hourlyRequestsUsed: parseIntOrNull(headers.get("x-hourly-requests-used")),
    hourlyRequestsRemaining: parseIntOrNull(headers.get("x-hourly-requests-remaining")),
    hourlyRequestReset: headers.get("x-hourly-request-reset"),
  };
}

function buildQueryString(params: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

// ──────────────────────────────────────────────────────────────────────────────
// Main client class
// ──────────────────────────────────────────────────────────────────────────────

export class TickerDB {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  /** Namespace for webhook endpoints. */
  public readonly webhooks: WebhookMethods;

  constructor(config: TickerDBConfig) {
    if (!config.apiKey) {
      throw new Error("An apiKey is required to create a TickerDB client.");
    }

    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");

    // Bind webhook methods so they retain the correct `this` context.
    this.webhooks = {
      list: this.webhookList.bind(this),
      create: this.webhookCreate.bind(this),
      update: this.webhookUpdate.bind(this),
      delete: this.webhookDelete.bind(this),
    };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Public endpoint methods
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Get a detailed summary for a single ticker.
   *
   * Supports 4 modes depending on which options are provided:
   * - **Snapshot** (default): Current categorical state.
   * - **Historical snapshot**: Pass `date` for a point-in-time snapshot.
   * - **Historical series**: Pass `start`/`end` for a date range of snapshots.
   * - **Events**: Pass `field` (and optionally `band`) for band transition history with aftermath.
   *
   * Snapshot and history responses stay band-first by default. Set `meta: true`
   * to include sibling `_meta` / `status_meta` stability objects across the payload.
   *
   * @param ticker - The asset ticker symbol (e.g. "AAPL").
   * @param options - Optional query parameters controlling mode and filters.
   */
  async summary(
    ticker: string,
    options?: SummaryOptions,
  ): Promise<APIResponse<SummaryResponse>> {
    const qs = buildQueryString({
      timeframe: options?.timeframe,
      date: options?.date,
      start: options?.start,
      end: options?.end,
      fields: options?.fields ? JSON.stringify(options.fields) : undefined,
      meta: options?.meta === undefined ? undefined : String(options.meta),
      sample: options?.sample,
      field: options?.field,
      band: options?.band,
      limit: options?.limit,
      before: options?.before,
      after: options?.after,
      context_ticker: options?.context_ticker,
      context_field: options?.context_field,
      context_band: options?.context_band,
    });
    return this.request<SummaryResponse>(`/summary/${encodeURIComponent(ticker)}${qs}`);
  }

  /**
   * Create a fluent query builder for the search endpoint.
   *
   * @example
   * ```ts
   * const results = await client.query()
   *   .eq('momentum_rsi_zone', 'oversold')
   *   .eq('sector', 'Technology')
   *   .select('ticker', 'sector', 'momentum_rsi_zone')
   *   .sort('extremes_condition_percentile', 'asc')
   *   .limit(10)
   *   .execute();
   * ```
   */
  query(): SearchBuilder {
    return new SearchBuilder(this);
  }

  /**
   * Search for assets matching filter criteria.
   *
   * @param options - Search filters and pagination.
   */
  async search(
    options?: SearchOptions,
  ): Promise<APIResponse<SearchResponse>> {
    const qs = buildQueryString({
      filters: options?.filters ? JSON.stringify(options.filters) : undefined,
      timeframe: options?.timeframe,
      limit: options?.limit,
      offset: options?.offset,
      fields: options?.fields ? JSON.stringify(options.fields) : undefined,
      sort_by: options?.sort_by,
      sort_direction: options?.sort_direction,
    });
    return this.request<SearchResponse>(`/search${qs}`);
  }

  /**
   * Get the schema of available fields and their valid band values.
   */
  async schema(): Promise<APIResponse<SchemaResponse>> {
    return this.request<SchemaResponse>("/schema/fields");
  }

  /**
   * Get the saved watchlist snapshot for the authenticated account.
   *
   * @param options - Optional parameters (currently only historical `date`).
   */
  async watchlist(
    options?: WatchlistOptions,
  ): Promise<APIResponse<WatchlistResponse>> {
    const qs = buildQueryString({
      date: options?.date,
    });
    return this.request<WatchlistResponse>(`/watchlist${qs}`);
  }

  /**
   * Add ticker symbols to the saved watchlist.
   */
  async addToWatchlist(
    tickers: string[],
  ): Promise<APIResponse<AddToWatchlistResponse>> {
    return this.request<AddToWatchlistResponse>("/watchlist", {
      method: "POST",
      body: JSON.stringify({
        tickers: tickers.map((ticker) => ticker.toUpperCase()),
      }),
    });
  }

  /**
   * Remove ticker symbols from the saved watchlist.
   */
  async removeFromWatchlist(
    tickers: string[],
  ): Promise<APIResponse<RemoveFromWatchlistResponse>> {
    return this.request<RemoveFromWatchlistResponse>("/watchlist", {
      method: "DELETE",
      body: JSON.stringify({
        tickers: tickers.map((ticker) => ticker.toUpperCase()),
      }),
    });
  }

  /**
   * Get field-level state changes for your saved watchlist tickers.
   *
   * Returns structured diffs showing what changed since the last pipeline run
   * (day-over-day for daily, week-over-week for weekly). Available on all tiers.
   *
   * @param options - Optional parameters (timeframe).
   */
  async watchlistChanges(
    options?: WatchlistChangesOptions,
  ): Promise<APIResponse<WatchlistChangesResponse>> {
    const params = new URLSearchParams();
    if (options?.timeframe) params.set("timeframe", options.timeframe);
    const qs = params.toString();
    return this.request<WatchlistChangesResponse>(
      `/watchlist/changes${qs ? `?${qs}` : ""}`,
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Webhook methods (exposed via this.webhooks.*)
  // ────────────────────────────────────────────────────────────────────────────

  private async webhookList(): Promise<APIResponse<WebhookListResponse>> {
    return this.request<WebhookListResponse>("/webhooks");
  }

  private async webhookCreate(
    options: CreateWebhookOptions,
  ): Promise<APIResponse<WebhookCreated>> {
    return this.request<WebhookCreated>("/webhooks", {
      method: "POST",
      body: JSON.stringify({
        url: options.url,
        events: options.events,
      }),
    });
  }

  private async webhookUpdate(
    options: UpdateWebhookOptions,
  ): Promise<APIResponse<WebhookUpdateResponse>> {
    return this.request<WebhookUpdateResponse>("/webhooks", {
      method: "PUT",
      body: JSON.stringify({
        id: options.id,
        url: options.url,
        events: options.events,
        active: options.active,
      }),
    });
  }

  private async webhookDelete(
    options: DeleteWebhookOptions,
  ): Promise<APIResponse<WebhookDeleteResponse>> {
    return this.request<WebhookDeleteResponse>("/webhooks", {
      method: "DELETE",
      body: JSON.stringify({
        id: options.id,
      }),
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Internal HTTP layer
  // ────────────────────────────────────────────────────────────────────────────

  private async request<T>(
    path: string,
    init?: RequestInit,
  ): Promise<APIResponse<T>> {
    const url = `${this.baseUrl}${path}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: "application/json",
    };

    if (init?.body) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
      method: init?.method ?? "GET",
      headers,
      body: init?.body,
    });

    const rateLimit = parseRateLimitHeaders(response.headers);

    if (!response.ok) {
      let errorBody: APIErrorBody | undefined;
      try {
        errorBody = (await response.json()) as APIErrorBody;
      } catch {
        // Non-JSON error body — fall through to generic error.
      }

      const errType = errorBody?.error?.type ?? "unknown_error";
      const errMessage =
        errorBody?.error?.message ?? `Request failed with status ${response.status}`;
      const upgradeUrl = errorBody?.error?.upgrade_url;
      const resetAt =
        errorBody?.error?.reset ?? rateLimit.requestReset ?? undefined;

      throw new TickerDBError(
        response.status,
        errType,
        errMessage,
        upgradeUrl,
        resetAt,
      );
    }

    const data = (await response.json()) as T;

    return { data, rateLimit };
  }
}
