import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { getPhoneValidationError, normalizeKenyanPhone } from "@/lib/validation";
import { AlertCircle, Clock, X, CheckCircle2 } from "lucide-react";
import { detectCarrier, CarrierInfo } from "@/lib/carrier";
import { sounds } from "@/lib/sounds";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidationChange?: (isValid: boolean) => void;
  onCarrierChange?: (carrier: CarrierInfo) => void;
  className?: string;
  label?: string;
}

export function PhoneInput({ 
  value, 
  onChange, 
  onValidationChange, 
  onCarrierChange,
  className,
  label = "Phone Number"
}: PhoneInputProps) {
  const [touched, setTouched] = useState(false);
  const [recentPhones, setRecentPhones] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("qsn_recent_phones");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setRecentPhones(parsed.slice(0, 3));
        }
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const carrier = detectCarrier(value);
  const error = getPhoneValidationError(value);
  const showError = touched && error !== null;
  const isDetected = value.length >= 3 && carrier.name !== "UNKNOWN";

  // Emit carrier changes when detected
  useEffect(() => {
    if (onCarrierChange && carrier) {
      onCarrierChange(carrier);
    }
  }, [carrier.name, onCarrierChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const sanitized = rawVal.replace(/(?!^\+)[^\d]/g, "");
    onChange(sanitized);
    
    if (onValidationChange) {
      onValidationChange(getPhoneValidationError(sanitized) === null);
    }
    if (onCarrierChange) {
      onCarrierChange(detectCarrier(sanitized));
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
          {isDetected && (
            <span className={cn(
              "inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border transition-all animate-fade-in shadow-sm",
              carrier.badgeBg,
              carrier.borderBg
            )}>
              <span className="relative w-3.5 h-3.5 rounded-full overflow-hidden bg-white shrink-0 inline-block">
                <Image 
                  src={carrier.logoSrc} 
                  alt={carrier.displayName} 
                  fill 
                  sizes="14px"
                  className="object-contain p-0.5" 
                />
              </span>
              <span>{carrier.displayName}</span>
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
            !showError && isDetected && value.length >= 10 && cn(carrier.borderBg, "focus-visible:ring-2 focus-visible:ring-offset-0"),
            !showError && !isDetected && value.length >= 10 && "border-emerald-500/50 focus-visible:ring-emerald-500/20"
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

      {/* Dynamic carrier confirmation strip */}
      {isDetected && !showError && value.length >= 4 && (
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium animate-in fade-in slide-in-from-top-1 duration-300",
          carrier.badgeBg,
          carrier.borderBg
        )}>
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>Recognized as <strong>{carrier.displayName} Kenya</strong> number</span>
        </div>
      )}

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
