"use client";

import React, { useState } from "react";
import { X, Copy, Check, ExternalLink, Zap, ShieldCheck } from "lucide-react";
import { sounds } from "@/lib/sounds";

export function FloatTopUpModal({
  isOpen,
  onClose,
  currentFloat,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentFloat: number;
}) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    sounds.playTap();
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl shadow-emerald-950/40 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-neutral-800 flex items-center justify-between bg-gradient-to-r from-emerald-950/30 via-neutral-900 to-neutral-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Kyanda Float Quick Top-Up</h3>
              <p className="text-xs text-neutral-400">Current Balance: <span className="font-semibold text-emerald-400">KES {currentFloat.toLocaleString()}</span></p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top-up Instruction Steps */}
        <div className="p-6 space-y-5">
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
            <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Direct M-Pesa Paybill Method (Instant)
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Paybill */}
              <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                <div className="text-[11px] text-neutral-500">Paybill Number</div>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono text-base font-bold text-white">400200</span>
                  <button
                    onClick={() => copyToClipboard("400200", "paybill")}
                    className="text-neutral-400 hover:text-emerald-400 transition-colors p-1"
                  >
                    {copiedField === "paybill" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Account */}
              <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                <div className="text-[11px] text-neutral-500">Account Number</div>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono text-base font-bold text-white">qasinet</span>
                  <button
                    onClick={() => copyToClipboard("qasinet", "account")}
                    className="text-neutral-400 hover:text-emerald-400 transition-colors p-1"
                  >
                    {copiedField === "account" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Step Guide */}
          <div className="space-y-2 text-xs text-neutral-400 pl-1">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">1</span>
              <span>Open Safaricom M-Pesa on your mobile phone.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">2</span>
              <span>Select <strong>Lipa na M-Pesa &gt; Paybill</strong>. Enter <strong>400200</strong>.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">3</span>
              <span>Account Number: <strong>qasinet</strong>. Enter amount and M-Pesa PIN.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">4</span>
              <span>Your Kyanda float balance will update in 1-2 minutes automatically.</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2">
            <a
              href="https://kyanda.com/login"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-emerald-400 transition-colors font-medium"
            >
              Open Kyanda Portal
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-emerald-600/20"
            >
              Done / Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
