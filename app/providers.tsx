"use client";

import { ThemeProvider } from "./context/ThemeContext";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { ServiceWorkerManager } from "./ServiceWorkerManager";
import { OfflineWrapHydrator } from "./OfflineWrapHydrator";
import { OfflineBanner } from "./OfflineBanner";
import { PwaInstallPrompt } from "./PwaInstallPrompt";

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Dynamically import walletKit so that stellar-sdk and
    // @creit-tech/stellar-wallets-kit are NOT included in the initial
    // landing-page bundle.  They are only loaded here, client-side, after
    // the user's first interaction with the app.
    if (typeof window !== "undefined") {
      import("../app/lib/walletKit")
        .then(({ initWalletKit }) => {
          initWalletKit();
        })
        .catch((error) => {
          console.error("Failed to initialize wallet kit:", error);
        });
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