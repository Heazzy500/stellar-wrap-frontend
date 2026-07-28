/**
 * Dev-only logger for indexing / loading flows.
 * Never logs wallet addresses or indexer payloads in production.
 *
 * Code review note: do not log account IDs, public keys, or raw indexer
 * results with console.* in production paths — use this helper or gate
 * behind NODE_ENV === "development" / NEXT_PUBLIC_DEBUG_INDEXER=true.
 */

const isDev =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_DEBUG_INDEXER === "true";

export function indexerDebug(...args: unknown[]): void {
  if (isDev) {
    console.log("[Indexer]", ...args);
  }
}

export function indexerWarn(...args: unknown[]): void {
  if (isDev) {
    console.warn("[Indexer]", ...args);
  }
}

/** Errors without PII — never include account IDs in the message. */
export function indexerError(message: string, error?: unknown): void {
  if (isDev) {
    console.error("[Indexer]", message, error);
  }
}
