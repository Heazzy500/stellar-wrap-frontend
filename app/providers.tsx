"use client";

import { ThemeProvider } from "./context/ThemeContext";
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * React Query client configured for Stellar asset caching.
 * - staleTime: 10 minutes (asset metadata is stable data)
 * - gcTime: 30 minutes (keep in memory after unmount)
 * - retry: 2 with exponential backoff for network resilience
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        retry: 2,
        refetchOnWindowFocus: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always make a new query client
    return makeQueryClient();
  }
  // Browser: make a new query client if we don't already have one.
  // This is important so we don't re-make a new client if React
  // suspends during the initial render.
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(getQueryClient);

  useEffect(() => {
    // Dynamically import walletKit so that stellar-sdk and
    // @creit-tech/stellar-wallets-kit are NOT included in the initial
    // landing-page bundle.  They are only loaded here, client-side, after
    // the user's first interaction with the app.
    if (typeof window !== "undefined") {
      initWalletKit();
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ServiceWorkerManager />
        <OfflineWrapHydrator />
        <OfflineBanner />
        {children}
        <PwaInstallPrompt />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
