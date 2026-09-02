import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface ProviderOption {
  id: string;
  name: string;
  logoSrc: string;
}

interface ProviderSelectorProps {
  providers: ProviderOption[];
  selectedProviderId: string | null;
  onSelect: (providerId: string) => void;
  className?: string;
}

export function ProviderSelector({ providers, selectedProviderId, onSelect, className }: ProviderSelectorProps) {
  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4", className)}>
      {providers.map((provider) => {
        const isSelected = selectedProviderId === provider.id;
        
        return (
          <button
            key={provider.id}
            type="button"
            onClick={() => onSelect(provider.id)}
            className={cn(
              "relative flex flex-col items-center justify-center p-5 rounded-2xl border transition-all duration-200",
              "hover:border-primary/50 hover:shadow-md",
              isSelected 
                ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary" 
                : "border-border/50 bg-card"
            )}
          >
            <div className="w-16 h-16 mb-4 relative flex items-center justify-center bg-white rounded-xl p-2">
              <Image 
                src={provider.logoSrc} 
                alt={provider.name} 
                fill 
                sizes="64px"
                className="object-contain p-2" 
              />
            </div>
            <span className={cn(
              "text-sm font-semibold text-center",
              isSelected ? "text-primary" : "text-foreground"
            )}>
              {provider.name}
            </span>
            
            {/* Active indicator dot */}
            {isSelected && (
              <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-primary" />
            )}
          </button>
        );
      })}
    </div>
  );
}
