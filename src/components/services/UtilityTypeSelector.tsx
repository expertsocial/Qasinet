import React from "react";
import { cn } from "@/lib/utils";

export type UtilityType = "Prepaid" | "Postpaid";

interface UtilityTypeSelectorProps {
  value: UtilityType;
  onChange: (value: UtilityType) => void;
  className?: string;
}

export function UtilityTypeSelector({ value, onChange, className }: UtilityTypeSelectorProps) {
  return (
    <div className={cn("p-1.5 bg-secondary/50 rounded-2xl flex", className)}>
      <button
        type="button"
        onClick={() => onChange("Prepaid")}
        className={cn(
          "flex-1 py-3 text-sm font-semibold rounded-xl transition-all duration-200",
          value === "Prepaid"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Prepaid
      </button>
      <button
        type="button"
        onClick={() => onChange("Postpaid")}
        className={cn(
          "flex-1 py-3 text-sm font-semibold rounded-xl transition-all duration-200",
          value === "Postpaid"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Postpaid
      </button>
    </div>
  );
}
