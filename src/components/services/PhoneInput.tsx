"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { getPhoneValidationError, normalizeKenyanPhone } from "@/lib/validation";
import { AlertCircle, Smartphone, Clock, X } from "lucide-react";
import { detectCarrier } from "@/lib/carrier";
import { sounds } from "@/lib/sounds";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidationChange?: (isValid: boolean) => void;
  className?: string;
  label?: string;
}

export function PhoneInput({ 
  value, 
  onChange, 
  onValidationChange, 
  className,
  label = "Phone Number"
}: PhoneInputProps) {
  const [touched, setTouched] = useState(false);
  const [recentPhones, setRecentPhones] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("qsn_recent_phones");
      if (saved) {
        setRecentPhones(JSON.parse(saved).slice(0, 3));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const carrier = detectCarrier(value);
  const error = getPhoneValidationError(value);
  const showError = touched && error !== null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const sanitized = rawVal.replace(/(?!^\+)[^\d]/g, "");
    onChange(sanitized);
    
    if (onValidationChange) {
      onValidationChange(getPhoneValidationError(sanitized) === null);
    }
  };

  const handleBlur = () => {
    setTouched(true);
    if (value) {
      const normalized = normalizeKenyanPhone(value);
      if (normalized !== value) {
        onChange(normalized);
      }
    }
    if (onValidationChange) {
      onValidationChange(error === null);
    }
  };

  const selectRecent = (phone: string) => {
    sounds.playTap();
    onChange(phone);
    setTouched(true);
    if (onValidationChange) {
      onValidationChange(getPhoneValidationError(phone) === null);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <span>{label}</span>
          {value.length >= 3 && carrier.name !== "UNKNOWN" && (
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border transition-all animate-fade-in",
              carrier.badgeBg,
              carrier.borderBg
            )}>
              {carrier.displayName}
            </span>
          )}
        </label>
        <span className="text-muted-foreground font-normal text-xs">e.g. 0712345678</span>
      </div>

      <div className="relative">
        <Input
          type="tel"
          placeholder="07XX XXX XXX"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          className={cn(
            "text-lg h-12 transition-all font-mono",
            showError && "border-destructive focus-visible:ring-destructive/20 pr-10",
            !showError && value.length >= 10 && "border-emerald-500/50 focus-visible:ring-emerald-500/20"
          )}
          maxLength={13} // +2547XXXXXXXX
        />
        {showError ? (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-destructive">
            <AlertCircle className="h-5 w-5" />
          </div>
        ) : value ? (
          <button
            type="button"
            onClick={() => {
              onChange("");
              sounds.playTap();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}
      </div>

      {showError && (
        <p className="text-xs text-destructive font-medium animate-in slide-in-from-top-1">
          {error}
        </p>
      )}

      {/* Recent Numbers Quick Selector Pills */}
      {recentPhones.length > 0 && !value && (
        <div className="flex items-center gap-1.5 pt-1 overflow-x-auto text-xs text-muted-foreground">
          <Clock className="w-3 h-3 shrink-0 opacity-60" />
          <span className="text-[11px] shrink-0">Recent:</span>
          {recentPhones.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => selectRecent(p)}
              className="px-2.5 py-1 rounded-full bg-secondary/60 hover:bg-secondary border border-border/50 text-foreground font-mono text-[11px] transition-all hover:scale-105 shrink-0"
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
