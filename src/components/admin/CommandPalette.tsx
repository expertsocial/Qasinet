"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Command,
  ArrowRight,
  Zap,
  TrendingUp,
  FileSpreadsheet,
  Layers,
  Settings,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles
} from "lucide-react";
import { sounds } from "@/lib/sounds";

interface SearchResult {
  id: string;
  reference: string;
  service: string;
  amount: number;
  recipient: string;
  status: string;
  token?: string;
  date: string;
}

export function CommandPalette({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const quickNav = [
    { label: "Executive Dashboard", href: "/admin", icon: TrendingUp, tag: "View" },
    { label: "Kyanda Float & Top-Up", href: "/admin/kyanda", icon: Zap, tag: "Gateway" },
    { label: "Financial Reports (CSV)", href: "/admin/reports", icon: FileSpreadsheet, tag: "Export" },
    { label: "Services & Pricing Models", href: "/admin/services", icon: Layers, tag: "Configure" },
    { label: "System Settings", href: "/admin/settings", icon: Settings, tag: "System" },
  ];

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      sounds.playTap();
    } else {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  // Live search debounced
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
        }
      } catch (err) {
        console.error("Search fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const total = results.length > 0 ? results.length : quickNav.length;
        setSelectedIndex((prev) => (prev + 1) % total);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const total = results.length > 0 ? results.length : quickNav.length;
        setSelectedIndex((prev) => (prev - 1 + total) % total);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (results.length > 0 && results[selectedIndex]) {
          handleSelect(`/admin/transactions/${results[selectedIndex].id}`);
        } else if (results.length === 0 && quickNav[selectedIndex]) {
          handleSelect(quickNav[selectedIndex].href);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  const handleSelect = (url: string) => {
    sounds.playTap();
    onClose();
    router.push(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 px-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl shadow-emerald-950/30 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="flex items-center px-4 py-3.5 border-b border-neutral-800 gap-3 bg-neutral-950/60">
          <Search className="w-5 h-5 text-emerald-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search transactions by reference, phone number, token, or jump to page..."
            className="w-full bg-transparent text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none"
          />
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />
          ) : query ? (
            <button 
              onClick={() => setQuery("")}
              className="text-neutral-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
              ESC to exit
            </span>
          )}
        </div>

        {/* Results Body */}
        <div className="max-h-[60vh] overflow-y-auto p-2 divide-y divide-neutral-800/40">
          {/* Live Search Matches */}
          {results.length > 0 && (
            <div className="space-y-1 py-1">
              <div className="px-3 py-1 text-[11px] font-semibold tracking-wider uppercase text-emerald-400/80 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Matching Transactions ({results.length})
              </div>
              {results.map((res, idx) => (
                <div
                  key={res.id}
                  onClick={() => handleSelect(`/admin/transactions/${res.id}`)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                    selectedIndex === idx 
                      ? "bg-emerald-500/10 border border-emerald-500/30 text-white" 
                      : "hover:bg-neutral-800/60 text-neutral-300 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center shrink-0">
                      {res.status === "SUCCESS" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-white truncate">
                          {res.reference}
                        </span>
                        <span className="text-[11px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400">
                          {res.service}
                        </span>
                      </div>
                      <div className="text-xs text-neutral-400 truncate">
                        Recipient: <span className="text-neutral-200">{res.recipient}</span>
                        {res.token && (
                          <span className="ml-2 font-mono text-emerald-400">Token: {res.token.substring(0, 8)}...</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-semibold text-white">KES {res.amount}</div>
                      <div className={`text-[10px] font-bold ${
                        res.status === 'SUCCESS' ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        {res.status}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-neutral-500" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No matches warning */}
          {query.trim().length >= 2 && !isLoading && results.length === 0 && (
            <div className="p-8 text-center text-neutral-500 text-sm">
              No transactions matching "{query}". Try a phone number, reference, or meter number.
            </div>
          )}

          {/* Quick Navigation Commands */}
          {(!query || results.length === 0) && (
            <div className="space-y-1 py-1">
              <div className="px-3 py-1 text-[11px] font-semibold tracking-wider uppercase text-neutral-500 flex items-center gap-1.5">
                <Command className="w-3.5 h-3.5" />
                Quick Navigation & Actions
              </div>
              {quickNav.map((item, idx) => {
                const Icon = item.icon;
                const isSelected = selectedIndex === idx;
                return (
                  <div
                    key={item.href}
                    onClick={() => handleSelect(item.href)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? "bg-emerald-500/10 border border-emerald-500/30 text-white"
                        : "hover:bg-neutral-800/60 text-neutral-300 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-300">
                        <Icon className="w-4 h-4 text-emerald-400" />
                      </div>
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700">
                        {item.tag}
                      </span>
                      <ArrowRight className="w-4 h-4 text-neutral-500" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-neutral-950/80 border-t border-neutral-800 flex items-center justify-between text-[11px] text-neutral-500">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">↑</kbd> <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">↓</kbd> to navigate</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">↵</kbd> to select</span>
          </div>
          <div className="text-emerald-400 font-medium">QasiNet Command v2.0</div>
        </div>
      </div>
    </div>
  );
}
