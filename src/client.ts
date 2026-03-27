import { TickerAPIError } from "./errors.js";
import type {
  APIErrorBody,
  APIResponse,
  AssetsResponse,
  BreakoutsOptions,
  BreakoutsResponse,
  CompareOptions,
  CompareResponse,
  CreateWebhookOptions,
  DeleteWebhookOptions,
  InsiderActivityOptions,
  InsiderActivityResponse,
  OversoldOptions,
  OversoldResponse,
  RateLimitInfo,
  SummaryOptions,
  SummaryResponse,
  TickerAPIConfig,
  UnusualVolumeOptions,
  UnusualVolumeResponse,
  UpdateWebhookOptions,
  ValuationOptions,
  ValuationResponse,
  WatchlistOptions,
  WatchlistResponse,
  WebhookCreated,
  WebhookDeleteResponse,
  WebhookListResponse,
  WebhookUpdateResponse,
} from "./types.js";

const DEFAULT_BASE_URL = "https://api.tickerapi.ai/v1";

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
// Scan namespace interface
// ──────────────────────────────────────────────────────────────────────────────

export interface ScanMethods {
  /** Scan for oversold assets. */
  oversold(options?: OversoldOptions): Promise<APIResponse<OversoldResponse>>;
  /** Scan for price breakouts. */
  breakouts(options?: BreakoutsOptions): Promise<APIResponse<BreakoutsResponse>>;
  /** Scan for unusual volume activity. */
  unusualVolume(options?: UnusualVolumeOptions): Promise<APIResponse<UnusualVolumeResponse>>;
  /** Scan for valuation opportunities. */
  valuation(options?: ValuationOptions): Promise<APIResponse<ValuationResponse>>;
  /** Scan for insider buying/selling activity. */
  insiderActivity(
    options?: InsiderActivityOptions,
  ): Promise<APIResponse<InsiderActivityResponse>>;
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

export class TickerAPI {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  /** Namespace for scanner endpoints. */
  public readonly scan: ScanMethods;

  /** Namespace for webhook endpoints. */
  public readonly webhooks: WebhookMethods;

  constructor(config: TickerAPIConfig) {
    if (!config.apiKey) {
      throw new Error("An apiKey is required to create a TickerAPI client.");
    }

    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");

    // Bind scan methods so they retain the correct `this` context.
    this.scan = {
      oversold: this.scanOversold.bind(this),
      breakouts: this.scanBreakouts.bind(this),
      unusualVolume: this.scanUnusualVolume.bind(this),
      valuation: this.scanValuation.bind(this),
      insiderActivity: this.scanInsiderActivity.bind(this),
    };

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
   * @param ticker - The asset ticker symbol (e.g. "AAPL").
   * @param options - Optional query parameters.
   */
  async summary(
    ticker: string,
    options?: SummaryOptions,
  ): Promise<APIResponse<SummaryResponse>> {
    const qs = buildQueryString({
      timeframe: options?.timeframe,
      date: options?.date,
    });
    return this.request<SummaryResponse>(
      `/summary/${encodeURIComponent(ticker)}${qs}`,
    );
  }

  /**
   * Compare multiple tickers side-by-side.
   *
   * @param tickers - Array of ticker symbols to compare.
   * @param options - Optional query parameters.
   */
  async compare(
    tickers: string[],
    options?: CompareOptions,
  ): Promise<APIResponse<CompareResponse>> {
    const qs = buildQueryString({
      tickers: tickers.join(","),
      timeframe: options?.timeframe,
      date: options?.date,
    });
    return this.request<CompareResponse>(`/compare${qs}`);
  }

  /**
   * Get watchlist data for a set of tickers.
   *
   * @param tickers - Array of ticker symbols.
   * @param options - Optional parameters.
   */
  async watchlist(
    tickers: string[],
    options?: WatchlistOptions,
  ): Promise<APIResponse<WatchlistResponse>> {
    return this.request<WatchlistResponse>("/watchlist", {
      method: "POST",
      body: JSON.stringify({
        tickers,
        timeframe: options?.timeframe,
      }),
    });
  }

  /**
   * List all available assets.
   */
  async assets(): Promise<APIResponse<AssetsResponse>> {
    return this.request<AssetsResponse>("/assets");
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Scan methods (exposed via this.scan.*)
  // ────────────────────────────────────────────────────────────────────────────

  private async scanOversold(
    options?: OversoldOptions,
  ): Promise<APIResponse<OversoldResponse>> {
    const qs = buildQueryString({
      timeframe: options?.timeframe,
      asset_class: options?.asset_class,
      sector: options?.sector,
      min_severity: options?.min_severity,
      sort_by: options?.sort_by,
      limit: options?.limit,
      date: options?.date,
    });
    return this.request<OversoldResponse>(`/scan/oversold${qs}`);
  }

  private async scanBreakouts(
    options?: BreakoutsOptions,
  ): Promise<APIResponse<BreakoutsResponse>> {
    const qs = buildQueryString({
      timeframe: options?.timeframe,
      asset_class: options?.asset_class,
      sector: options?.sector,
      direction: options?.direction,
      sort_by: options?.sort_by,
      limit: options?.limit,
      date: options?.date,
    });
    return this.request<BreakoutsResponse>(`/scan/breakouts${qs}`);
  }

  private async scanUnusualVolume(
    options?: UnusualVolumeOptions,
  ): Promise<APIResponse<UnusualVolumeResponse>> {
    const qs = buildQueryString({
      timeframe: options?.timeframe,
      asset_class: options?.asset_class,
      sector: options?.sector,
      min_ratio_band: options?.min_ratio_band,
      sort_by: options?.sort_by,
      limit: options?.limit,
      date: options?.date,
    });
    return this.request<UnusualVolumeResponse>(`/scan/unusual-volume${qs}`);
  }

  private async scanValuation(
    options?: ValuationOptions,
  ): Promise<APIResponse<ValuationResponse>> {
    const qs = buildQueryString({
      timeframe: options?.timeframe,
      sector: options?.sector,
      direction: options?.direction,
      min_severity: options?.min_severity,
      sort_by: options?.sort_by,
      limit: options?.limit,
      date: options?.date,
    });
    return this.request<ValuationResponse>(`/scan/valuation${qs}`);
  }

  private async scanInsiderActivity(
    options?: InsiderActivityOptions,
  ): Promise<APIResponse<InsiderActivityResponse>> {
    const qs = buildQueryString({
      timeframe: options?.timeframe,
      sector: options?.sector,
      direction: options?.direction,
      sort_by: options?.sort_by,
      limit: options?.limit,
      date: options?.date,
    });
    return this.request<InsiderActivityResponse>(`/scan/insider-activity${qs}`);
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

      throw new TickerAPIError(
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
