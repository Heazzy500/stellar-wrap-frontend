import { NextRequest } from "next/server";
import { GET } from "../route";
import { CACHE_TTL_MINUTES } from "@/app/utils/indexer";

// Mock the indexer to isolate route logic
jest.mock("@/app/services/indexerServer", () => ({
  indexAccount: jest.fn().mockResolvedValue({
    result: { success: true },
    fromCache: false,
    cacheTimestamp: Date.now(),
    refreshingInBackground: false,
  }),
}));

const VALID_ACCOUNT_ID = "GDRZZGQDRBLJBAY24O3EMZFDGZ4EY6A7L24OERKQTPLT4T7SZKLUAZVQ";

describe("GET /api/wrapped route validation", () => {
  const createRequest = (url: string) => {
    return new NextRequest(new URL(url, "http://localhost:3000"));
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when accountId is missing", async () => {
    const req = createRequest("/api/wrapped");
    const response = await GET(req);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Missing accountId parameter");
  });

  it("returns 400 for malformed account ID length", async () => {
    const req = createRequest("/api/wrapped?accountId=GSHORTID");
    const response = await GET(req);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("Invalid address length");
  });

  it("returns 400 for valid length but invalid checksum", async () => {
    // String is 56 chars and starts with G but fails checksum
    const invalidChecksumId = "GBDTABC1234567890123456789012345678901234567890123456789";
    const req = createRequest(`/api/wrapped?accountId=${invalidChecksumId}`);
    const response = await GET(req);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("checksum validation failed");
  });

  it("returns 400 for invalid prefix", async () => {
    const invalidPrefixId = "XBDTABC1234567890123456789012345678901234567890123456789";
    const req = createRequest(`/api/wrapped?accountId=${invalidPrefixId}`);
    const response = await GET(req);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("Stellar address must start with G");
  });

  it("processes request successfully for valid public key", async () => {
    const req = createRequest(`/api/wrapped?accountId=${VALID_ACCOUNT_ID}`);
    const response = await GET(req);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  describe("cache-control headers", () => {
    it("sets private Cache-Control on successful responses", async () => {
      const req = createRequest(`/api/wrapped?accountId=${VALID_ACCOUNT_ID}`);
      const response = await GET(req);
      expect(response.status).toBe(200);
      const cc = response.headers.get("Cache-Control");
      expect(cc).toContain("private");
      expect(cc).toContain(`max-age=${CACHE_TTL_MINUTES * 60}`);
    });

    it("sets no-store Cache-Control on 400 error responses", async () => {
      const req = createRequest("/api/wrapped");
      const response = await GET(req);
      expect(response.status).toBe(400);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
    });

    it("sets no-store Cache-Control on validation error responses", async () => {
      const req = createRequest("/api/wrapped?accountId=GSHORTID");
      const response = await GET(req);
      expect(response.status).toBe(400);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
    });

    it("includes stale-while-revalidate for successful responses", async () => {
      const req = createRequest(`/api/wrapped?accountId=${VALID_ACCOUNT_ID}`);
      const response = await GET(req);
      expect(response.status).toBe(200);
      const cc = response.headers.get("Cache-Control");
      expect(cc).toContain("stale-while-revalidate=60");
    });
  });
});
