import type { AddToWatchlistResponse, APIResponse, CreateWebhookOptions, DeleteWebhookOptions, RemoveFromWatchlistResponse, SchemaResponse, SearchOptions, SearchResponse, SummaryOptions, SummaryResponse, TickerDBConfig, UpdateWebhookOptions, WatchlistChangesOptions, WatchlistChangesResponse, WatchlistOptions, WatchlistResponse, WebhookCreated, WebhookDeleteResponse, WebhookListResponse, WebhookUpdateResponse } from "./types.js";
export declare class SearchBuilder {
    private filters;
    private _fields?;
    private _sortBy?;
    private _sortDirection?;
    private _timeframe?;
    private _limit?;
    private _offset?;
    private client;
    constructor(client: TickerDB);
    eq(field: string, value: string | number | boolean): this;
    neq(field: string, value: string | number | boolean): this;
    in(field: string, values: (string | number)[]): this;
    gt(field: string, value: number): this;
    gte(field: string, value: number): this;
    lt(field: string, value: number): this;
    lte(field: string, value: number): this;
    select(...fields: string[]): this;
    sort(field: string, direction?: "asc" | "desc"): this;
    limit(n: number): this;
    offset(n: number): this;
    timeframe(tf: "daily" | "weekly"): this;
    execute(): Promise<APIResponse<SearchResponse>>;
}
export interface WebhookMethods {
    list(): Promise<APIResponse<WebhookListResponse>>;
    create(options: CreateWebhookOptions): Promise<APIResponse<WebhookCreated>>;
    update(options: UpdateWebhookOptions): Promise<APIResponse<WebhookUpdateResponse>>;
    delete(options: DeleteWebhookOptions): Promise<APIResponse<WebhookDeleteResponse>>;
}
export declare class TickerDB {
    private readonly apiKey;
    private readonly baseUrl;
    /** Namespace for webhook endpoints. */
    readonly webhooks: WebhookMethods;
    constructor(config: TickerDBConfig);
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
    summary(ticker: string, options?: SummaryOptions): Promise<APIResponse<SummaryResponse>>;
    /**
     * Create a fluent query builder for the search endpoint.
     *
     * @example
     * ```ts
     * const results = await client.query()
     *   .eq('trend_distance_ma50', 'slightly_above')
     *   .eq('sector', 'Technology')
     *   .select('ticker', 'sector', 'trend_distance_ma50')
     *   .sort('extremes_condition_percentile', 'asc')
     *   .limit(10)
     *   .execute();
     * ```
     */
    query(): SearchBuilder;
    /**
     * Search for assets matching filter criteria.
     *
     * @param options - Search filters and pagination.
     */
    search(options?: SearchOptions): Promise<APIResponse<SearchResponse>>;
    /**
     * Get the schema of available fields and their valid band values.
     */
    schema(): Promise<APIResponse<SchemaResponse>>;
    /**
     * Get the saved watchlist snapshot for the authenticated account.
     *
     * @param options - Optional parameters (currently only historical `date`).
     */
    watchlist(options?: WatchlistOptions): Promise<APIResponse<WatchlistResponse>>;
    /**
     * Add ticker symbols to the saved watchlist.
     */
    addToWatchlist(tickers: string[]): Promise<APIResponse<AddToWatchlistResponse>>;
    /**
     * Remove ticker symbols from the saved watchlist.
     */
    removeFromWatchlist(tickers: string[]): Promise<APIResponse<RemoveFromWatchlistResponse>>;
    /**
     * Get field-level state changes for your saved watchlist tickers.
     *
     * Returns structured diffs showing what changed since the last pipeline run
     * (day-over-day for daily, week-over-week for weekly). Available on all tiers.
     *
     * @param options - Optional parameters (timeframe).
     */
    watchlistChanges(options?: WatchlistChangesOptions): Promise<APIResponse<WatchlistChangesResponse>>;
    private webhookList;
    private webhookCreate;
    private webhookUpdate;
    private webhookDelete;
    private request;
}
//# sourceMappingURL=client.d.ts.map