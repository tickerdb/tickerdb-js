/**
 * Error thrown by the TickerDB SDK when the API returns a non-2xx response.
 */
export declare class TickerDBError extends Error {
    /** HTTP status code returned by the API. */
    readonly status: number;
    /** Machine-readable error type from the API (e.g. "invalid_token"). */
    readonly type: string;
    /** Optional URL to upgrade your plan (returned on 403 / 429 errors). */
    readonly upgradeUrl: string | undefined;
    /** Optional rate-limit reset timestamp (returned on 429 errors). */
    readonly resetAt: string | undefined;
    constructor(status: number, type: string, message: string, upgradeUrl?: string, resetAt?: string);
}
//# sourceMappingURL=errors.d.ts.map