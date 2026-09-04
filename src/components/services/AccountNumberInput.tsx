import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { Loader2, CheckCircle2, User, AlertCircle, RefreshCw } from "lucide-react";

interface AccountNumberInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
  onVerify?: (accountNumber: string) => Promise<{ customerName: string; balance?: number } | null | undefined>;
  verifiedCustomer?: string | null;
  className?: string;
}

export function AccountNumberInput({
  label = "Account Number",
  placeholder = "Enter account number",
  value,
  onChange,
  onVerify,
  verifiedCustomer,
  className,
}: AccountNumberInputProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastVerifiedValRef = useRef<string>("");

  const executeVerification = async (accountToVerify: string) => {
    const clean = accountToVerify.trim();
    if (!clean || clean.length < 4) {
      return;
    }

    if (onVerify) {
      setIsVerifying(true);
      setError(null);
      try {
        const result = await onVerify(clean);
        if (result && result.customerName) {
          lastVerifiedValRef.current = clean;
          setError(null);
        } else {
          setError("Account or meter not found. Please check and try again.");
        }
      } catch (e: any) {
        setError(e?.message || "Verification failed. Please check the digits.");
      } finally {
        setIsVerifying(false);
      }
    }
  };

  // Automatic verification on typing with 600ms debounce
  useEffect(() => {
    const clean = value.trim();

    // If empty or too short, reset
    if (clean.length < 4) {
      setError(null);
      setIsVerifying(false);
      return;
    }

    // Don't re-verify if already verified for this exact value
    if (verifiedCustomer && lastVerifiedValRef.current === clean) {
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      executeVerification(clean);
    }, 650);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [value, onVerify]);

  const handleManualVerify = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    executeVerification(value);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-foreground">{label}</label>
        {isVerifying && (
          <span className="text-xs text-primary flex items-center gap-1.5 font-medium animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Detecting account name...
          </span>
        )}
      </div>

      <div className="relative">
        <Input
          type="text"
          value={value}
          onChange={(e) => {
            const sanitized = e.target.value.replace(/[^a-zA-Z0-9-]/g, "");
            onChange(sanitized);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleManualVerify();
            }
          }}
          placeholder={placeholder}
          className={cn(
            "h-14 text-lg pr-28 transition-all font-mono tracking-wide",
            error && "border-destructive focus-visible:ring-destructive",
            verifiedCustomer && "border-green-500/50 bg-green-500/[0.02]"
          )}
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {isVerifying ? (
            <div className="p-2 text-primary">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : verifiedCustomer ? (
            <div className="p-2 text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          ) : (
            onVerify && value.length >= 4 && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleManualVerify}
                className="h-9 px-3 text-xs text-muted-foreground hover:text-foreground"
              >
                Verify
              </Button>
            )
          )}
        </div>
      </div>
      
      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm animate-in slide-in-from-top-1">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p className="flex-1 font-medium">{error}</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleManualVerify}
            className="h-7 px-2 text-xs text-destructive hover:bg-destructive/20"
          >
            <RefreshCw className="w-3 h-3 mr-1" /> Retry
          </Button>
        </div>
      )}

      {verifiedCustomer && !error && (
        <div className="flex items-center gap-3.5 p-4 bg-green-500/10 border border-green-500/30 rounded-2xl animate-in fade-in zoom-in-95 shadow-sm">
          <div className="p-2.5 bg-green-500/20 rounded-xl text-green-600 dark:text-green-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <p className="text-[11px] font-bold text-green-700 dark:text-green-400 uppercase tracking-widest">
                Account Verified
              </p>
            </div>
            <p className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2 mt-0.5 truncate">
              <User className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="truncate">{verifiedCustomer}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
