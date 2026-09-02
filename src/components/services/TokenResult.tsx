import React, { useState } from "react";
import { CheckCircle2, Copy } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface TokenResultProps {
  token: string;
  units: number;
  amount: number;
}

export function TokenResult({ token, units, amount }: TokenResultProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(token.replace(/\s/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Format token into chunks of 4 for readability
  const formattedToken = token.replace(/(.{4})/g, "$1 ").trim();

  return (
    <div className="bg-card border border-border/50 rounded-3xl p-6 shadow-sm space-y-6">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="w-6 h-6 text-green-500" />
        <h3 className="font-bold text-lg">Token Generated Successfully</h3>
      </div>
      
      <div className="bg-secondary/50 rounded-2xl p-6 text-center space-y-4">
        <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Meter Token</p>
        <div className="text-2xl md:text-3xl font-mono font-bold tracking-widest text-primary break-all">
          {formattedToken}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleCopy}
          className="gap-2"
        >
          <Copy className="w-4 h-4" />
          {copied ? "Copied!" : "Copy Token"}
        </Button>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-background rounded-xl border border-border/50 text-center">
          <p className="text-xs text-muted-foreground mb-1">Units</p>
          <p className="font-bold text-lg">{units} kWh</p>
        </div>
        <div className="p-4 bg-background rounded-xl border border-border/50 text-center">
          <p className="text-xs text-muted-foreground mb-1">Amount</p>
          <p className="font-bold text-lg">KES {amount}</p>
        </div>
      </div>
    </div>
  );
}
