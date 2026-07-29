/**
 * API route for wrapped data
 * Handles fetching indexed transaction data with caching
 */

import { NextRequest, NextResponse } from "next/server";
import { indexAccount } from "@/app/services/indexerServer";
import { WrapPeriod, PERIODS, CACHE_TTL_MINUTES } from "@/app/utils/indexer";
import { validateStellarAddress } from "@/src/utils/validateStellarAddress";

/** Cache-Control header for successful, user-specific responses. */
const SUCCESS_CACHE_CONTROL = `private, max-age=${CACHE_TTL_MINUTES * 60}, stale-while-revalidate=60`;

/** Cache-Control header for error responses – never cache failures. */
const ERROR_CACHE_CONTROL = "no-store";

function jsonWithCache(
  body: Record<string, unknown>,
  init: { status: number; cache?: string },
) {
  const cacheControl = init.cache ?? (init.status >= 400 ? ERROR_CACHE_CONTROL : SUCCESS_CACHE_CONTROL);
  return NextResponse.json(body, {
    status: init.status,
    headers: { "Cache-Control": cacheControl },
  });
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get("accountId");
    const network =
      (searchParams.get("network") as "mainnet" | "testnet") || "mainnet";
    const period = (searchParams.get("period") as WrapPeriod) || "monthly";

    // Validate inputs
    if (!accountId) {
      return jsonWithCache(
        { error: "Missing accountId parameter" },
        { status: 400 },
      );
    }

    const validationResult = validateStellarAddress(accountId, network as any);
    if (!validationResult.isValid) {
      return jsonWithCache(
        { error: validationResult.error || "Invalid account ID format" },
        { status: 400 },
      );
    }

    if (!["mainnet", "testnet"].includes(network)) {
      return jsonWithCache({ error: "Invalid network" }, { status: 400 });
    }

    if (!PERIODS[period]) {
      return jsonWithCache({ error: "Invalid period" }, { status: 400 });
    }

    // Server-safe indexer (no IndexedDB) — returns live Horizon data
    const response = await indexAccount(accountId, network, period);

    return jsonWithCache(
      {
        ...response.result,
        cached: response.fromCache,
        cacheTimestamp: response.cacheTimestamp,
        refreshingInBackground: response.refreshingInBackground,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("Error in /api/wrapped:", error);

    // Handle specific error cases
    const err = error as Record<string, unknown>;
    const message = (err?.message as string) || "";
    const statusCode = err?.statusCode as number | undefined;

    // Check for NotFoundError (account doesn't exist on this network)
    if (
      message.includes("Not Found") ||
      message.includes("not found") ||
      statusCode === 404
    ) {
      return jsonWithCache(
        {
          error: "Account not found on this network",
          details:
            "Make sure you selected the correct network (mainnet/testnet) where the account exists",
        },
        { status: 404 },
      );
    }

    // Check for rate limiting
    if (statusCode === 429) {
      return jsonWithCache(
        { error: "Rate limited. Please try again later." },
        { status: 429 },
      );
    }

    // Check for Horizon server errors
    if (statusCode === 500) {
      return jsonWithCache(
        { error: "Horizon server error" },
        { status: 500 },
      );
    }

    // Check for Bad Request (pagination or other API issues)
    if (message.includes("Bad Request") || statusCode === 400) {
      return jsonWithCache(
        { error: "Bad Request to Horizon API" },
        { status: 400 },
      );
    }

    return jsonWithCache(
      {
        error: "Failed to fetch wrapped data",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
