"use client";

import { ThemeProvider } from "./context/ThemeContext";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { ServiceWorkerManager } from "./ServiceWorkerManager";
import { OfflineWrapHydrator } from "./OfflineWrapHydrator";
import { OfflineBanner } from "./OfflineBanner";
import { PwaInstallPrompt } from "./PwaInstallPrompt";
import { useAssetListStore, type Asset } from "./lib/assetListStore";

const ASSET_LIST_STORAGE_KEY = "assetListState_v1";

function AssetListPersistence() {
  useEffect(() => {
    // Hydrate asset list from localStorage on app load
    try {
      const stored = localStorage.getItem(ASSET_LIST_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Asset[];
        if (Array.isArray(parsed)) {
          useAssetListStore.setState({ assets: parsed });
        }
      }
    } catch (error) {
      console.error("Failed to hydrate asset list from localStorage:", error);
    }

    // Persist asset list to localStorage whenever it changes
    const unsubscribe = useAssetListStore.subscribe((state) => {
      try {
        localStorage.setItem(ASSET_LIST_STORAGE_KEY, JSON.stringify(state.assets));
      } catch (error) {
        console.error("Failed to persist asset list to localStorage:", error);
      }
    });

    return unsubscribe;
  }, []);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Dynamically import walletKit so that stellar-sdk and
    // @creit-tech/stellar-wallets-kit are NOT included in the initial
    // landing-page bundle. They are only loaded here, client-side, after
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
      <AssetListPersistence />
      {children}
      <PwaInstallPrompt />
    </ThemeProvider>
  );
}
