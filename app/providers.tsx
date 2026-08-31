"use client";

import { useEffect } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { ServiceWorkerManager } from "./components/ServiceWorkerManager";
import { OfflineWrapHydrator } from "./components/OfflineWrapHydrator";
import { OfflineBanner } from "./components/OfflineBanner";
import { PwaInstallPrompt } from "./components/PwaInstallPrompt";
import { initWalletKit } from "./utils/walletKit";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Dynamically import walletKit so that stellar-sdk and
    // @creit-tech/stellar-wallets-kit are NOT included in the initial
    // landing-page bundle. They are only loaded here, client-side, after
    // the user's first interaction with the app.
    if (typeof window !== "undefined") {
      initWalletKit();
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
