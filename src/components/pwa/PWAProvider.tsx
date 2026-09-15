"use client";

import React, { useEffect, useState } from "react";
import { useOffline } from "@/lib/offline/use-offline";
import { WifiOff, Download, X, RefreshCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface PWAProviderProps {
  children: React.ReactNode;
}

export function PWAProvider({ children }: PWAProviderProps) {
  const { isOffline, isInstallable, installPWA, pendingOrdersCount, syncNow } = useOffline();
  const [showInstallTip, setShowInstallTip] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return !localStorage.getItem("qasinet_pwa_install_tip_dismissed");
    } catch {
      return false;
    }
  });
  const [isSyncing, setIsSyncing] = useState(false);

  // Register Service Worker safely on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            // Check for updates periodically
            reg.update().catch(() => {});
          })
          .catch((err) => {
            console.warn("[PWA] Service Worker registration failed:", err);
          });
      });
    }
  }, []);

  const handleDismissTip = () => {
    setShowInstallTip(false);
    try {
      localStorage.setItem("qasinet_pwa_install_tip_dismissed", "true");
    } catch {
      // Ignore
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await syncNow();
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <>
      {/* Offline Status Banner */}
      {isOffline && (
        <div className="fixed top-0 inset-x-0 z-50 bg-amber-500/95 backdrop-blur text-neutral-950 px-4 py-2.5 shadow-md flex items-center justify-between text-xs sm:text-sm font-semibold transition-transform animate-in slide-in-from-top-full duration-300">
          <div className="flex items-center gap-2 max-w-4xl mx-auto w-full justify-between">
            <div className="flex items-center gap-2 truncate">
              <span className="p-1 bg-neutral-950/10 rounded-lg">
                <WifiOff className="w-4 h-4 text-neutral-950 animate-pulse flex-shrink-0" />
              </span>
              <span className="truncate">
                <strong>Offline Mode:</strong> Zero data? You can still browse bundles and pay via M-Pesa.
                {pendingOrdersCount > 0 && (
                  <span className="ml-1 font-bold underline">({pendingOrdersCount} queued order awaiting signal)</span>
                )}
              </span>
            </div>

            {pendingOrdersCount > 0 && (
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="flex items-center gap-1.5 bg-neutral-950 text-amber-400 px-3 py-1 rounded-full text-xs font-bold hover:bg-neutral-900 transition-colors flex-shrink-0 ml-2"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
                <span>Retry Sync</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Proactive First-Time Visitor Install Prompt */}
      {!isOffline && isInstallable && showInstallTip && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40 bg-neutral-900/95 border border-emerald-500/30 text-foreground p-4 rounded-3xl shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 flex-shrink-0">
              <Zap className="w-5 h-5" />
            </div>

            <div className="space-y-1 text-left flex-grow">
              <div className="text-sm font-bold text-emerald-400">Install QasiNet for 0.00 MB Access</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Add QasiNet to your home screen now so you can always open it and buy bundles even when your data balance drops to 0.00 MB.
              </p>
              <div className="pt-2 flex items-center gap-2">
                <Button
                  onClick={installPWA}
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-xl h-8 px-3 gap-1.5 shadow-md shadow-emerald-500/20"
                >
                  <Download className="w-3.5 h-3.5" /> Install App
                </Button>
                <button
                  onClick={handleDismissTip}
                  className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 transition-colors"
                >
                  Maybe later
                </button>
              </div>
            </div>

            <button
              onClick={handleDismissTip}
              className="text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors flex-shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {children}
    </>
  );
}
