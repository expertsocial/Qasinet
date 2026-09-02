import React, { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { Loader2, CheckCircle2, User } from "lucide-react";

interface AccountNumberInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
  onVerify?: (accountNumber: string) => Promise<{ customerName: string } | null>;
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

  const handleVerify = async () => {
    if (!value || value.length < 3) {
      setError("Please enter a valid account number");
      return;
    }
    
    if (onVerify) {
      setIsVerifying(true);
      setError(null);
      try {
        const result = await onVerify(value);
        if (!result) {
          setError("Account not found. Please check and try again.");
        }
      } catch (e) {
        setError("Verification failed. Please try again.");
      } finally {
        setIsVerifying(false);
      }
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="flex gap-3">
        <Input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value.replace(/[^a-zA-Z0-9-]/g, ""));
            setError(null);
          }}
          placeholder={placeholder}
          className={cn("h-14 text-lg", error && "border-destructive")}
        />
        {onVerify && !verifiedCustomer && (
          <Button 
            onClick={handleVerify} 
            disabled={isVerifying || value.length < 3}
            className="h-14 px-6"
          >
            {isVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify"}
          </Button>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-destructive font-medium animate-in slide-in-from-top-1">
          {error}
        </p>
      )}

      {verifiedCustomer && !error && (
        <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl animate-in fade-in zoom-in-95">
          <div className="p-2 bg-green-500/20 rounded-full text-green-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-green-600/80 uppercase tracking-wider">Verified Account</p>
            <p className="text-sm font-bold flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              {verifiedCustomer}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
