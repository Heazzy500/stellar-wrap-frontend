import { NextRequest } from "next/server";
import { GET } from "../route";

// Mock the indexer to isolate route logic
jest.mock("@/app/services/indexerServer", () => ({
  indexAccount: jest.fn().mockResolvedValue({
    result: { success: true },
    fromCache: false,
    cacheTimestamp: Date.now(),
    refreshingInBackground: false,
  }),
}));

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
    // Valid Stellar public key
    const validAccountId = "GB3K3MUDMFEVFTY3ZZW7MOM62G3BYVZZN4MHTI6M2U7J3H4T4Z4Q3G6I";
    const req = createRequest(`/api/wrapped?accountId=${validAccountId}`);
    const response = await GET(req);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
