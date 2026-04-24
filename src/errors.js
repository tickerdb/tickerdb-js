/**
 * Error thrown by the TickerDB SDK when the API returns a non-2xx response.
 */
export class TickerDBError extends Error {
    /** HTTP status code returned by the API. */
    status;
    /** Machine-readable error type from the API (e.g. "invalid_token"). */
    type;
    /** Optional URL to upgrade your plan (returned on 403 / 429 errors). */
    upgradeUrl;
    /** Optional rate-limit reset timestamp (returned on 429 errors). */
    resetAt;
    constructor(status, type, message, upgradeUrl, resetAt) {
        super(message);
        this.name = "TickerDBError";
        this.status = status;
        this.type = type;
        this.upgradeUrl = upgradeUrl;
        this.resetAt = resetAt;
        // Maintain proper prototype chain for instanceof checks.
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
//# sourceMappingURL=errors.js.map