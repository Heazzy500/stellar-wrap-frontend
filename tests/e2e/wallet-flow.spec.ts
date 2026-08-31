import { test, expect } from "@playwright/test";
import mockData from "../fixtures/horizon-mocks.json";
import { mockFreighter, mockWalletAndIndexer } from "./mockDependencies";

test.describe("Connect flow guards", () => {
  test.beforeEach(async ({ page }) => {
    await mockWalletAndIndexer(page);
  });

  test("invalid address shows validation error", async ({ page }) => {
    await page.goto("/connect");

    const addressInput = page.locator('input[placeholder*="Stellar address" i]');
    await addressInput.fill(mockData.invalidAddress);
    await expect(page.getByText(/invalid address length/i)).toBeVisible();
  });
});

test.describe("Freighter wallet connection flow", () => {
  test("connects with mocked Freighter and uses bounded Horizon preview calls", async ({
    page,
  }) => {
    const rpcCounters = { account: 0, transactions: 0, operations: 0 };

    await mockFreighter(page, { address: mockData.validAddress });
    await mockWalletAndIndexer(page, {
      balance: "1234.5678901",
      operationAmount: "987.6543210",
      counters: rpcCounters,
    });

    await page.goto("/connect");
    await page
      .getByRole("button", { name: /connect with freighter wallet/i })
      .click();

    await expect(page.getByText("ACCOUNT SUMMARY")).toBeVisible();
    await expect(page.getByText("1234.5678901 XLM")).toBeVisible();
    await expect(page.getByText("Total Operations")).toBeVisible();
    await expect(page.getByText("1", { exact: true })).toBeVisible();

    expect(rpcCounters.account).toBe(1);
    expect(rpcCounters.transactions).toBe(1);
    expect(rpcCounters.operations).toBe(0);

    await page.getByRole("button", { name: /^continue$/i }).click();
    await expect(page).toHaveURL(/\/loading(?:$|[?#/])/);
  });

  test("displays a clear rejection error when Freighter access is denied", async ({
    page,
  }) => {
    await mockFreighter(page, {
      address: mockData.validAddress,
      rejectAccess: true,
    });
    await mockWalletAndIndexer(page);

    await page.goto("/connect");
    await page
      .getByRole("button", { name: /connect with freighter wallet/i })
      .click();

    await expect(
      page.getByText(/connection rejected\. please approve the connection in freighter/i),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/connect(?:$|[?#/])/);
  });

  test("keeps the UI stable while wallet preview RPC is slow", async ({
    page,
  }) => {
    await mockFreighter(page, { address: mockData.validAddress });
    await mockWalletAndIndexer(page, { delayMs: 750 });

    await page.goto("/connect");
    await page
      .getByRole("button", { name: /connect with freighter wallet/i })
      .click();

    await expect(page.getByText("ACCOUNT SUMMARY")).toBeVisible();
    await expect(page.getByText("1000.0000000 XLM")).toBeVisible();
    await expect(page).toHaveURL(/\/connect(?:$|[?#/])/);
  });

  test("falls back to an empty preview instead of crashing on RPC timeout", async ({
    page,
  }) => {
    await mockFreighter(page, { address: mockData.validAddress });
    await mockWalletAndIndexer(page, { failAccountPreview: true });

    await page.goto("/connect");
    await page
      .getByRole("button", { name: /connect with freighter wallet/i })
      .click();

    await expect(page.getByText("ACCOUNT SUMMARY")).toBeVisible();
    await expect(page.getByText("0 XLM")).toBeVisible();
    await expect(page.getByText("Total Operations")).toBeVisible();
    await expect(page).toHaveURL(/\/connect(?:$|[?#/])/);
  });
});
