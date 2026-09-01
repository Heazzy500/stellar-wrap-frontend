/**
 * POST /api/notifications/subscribe
 *
 * Stores a push subscription for a wallet address.
 */

import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvSet, SUB_KEY } from "../_lib/kv";
import {
  getClientIp,
  checkRateLimit,
  rateLimitResponse,
  SUBSCRIBE_IP_LIMIT,
  SUBSCRIBE_IP_WINDOW,
} from "../_lib/rateLimit";
import type { SubscriptionRecord, PeriodPrefs } from "@/app/types/notifications";

function isValidWallet(address: string): boolean {
  return typeof address === "string" && address.startsWith("G") && address.length === 56;
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const ipLimitResult = await checkRateLimit(
      `ratelimit:ip:subscribe:${ip}`,
      SUBSCRIBE_IP_LIMIT,
      SUBSCRIBE_IP_WINDOW,
    );

    if (!ipLimitResult.allowed) {
      return rateLimitResponse(ipLimitResult.resetInSeconds);
    }

    const body = await request.json();
    const { walletAddress, subscription, periods } = body as {
      walletAddress: string;
      subscription: PushSubscriptionJSON;
      periods: PeriodPrefs;
    };

    if (!isValidWallet(walletAddress)) {
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
    }

    if (!subscription?.endpoint) {
      return NextResponse.json({ error: "Invalid push subscription" }, { status: 400 });
    }

    const existing = (await kvGet<SubscriptionRecord>(SUB_KEY(walletAddress))) ?? {
      walletAddress,
      consentGiven: true,
      consentTimestamp: new Date().toISOString(),
    };

    const updated: SubscriptionRecord = {
      ...existing,
      push: {
        subscription,
        periods: periods ?? { weekly: false, monthly: false, yearly: false },
        createdAt: existing.push?.createdAt ?? new Date().toISOString(),
      },
    };

    await kvSet(SUB_KEY(walletAddress), updated);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[POST /api/notifications/subscribe]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
