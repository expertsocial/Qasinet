import React, { useState } from "react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

interface AmountSelectorProps {
  value: number;
  onChange: (amount: number) => void;
  minAmount?: number;
  maxAmount?: number;
  presets?: number[];
  className?: string;
}

export function AmountSelector({
  value,
  onChange,
  minAmount = 5,
  maxAmount = 10000,
  presets = [50, 100, 200, 500, 1000],
  className,
}: AmountSelectorProps) {
  const [customAmount, setCustomAmount] = useState<string>(value > 0 ? value.toString() : "");
  
  const isCustomActive = !presets.includes(value) && value > 0;

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, ""); // Only digits
    setCustomAmount(raw);
    
    if (raw) {
      onChange(parseInt(raw, 10));
    } else {
      onChange(0);
    }
  };

  const error = value > 0 && (value < minAmount || value > maxAmount) 
    ? `Amount must be between KES ${minAmount} and KES ${maxAmount}`
    : null;

  return (
    <div className={cn("space-y-4", className)}>
      <label className="text-sm font-medium text-foreground">Select Amount</label>
      
      <div className="flex flex-wrap gap-3">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => {
              setCustomAmount(preset.toString());
              onChange(preset);
            }}
            className={cn(
              "px-6 py-3 rounded-full text-sm font-semibold transition-all duration-200 border",
              value === preset
                ? "bg-primary text-primary-foreground border-primary shadow-md ring-2 ring-primary/20"
                : "bg-card text-foreground border-border/50 hover:border-primary/50"
            )}
          >
            KES {preset}
          </button>
        ))}
      </div>

      <div className="relative mt-4">
        <label className="text-sm text-muted-foreground mb-2 block">Or enter custom amount</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
            KES
          </span>
          <Input
            type="text"
            inputMode="numeric"
            value={customAmount}
            onChange={handleCustomChange}
            className={cn(
              "pl-14 text-lg h-14",
              error && "border-destructive focus-visible:ring-destructive/20",
              isCustomActive && !error && "border-primary ring-1 ring-primary"
            )}
            placeholder="0"
          />
        </div>
        {error && (
          <p className="mt-2 text-sm text-destructive font-medium animate-in slide-in-from-top-1">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
