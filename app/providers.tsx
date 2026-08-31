"use client";

import { type ReactNode, useEffect } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { ServiceWorkerManager } from "./components/ServiceWorkerManager";
import { OfflineWrapHydrator } from "./components/OfflineWrapHydrator";
import { OfflineBanner } from "./components/OfflineBanner";
import { PwaInstallPrompt } from "./components/PwaInstallPrompt";

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Prefetch (not initialize — that needs a network/projectId only known
    // at actual connect time, see app/utils/walletConnectManager.ts) the
    // wallet-kit modules so stellar-sdk and @creit-tech/stellar-wallets-kit
    // are NOT included in the initial landing-page bundle, but are already
    // warm in the browser's module cache by the time the user first
    // interacts with a connect action.
    if (typeof window !== "undefined") {
      void import("@creit-tech/stellar-wallets-kit/sdk");
      void import("@creit-tech/stellar-wallets-kit/modules/wallet-connect");
    }
  }, []);

  return (
    <ThemeProvider>
      <ServiceWorkerManager />
      <OfflineWrapHydrator />
      <OfflineBanner />
      {children}
      <PwaInstallPrompt />
    </ThemeProvider>
  );
}
