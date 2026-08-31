"use client";

import { ThemeProvider } from "./context/ThemeContext";
import { useEffect } from "react";
import { initWalletKit } from "./utils/walletKit";
import { GlobalToaster } from "@/app/components/GlobalToaster";

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
      <GlobalToaster />
    </ThemeProvider>
  );
}
