"use client";

import { ThemeProvider } from "./context/ThemeContext";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ServiceWorkerManager } from "./components/ServiceWorkerManager";
import { OfflineWrapHydrator } from "./components/OfflineWrapHydrator";
import { OfflineBanner } from "./components/OfflineBanner";
import { PwaInstallPrompt } from "./components/PwaInstallPrompt";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Dynamically import walletKit so that stellar-sdk and
    // @creit-tech/stellar-wallets-kit are NOT included in the initial
    // landing-page bundle.  They are only loaded here, client-side, after
    // the user's first interaction with the app.
    if (typeof window !== "undefined") {
      import("./utils/walletKit").then(({ initWalletKit }) => {
        initWalletKit();
      });
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
