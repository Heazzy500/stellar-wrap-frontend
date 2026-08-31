/**
 * POST /api/notifications/unsubscribe
 *
 * Two modes:
 *   { token: string }                          — one-click unsubscribe from email link
 *   { walletAddress: string, channel: 'push' | 'email' }  — preference page
 */

import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvSet, kvKeys, SUB_KEY } from "../_lib/kv";
import { logger } from "@/app/utils/logger";
import type { SubscriptionRecord } from "@/app/types/notifications";

const log = logger.child("api:unsubscribe");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      token?: string;
      walletAddress?: string;
      channel?: "push" | "email";
    };

    // ── Token-based unsubscribe (from email link) ──────────────────────────
    if (body.token) {
      const keys = await kvKeys("notif:sub:*");
      for (const key of keys) {
        const record = await kvGet<SubscriptionRecord>(key);
        if (record?.email?.unsubscribeToken === body.token) {
          const updated: SubscriptionRecord = { ...record, email: undefined };
          await kvSet(key, updated);
          return NextResponse.json({ ok: true }, { status: 200 });
        }
      }
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

    // ── Wallet + channel unsubscribe (preference page) ─────────────────────
    if (body.walletAddress && body.channel) {
      const record = await kvGet<SubscriptionRecord>(SUB_KEY(body.walletAddress));
      if (!record) {
        return NextResponse.json({ error: "No subscription found" }, { status: 404 });
      }

      const updated: SubscriptionRecord =
        body.channel === "push"
          ? { ...record, push: undefined }
          : { ...record, email: undefined };

      await kvSet(SUB_KEY(body.walletAddress), updated);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    return NextResponse.json(
      { error: "Provide either token or walletAddress+channel" },
      { status: 400 },
    );
  } catch (err) {
    log.error("Internal error processing unsubscribe:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
