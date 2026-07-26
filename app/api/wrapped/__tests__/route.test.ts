import { NextRequest } from "next/server";
import { GET } from "../route";
import { indexAccount } from "@/app/services/indexerService";

// Mock the indexerService
jest.mock("@/app/services/indexerService", () => ({
  indexAccount: jest.fn(),
}));

const mockIndexAccount = indexAccount as jest.Mock;

describe("/api/wrapped", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const validAccountId = "GABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABC";

  it("returns 404 with network guidance when indexer returns not-found (mainnet)", async () => {
    // Arrange: Mock indexer to simulate a 'not found' failure response
    mockIndexAccount.mockRejectedValueOnce({
      message: "Not Found",
      statusCode: 404,
    });

    const req = new NextRequest(
      `http://localhost/api/wrapped?accountId=${validAccountId}&network=mainnet`
    );

    // Act: Invoke the route handler
    const res = await GET(req);
    const body = await res.json();

    // Assert: Check status code and guidance text
    expect(res.status).toBe(404);
    expect(body.error).toBe("Account not found on this network");
    expect(body.details).toBe(
      "Make sure you selected the correct network (mainnet/testnet) where the account exists"
    );
  });

  it("does not leak raw upstream error details in the response body", async () => {
    // Arrange: Include raw upstream details in the thrown error
    mockIndexAccount.mockRejectedValueOnce({
      message: "not found in indexer database",
      statusCode: 404,
      stack: "Error: not found\n    at indexAccount (...)",
      rawResponse: { rawData: "secret_stuff" },
      internalCode: 5678,
    });

    const req = new NextRequest(
      `http://localhost/api/wrapped?accountId=${validAccountId}&network=mainnet`
    );

    // Act: Invoke the route handler
    const res = await GET(req);
    const body = await res.json();

    // Assert: Check status code and ensure no details leaked
    expect(res.status).toBe(404);
    
    // Explicitly check for absence of leaked fields
    expect(body.stack).toBeUndefined();
    expect(body.rawResponse).toBeUndefined();
    expect(body.internalCode).toBeUndefined();
    
    // Check that it exactly matches the expected safe shape
    expect(body).toEqual({
      error: "Account not found on this network",
      details: "Make sure you selected the correct network (mainnet/testnet) where the account exists"
    });
  });

  it("returns 404 with network guidance when indexer returns not-found (testnet)", async () => {
    // Arrange: Mock indexer to simulate a 'not found' failure response
    mockIndexAccount.mockRejectedValueOnce({
      message: "Not Found",
      statusCode: 404,
    });

    const req = new NextRequest(
      `http://localhost/api/wrapped?accountId=${validAccountId}&network=testnet`
    );

    // Act: Invoke the route handler
    const res = await GET(req);
    const body = await res.json();

    // Assert: Check status code and guidance text for testnet
    expect(res.status).toBe(404);
    expect(body.error).toBe("Account not found on this network");
    expect(body.details).toBe(
      "Make sure you selected the correct network (mainnet/testnet) where the account exists"
    );
  });
});
