import { TickerDBError } from "./errors.js";
import { VERSION } from "./version.js";
import type {
  AccountResponse,
  APIErrorBody,
  APIResponse,
  CancelTeamInviteOptions,
  CancelTeamInviteResponse,
  CreateTeamOptions,
  CreateTeamResponse,
  InviteTeamMemberOptions,
  InviteTeamMemberResponse,
  LeaveTeamOptions,
  LeaveTeamResponse,
  OhlcvBar,
  OhlcvOptions,
  OhlcvResponse,
  PromoteTeamMemberOptions,
  PromoteTeamMemberResponse,
  RemoveTeamMemberOptions,
  RemoveTeamMemberResponse,
  RenameTeamOptions,
  RenameTeamResponse,
  ResendTeamInviteOptions,
  ResendTeamInviteResponse,
  RateLimitInfo,
  SchemaResponse,
  SearchFilter,
  SearchOptions,
  SearchResponse,
  SetTeamSeatsOptions,
  SetTeamSeatsResponse,
  SummaryOptions,
  SummaryResponse,
  TeamListResponse,
  TickerDBConfig,
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
  private _date?: string;
  private _signal?: AbortSignal;
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

  date(date: string): this {
    this._date = date;
    return this;
  }

  signal(signal: AbortSignal): this {
    this._signal = signal;
    return this;
  }

  async execute(): Promise<APIResponse<SearchResponse>> {
    return this.client.search({
      filters: this.filters,
      fields: this._fields,
      sort_by: this._sortBy,
      sort_direction: this._sortDirection,
      timeframe: this._timeframe,
      date: this._date,
      signal: this._signal,
      limit: this._limit,
      offset: this._offset,
    });
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Team namespace interface
// ──────────────────────────────────────────────────────────────────────────────

export interface TeamMethods {
  /** List all teams you belong to, plus your own pending invites. */
  list(): Promise<APIResponse<TeamListResponse>>;
  /** Create a team (Business tier; one owned team per user). */
  create(options: CreateTeamOptions): Promise<APIResponse<CreateTeamResponse>>;
  /** Invite a member by email. */
  invite(options: InviteTeamMemberOptions): Promise<APIResponse<InviteTeamMemberResponse>>;
  /** Remove a member from the team. */
  removeMember(options: RemoveTeamMemberOptions): Promise<APIResponse<RemoveTeamMemberResponse>>;
  /** Cancel a pending invite. */
  cancelInvite(options: CancelTeamInviteOptions): Promise<APIResponse<CancelTeamInviteResponse>>;
  /** Resend a pending invite (refreshes its expiry). */
  resendInvite(options: ResendTeamInviteOptions): Promise<APIResponse<ResendTeamInviteResponse>>;
  /** Change a member's role between "admin" and "member". */
  promote(options: PromoteTeamMemberOptions): Promise<APIResponse<PromoteTeamMemberResponse>>;
  /** Leave a team you are a member of (owners cannot leave). */
  leave(options: LeaveTeamOptions): Promise<APIResponse<LeaveTeamResponse>>;
  /** Rename a team (owner only). */
  rename(options: RenameTeamOptions): Promise<APIResponse<RenameTeamResponse>>;
  /** Set total seat capacity (owner only; adjusts billing). */
  setSeats(options: SetTeamSeatsOptions): Promise<APIResponse<SetTeamSeatsResponse>>;
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Transient failures worth retrying: rate limits, timeouts, 5xx, and network errors. */
function isRetryable(err: unknown): boolean {
  if (err instanceof TickerDBError) {
    return err.status === 429 || err.status === 408 || err.status >= 500;
  }
  // A thrown non-TickerDBError here is a fetch/network failure (no response).
  return true;
}

/** Exponential backoff with full jitter, capped at 20s. */
function backoffDelay(attempt: number): number {
  const base = 500;
  const cap = 20_000;
  const ceiling = Math.min(cap, base * 2 ** attempt);
  return Math.random() * ceiling;
}

// ──────────────────────────────────────────────────────────────────────────────
// Main client class
// ──────────────────────────────────────────────────────────────────────────────

export class TickerDB {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout?: number;
  private readonly maxRetries: number;

  /** Namespace for team management endpoints. */
  public readonly team: TeamMethods;

  constructor(config: TickerDBConfig) {
    if (!config.apiKey) {
      throw new Error("An apiKey is required to create a TickerDB client.");
    }

    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.timeout = config.timeout;
    this.maxRetries = Math.max(0, config.maxRetries ?? 0);

    // Bind team methods so they retain the correct `this` context.
    this.team = {
      list: this.teamList.bind(this),
      create: (options) => this.teamAction<CreateTeamResponse>("create", options),
      invite: (options) => this.teamAction<InviteTeamMemberResponse>("invite", options),
      removeMember: (options) => this.teamAction<RemoveTeamMemberResponse>("remove_member", options),
      cancelInvite: (options) => this.teamAction<CancelTeamInviteResponse>("cancel_invite", options),
      resendInvite: (options) => this.teamAction<ResendTeamInviteResponse>("resend_invite", options),
      promote: (options) => this.teamAction<PromoteTeamMemberResponse>("promote", options),
      leave: (options) => this.teamAction<LeaveTeamResponse>("leave", options),
      rename: (options) => this.teamAction<RenameTeamResponse>("rename", options),
      setSeats: (options) => this.teamAction<SetTeamSeatsResponse>("set_seats", options),
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
      stats: options?.stats === undefined ? undefined : String(options.stats),
      context_ticker: options?.context_ticker,
      context_field: options?.context_field,
      context_band: options?.context_band,
    });
    return this.request<SummaryResponse>(
      `/summary/${encodeURIComponent(ticker)}${qs}`,
      { signal: options?.signal },
    );
  }

  /**
   * Get raw daily OHLCV price bars for a single ticker.
   *
   * Bars are split/dividend-adjusted for equities and ETFs, unadjusted for
   * crypto. History depth is capped by your plan; results are cursor-paginated
   * via `next_cursor`. Cost is `ceil(rows / 100)` credits (minimum 1).
   *
   * @param ticker - The asset ticker symbol (e.g. "AAPL").
   * @param options - Range, order, limit, and pagination cursor.
   */
  async ohlcv(
    ticker: string,
    options?: OhlcvOptions,
  ): Promise<APIResponse<OhlcvResponse>> {
    const qs = buildQueryString({
      start: options?.start,
      end: options?.end,
      cursor: options?.cursor,
      order: options?.order,
      limit: options?.limit,
    });
    return this.request<OhlcvResponse>(
      `/ohlcv/${encodeURIComponent(ticker)}${qs}`,
      { signal: options?.signal },
    );
  }

  /**
   * Iterate every OHLCV bar for a ticker across pages, transparently following
   * `next_cursor` until the range is exhausted. Each page still costs credits.
   *
   * @example
   * ```ts
   * for await (const bar of client.ohlcvBars("AAPL", { start: "2024-01-01", order: "asc" })) {
   *   console.log(bar.date, bar.close);
   * }
   * ```
   *
   * @param ticker - The asset ticker symbol (e.g. "AAPL").
   * @param options - Same options as `ohlcv()`; `cursor` sets the starting page.
   */
  async *ohlcvBars(
    ticker: string,
    options?: OhlcvOptions,
  ): AsyncGenerator<OhlcvBar, void, unknown> {
    let cursor = options?.cursor;
    while (true) {
      const { data } = await this.ohlcv(ticker, { ...options, cursor });
      for (const bar of data.bars) {
        yield bar;
      }
      if (!data.has_more || !data.next_cursor) {
        return;
      }
      cursor = data.next_cursor;
    }
  }

  /**
   * Create a fluent query builder for the search endpoint.
   *
   * @example
   * ```ts
   * const results = await client.query()
   *   .eq('trend_distance_ma50', 'proximity_above')
   *   .eq('sector', 'Technology')
   *   .select('ticker', 'sector', 'trend_distance_ma50')
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
      date: options?.date,
      limit: options?.limit,
      offset: options?.offset,
      fields: options?.fields ? JSON.stringify(options.fields) : undefined,
      sort_by: options?.sort_by,
      sort_direction: options?.sort_direction,
    });
    return this.request<SearchResponse>(`/search${qs}`, { signal: options?.signal });
  }

  /**
   * Get the schema of available fields and their valid band values.
   */
  async schema(): Promise<APIResponse<SchemaResponse>> {
    return this.request<SchemaResponse>("/schema/fields");
  }

  /**
   * Get the authenticated account's tier, plan limits, and current usage.
   *
   * This is a read-only metadata endpoint and does not consume request quota.
   */
  async account(): Promise<APIResponse<AccountResponse>> {
    return this.request<AccountResponse>("/account");
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Team methods (exposed via this.team.*)
  // ────────────────────────────────────────────────────────────────────────────

  private async teamList(): Promise<APIResponse<TeamListResponse>> {
    return this.request<TeamListResponse>("/team");
  }

  /** POST /team dispatches on an `action` discriminator in the body. */
  private async teamAction<T>(
    action: string,
    options: object,
  ): Promise<APIResponse<T>> {
    return this.request<T>("/team", {
      method: "POST",
      body: JSON.stringify({ action, ...options }),
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Internal HTTP layer
  // ────────────────────────────────────────────────────────────────────────────

  private async request<T>(
    path: string,
    init?: RequestInit,
  ): Promise<APIResponse<T>> {
    let attempt = 0;
    while (true) {
      try {
        return await this.attempt<T>(path, init);
      } catch (err) {
        // Never retry after a caller-initiated cancellation.
        if (
          init?.signal?.aborted ||
          attempt >= this.maxRetries ||
          !isRetryable(err)
        ) {
          throw err;
        }
        await sleep(backoffDelay(attempt));
        attempt += 1;
      }
    }
  }

  private async attempt<T>(
    path: string,
    init?: RequestInit,
  ): Promise<APIResponse<T>> {
    const url = `${this.baseUrl}${path}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: "application/json",
      "X-TickerDB-Client": `tickerdb-js/${VERSION}`,
    };

    if (init?.body) {
      headers["Content-Type"] = "application/json";
    }

    const userSignal = init?.signal ?? undefined;
    // Honor a caller cancellation that happened before we even started.
    if (userSignal?.aborted) {
      throw userSignal.reason ?? new DOMException("This operation was aborted.", "AbortError");
    }

    // A controller is needed to enforce a timeout and/or forward the caller's
    // signal. When neither is in play, fetch runs without one (unchanged path).
    // The timer is cleared in `finally` so a fast response never leaks it.
    const hasTimeout = this.timeout !== undefined && this.timeout > 0;
    const controller = hasTimeout || userSignal ? new AbortController() : undefined;
    const timer = hasTimeout && controller
      ? setTimeout(() => controller.abort(), this.timeout)
      : undefined;
    const onUserAbort = () => controller?.abort(userSignal?.reason);
    if (userSignal && controller) {
      userSignal.addEventListener("abort", onUserAbort, { once: true });
    }

    try {
      const response = await fetch(url, {
        method: init?.method ?? "GET",
        headers,
        body: init?.body,
        signal: controller?.signal,
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
    } catch (err) {
      if (controller?.signal.aborted) {
        // Caller cancellation takes precedence — rethrow their reason so it
        // stays a cancellation (and never gets retried).
        if (userSignal?.aborted) {
          throw userSignal.reason ?? err;
        }
        // Otherwise the abort was our own timeout firing.
        throw new TickerDBError(
          408,
          "timeout",
          `Request timed out after ${this.timeout}ms.`,
        );
      }
      throw err;
    } finally {
      if (userSignal) {
        userSignal.removeEventListener("abort", onUserAbort);
      }
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    }
  }
}
