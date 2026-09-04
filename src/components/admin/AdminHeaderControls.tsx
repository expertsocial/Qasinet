"use client";

import React, { useState, useEffect } from "react";
import { Search, Zap } from "lucide-react";
import { CommandPalette } from "./CommandPalette";
import { SoundToggle } from "./LiveSoundAlerts";
import { FloatTopUpModal } from "./FloatTopUpModal";

export function AdminHeaderControls({ userInitials }: { userInitials: string }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [topUpOpen, setTopUpOpen] = useState(false);

  // Global Ctrl+K / Cmd+K shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Search Bar / Command Palette Trigger */}
        <button
          onClick={() => setPaletteOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white text-xs transition-all shadow-inner group"
        >
          <Search className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
          <span className="hidden md:inline">Quick Search...</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-neutral-950 text-[10px] font-mono text-neutral-500 border border-neutral-800">
            ⌘K
          </kbd>
        </button>

        {/* Float Quick Top Up */}
        <button
          onClick={() => setTopUpOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-xs font-semibold transition-colors"
        >
          <Zap className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Top-Up Float</span>
        </button>

        {/* Audio Alerts Toggle */}
        <SoundToggle />

        {/* User Profile Avatar */}
        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-emerald-500/20 shrink-0">
          {userInitials}
        </div>
      </div>

      {/* Global Modals */}
      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <FloatTopUpModal isOpen={topUpOpen} onClose={() => setTopUpOpen(false)} currentFloat={0} />
    </>
  );
}
