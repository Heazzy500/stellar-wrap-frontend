/**
 * POST /api/notifications/unsubscribe
 *
 * Two modes:
 *   { token: string }                          -- one-click unsubscribe from email link
 *   { walletAddress: string, channel: 'push' | 'email' }  -- preference page
 */

import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvSet, kvKeys, SUB_KEY, PERIOD_KEY, kvSRem } from "../_lib/kv";
import type { SubscriptionRecord } from "@/app/types/notifications";

function isActive(record: SubscriptionRecord): boolean {
  // A subscription is active if it has at least one channel enabled.
  return !!(record.push || record.email);
}

async function removeFromPeriodIndex(walletAddress: string, period: string) {
  if (!period) return;
  const key = PERIOD_KEY(period);
  await kvSRem(key, walletAddress);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      token?: string;
      walletAddress?: string;
      channel?: "push" | "email";
    };

    // └ Token-based unsubscribe (from email link) ——
    if (body.token) {
      const keys = await kvKeys("notif:sub:*");
      for (const key of keys) {
        const record = await kvGet<SubscriptionRecord>(key);
        if (record?.email?.unsubscribeToken === body.token) {
          const walletAddress = record.walletAddress;
          const period = record.period;
          const updated: SubscriptionRecord = { ...record, email: undefined };
          await kvSet(key, updated);
          if (!isActive(updated)) {
            await removeFromPeriodIndex(walletAddress, period);
          }
          return NextResponse.json({ ok: true }, { status: 200 });
        }
      }
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

    // ⟔ Wallet + channel unsubscribe (preference page) ——
    if (body.walletAddress && body.channel) {
      const record = await kvGet<SubscriptionRecord>(SUBKEY(body.walletAddress));
      if (!record) {
        return NextResponse.json({ error: "No subscription found" }, { status: 404 });
      }

      const updated: SubscriptionRecord =
        body.channel === "push"
          ? { ...record, push: undefined }
          : { ...record, email: undefined };

      await kvSet(SUBKEY(body.walletAddress), updated);
      if (!isActive(updated)) {
        await removeFromPeriodIndex(body.walletAddress, record.period);
      }
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    return NextResponse.json(
      { error: "Provide either token or walletAddress+channel" },
      { status: 400 },
    );
  } catch (err) {
    console.error("[POST /api/notifications/unsubscribe]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
