import Redis from "ioredis";
const redis = new Redis();
(async () => {
  for await (const key of redis.scanIterator({ match: "notif:sub:*" })) {
    const raw = await redis.get(key);
    if (!raw) continue;
    const { period } = JSON.parse(raw) as { period?: string };
    if (period) await redis.sadd(`notif:period:${period}`, key.slice("notif:sub:".length));
  }
  await redis.quit();
})();