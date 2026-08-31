"use client";

import { ThemeProvider } from "./context/ThemeContext";
import { OfflineBanner } from "./components/OfflineBanner";
import { OfflineWrapHydrator } from "./components/OfflineWrapHydrator";
import { PwaInstallPrompt } from "./components/PwaInstallPrompt";
import { ServiceWorkerManager } from "./components/ServiceWorkerManager";
import { initWalletKit } from "./utils/walletKit";
import { useEffect } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
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
