"use client";

import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export type Network = "Safaricom" | "Airtel" | "Telkom" | "Equitel" | "Faiba";

interface NetworkOption {
  id: Network;
  name: string;
  logoSrc: string;
}

const networks: NetworkOption[] = [
  { id: "Safaricom", name: "Safaricom", logoSrc: "/logos/safaricom-logo.png" },
  { id: "Airtel", name: "Airtel", logoSrc: "/logos/airtel-logo.jpg" },
  { id: "Telkom", name: "Telkom", logoSrc: "/logos/telcom-logo.png" },
  { id: "Equitel", name: "Equitel", logoSrc: "/logos/equitel-logo.jpg" },
  { id: "Faiba", name: "Faiba", logoSrc: "/logos/faiba-logo.png" },
];

interface NetworkSelectorProps {
  selectedNetwork: Network | null;
  onSelect: (network: Network) => void;
  className?: string;
}

export function NetworkSelector({ selectedNetwork, onSelect, className }: NetworkSelectorProps) {
  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3", className)}>
      {networks.map((network) => {
        const isSelected = selectedNetwork === network.id;
        
        return (
          <button
            key={network.id}
            type="button"
            onClick={() => onSelect(network.id)}
            className={cn(
              "relative flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-200",
              "hover:border-primary/50 hover:shadow-md",
              isSelected 
                ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary" 
                : "border-border/50 bg-card"
            )}
          >
            <div className="w-12 h-12 mb-3 relative flex items-center justify-center bg-white rounded-lg p-1">
              <Image 
                src={network.logoSrc} 
                alt={network.name} 
                fill 
                sizes="48px"
                className="object-contain p-1" 
              />
            </div>
            <span className={cn(
              "text-sm font-medium",
              isSelected ? "text-primary" : "text-foreground"
            )}>
              {network.name}
            </span>
            
            {/* Active indicator dot */}
            {isSelected && (
              <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
            )}
          </button>
        );
      })}
    </div>
  );
}
