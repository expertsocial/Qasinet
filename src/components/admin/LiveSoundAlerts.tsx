"use client";

import React, { useState, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { sounds } from "@/lib/sounds";

export function SoundToggle() {
  const [isMuted, setIsMuted] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsMuted(sounds.getIsMuted());
  }, []);

  const handleToggle = () => {
    const newState = sounds.toggleMute();
    setIsMuted(newState);
    if (!newState) {
      sounds.playSuccessChime();
    }
  };

  if (!mounted) return null;

  return (
    <button
      onClick={handleToggle}
      title={isMuted ? "Unmute Operations Audio Alerts" : "Mute Operations Audio Alerts"}
      className={`h-8 w-8 rounded-full border flex items-center justify-center transition-all ${
        isMuted
          ? "bg-neutral-900 border-neutral-800 text-neutral-500 hover:text-neutral-300"
          : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
      }`}
    >
      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
    </button>
  );
}
