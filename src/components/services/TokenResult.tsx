"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, Copy, Check, Share2, Printer, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import confetti from "canvas-confetti";
import { sounds } from "@/lib/sounds";

interface TokenResultProps {
  token: string;
  units: number;
  amount: number;
  meterNumber?: string;
  customerName?: string;
}

export function TokenResult({ token, units, amount, meterNumber, customerName }: TokenResultProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Blast festive confetti on token delivery
    sounds.playSuccessChime();
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b']
      });
    } catch (e) {
      // ignore
    }
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(token.replace(/\s/g, ""));
    sounds.playTap();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const rawToken = token.replace(/\s/g, "");
    const formatted = rawToken.replace(/(.{4})/g, "$1 ").trim();
    const text = `💡 KPLC Prepaid Token: *${formatted}*\nUnits: *${units} kWh*\nAmount: *KES ${amount}*${meterNumber ? `\nMeter: *${meterNumber}*` : ''}\n\nPowered by QasiNet.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  // Format token into chunks of 4 for readability
  const formattedToken = token.replace(/\s/g, "").replace(/(.{4})/g, "$1 ").trim();

  return (
    <div className="bg-card border border-border/50 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 animate-in fade-in zoom-in-95 duration-500 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground">Electricity Token Ready</h3>
            <p className="text-xs text-muted-foreground">{customerName ? `Account: ${customerName}` : 'Token generated successfully'}</p>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Vended
        </span>
      </div>
      
      {/* High Contrast Token Box */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 text-center space-y-4 shadow-inner relative">
        <p className="text-xs text-neutral-400 uppercase tracking-widest font-semibold">20-Digit Prepaid Token</p>
        <div className="text-2xl sm:text-3xl md:text-4xl font-mono font-black tracking-widest text-emerald-400 select-all">
          {formattedToken}
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCopy}
            className="gap-2 bg-neutral-900 border-neutral-800 hover:bg-neutral-800 text-neutral-200"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied to Clipboard!" : "Copy Token"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleWhatsAppShare}
            className="gap-2 bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
          >
            <Share2 className="w-4 h-4" />
            Share via WhatsApp
          </Button>
        </div>
      </div>
      
      {/* Units & Amount Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-secondary/30 rounded-2xl border border-border/50 text-center">
          <p className="text-xs text-muted-foreground mb-1 font-medium">Power Units</p>
          <p className="font-extrabold text-xl text-foreground">{units} <span className="text-sm font-normal text-muted-foreground">kWh</span></p>
        </div>
        <div className="p-4 bg-secondary/30 rounded-2xl border border-border/50 text-center">
          <p className="text-xs text-muted-foreground mb-1 font-medium">Amount Paid</p>
          <p className="font-extrabold text-xl text-emerald-400">KES {amount.toLocaleString()}</p>
        </div>
      </div>

      {meterNumber && (
        <div className="text-center text-xs text-muted-foreground pt-1">
          Meter Number: <span className="font-mono font-semibold text-foreground">{meterNumber}</span>
        </div>
      )}
    </div>
  );
}
