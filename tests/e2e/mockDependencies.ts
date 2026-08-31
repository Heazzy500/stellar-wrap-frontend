import type { Page, Route } from "@playwright/test";

const recentTransaction = {
  id: "mock-tx-id",
  paging_token: "mock-paging-token",
  hash: "mock-hash",
  ledger: 1,
  created_at: new Date().toISOString(),
  source_account: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
  source_account_sequence: "1",
  fee_account: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
  fee_charged: "100",
  operation_count: 1,
  envelope_xdr: "",
  result_xdr: "",
  result_meta_xdr: "",
  memo_type: "none",
  signatures: [],
  valid_after: "",
  valid_before: "",
};

async function fulfillHorizon(route: Route) {
  const url = route.request().url();

  if (url.includes("/accounts/") && !url.includes("/transactions")) {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
        account_id: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
        sequence: "1",
        balances: [{ asset_type: "native", balance: "1000.0000000" }],
      }),
    });
    return;
  }

  if (url.includes("/transactions") && url.includes("/operations")) {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        _embedded: {
          records: [
            {
              id: "mock-op-id",
              paging_token: "mock-op-paging",
              type: "payment",
              type_i: 1,
              created_at: new Date().toISOString(),
              transaction_hash: recentTransaction.hash,
              source_account: recentTransaction.source_account,
              amount: "100",
              asset_type: "native",
            },
          ],
        },
      }),
    });
    return;
  }

  if (url.includes("/transactions")) {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        _embedded: { records: [recentTransaction] },
        _links: {
          self: { href: url },
        },
      }),
    });
    return;
  }

  await route.continue();
}

/** Mock Horizon responses so wallet preview and indexing stay deterministic in CI. */
export async function mockWalletAndIndexer(page: Page) {
  await page.route("**/horizon.stellar.org/**", fulfillHorizon);
  await page.route("**/horizon-testnet.stellar.org/**", fulfillHorizon);
}
