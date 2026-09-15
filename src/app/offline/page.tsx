"use client";

import React from "react";
import Link from "next/link";
import { WifiOff, RefreshCw, Smartphone, Zap, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function OfflinePage() {
  const handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-xl w-full text-center space-y-6">
        
        {/* Offline Icon Header */}
        <div className="inline-flex p-4 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-2">
          <WifiOff className="w-10 h-10 animate-pulse" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            You Are Currently Offline
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Zero data balance? Don&apos;t worry. QasiNet is cached on your device so you can still browse bundles and buy airtime offline.
          </p>
        </div>

        {/* Offline Capabilities Card */}
        <div className="bg-card border border-border/60 rounded-3xl p-6 text-left space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
            <ShieldCheck className="w-4 h-4" /> Available Offline Services
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <Link
              href="/services/data"
              className="flex items-center justify-between p-3.5 rounded-2xl border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Data Bundles</div>
                  <div className="text-xs text-muted-foreground">Safaricom & Airtel</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/services/airtime"
              className="flex items-center justify-between p-3.5 rounded-2xl border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Instant Airtime</div>
                  <div className="text-xs text-muted-foreground">All Kenyan Telcos</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="pt-2 border-t border-border/40 text-xs text-muted-foreground leading-relaxed">
            💡 <strong className="text-foreground">How offline buying works:</strong> Select your bundle from the cached list, then dial <code className="bg-muted px-1.5 py-0.5 rounded text-emerald-400 font-mono">*334#</code> on your phone to pay via M-Pesa. Safaricom delivers the payment over GSM without using any mobile data.
          </div>
        </div>

        {/* Reload button */}
        <div className="pt-2">
          <Button
            onClick={handleReload}
            variant="outline"
            size="lg"
            className="rounded-2xl gap-2 text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" /> Check Connection & Reload
          </Button>
        </div>

      </div>
    </div>
  );
}
