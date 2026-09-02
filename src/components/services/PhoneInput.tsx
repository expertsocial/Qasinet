import React, { useState } from "react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { getPhoneValidationError, normalizeKenyanPhone } from "@/lib/validation";
import { AlertCircle } from "lucide-react";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidationChange?: (isValid: boolean) => void;
  className?: string;
}

export function PhoneInput({ value, onChange, onValidationChange, className }: PhoneInputProps) {
  const [touched, setTouched] = useState(false);

  const error = getPhoneValidationError(value);
  const showError = touched && error !== null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    // We let the user type whatever, but we can prevent non-digits and + if we want.
    // Allow + at the start, and digits elsewhere.
    const sanitized = rawVal.replace(/(?!^\+)[^\d]/g, "");
    onChange(sanitized);
    
    if (onValidationChange) {
      onValidationChange(getPhoneValidationError(sanitized) === null);
    }
  };

  const handleBlur = () => {
    setTouched(true);
    
    // Attempt auto-formatting on blur if they typed 254... etc
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

  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-sm font-medium text-foreground flex justify-between">
        Phone Number
        <span className="text-muted-foreground font-normal text-xs">e.g. 0712345678</span>
      </label>
      <div className="relative">
        <Input
          type="tel"
          placeholder="07XX XXX XXX"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          className={cn(
            "text-lg h-12 transition-colors",
            showError && "border-destructive focus-visible:ring-destructive/20 pr-10"
          )}
          maxLength={13} // +2547XXXXXXXX
        />
        {showError && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-destructive">
            <AlertCircle className="h-5 w-5" />
          </div>
        )}
      </div>
      {showError && (
        <p className="text-sm text-destructive font-medium animate-in slide-in-from-top-1">
          {error}
        </p>
      )}
    </div>
  );
}
