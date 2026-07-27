/**
 * API route for wrapped data
 * Handles fetching indexed transaction data with caching
 */

import { NextRequest, NextResponse } from "next/server";
import { indexAccount } from "@/app/services/indexerServer";
import { WrapPeriod, PERIODS } from "@/app/utils/indexer";
import { HorizonError } from "@/app/services/indexerCore";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get("accountId");
    const network =
      (searchParams.get("network") as "mainnet" | "testnet") || "mainnet";
    const period = (searchParams.get("period") as WrapPeriod) || "monthly";

    // Validate inputs
    if (!accountId) {
      return NextResponse.json(
        { error: "Missing accountId parameter" },
        { status: 400 },
      );
    }

    if (!accountId.startsWith("G") || accountId.length !== 56) {
      return NextResponse.json(
        { error: "Invalid account ID format" },
        { status: 400 },
      );
    }

    if (!["mainnet", "testnet"].includes(network)) {
      return NextResponse.json({ error: "Invalid network" }, { status: 400 });
    }

    if (!PERIODS[period]) {
      return NextResponse.json({ error: "Invalid period" }, { status: 400 });
    }

    // Server-safe indexer (no IndexedDB) — returns live Horizon data
    const response = await indexAccount(accountId, network, period);

    return NextResponse.json({
      ...response.result,
      cached: response.fromCache,
      cacheTimestamp: response.cacheTimestamp,
      refreshingInBackground: response.refreshingInBackground,
    });
  } catch (error: unknown) {
    console.error("Error in /api/wrapped:", error);

    // Branch on HorizonError first — preserves structured status + type
    if (error instanceof HorizonError) {
      if (error.errorType === "not_found") {
        return NextResponse.json(
          {
            error: "Account not found on this network",
            details:
              "Make sure you selected the correct network (mainnet/testnet) where the account exists",
          },
          { status: 404 },
        );
      }
      if (error.errorType === "rate_limited") {
        return NextResponse.json(
          { error: "Rate limited. Please try again later." },
          { status: 429 },
        );
      }
      if (error.errorType === "timeout") {
        return NextResponse.json(
          { error: "Request timed out. Please try again." },
          { status: 408 },
        );
      }
      // server_error or unknown
      return NextResponse.json(
        { error: "Horizon server error", details: error.message },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      {
        error: "Failed to fetch wrapped data",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
