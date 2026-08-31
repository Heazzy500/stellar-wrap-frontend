import { test, expect } from "@playwright/test";
import mockData from "../fixtures/horizon-mocks.json";
import { mockWalletAndIndexer } from "./mockDependencies";

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
