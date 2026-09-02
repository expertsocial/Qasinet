"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Search, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function TrackTransactionPage() {
  const [txRef, setTxRef] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate backend connection step
    setTimeout(() => {
      setIsLoading(false);
      // In a real app, you would verify phone matches transaction ref.
      router.push(`/receipt/${txRef}`);
    }, 1000);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)] pt-20">
      <div className="absolute top-1/4 -right-1/4 w-1/2 h-1/2 bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-secondary/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="container mx-auto px-4 md:px-6 flex-1 flex flex-col items-center justify-center relative z-10 py-12">
        
        <div className="text-center max-w-2xl mb-10">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
            Track Your Transaction
          </h1>
          <p className="text-lg text-muted-foreground">
            Enter your transaction reference and phone number below to get real-time updates on your service vending status.
          </p>
        </div>

        <div className="w-full max-w-md p-8 sm:p-10 rounded-3xl bg-card border border-border/50 shadow-xl backdrop-blur-sm">
          <form className="space-y-6" onSubmit={handleTrack}>
            <div className="space-y-2">
              <label htmlFor="tx-ref" className="text-sm font-medium">Transaction Reference</label>
              <Input 
                id="tx-ref" 
                placeholder="e.g., QSN-20260902-000001" 
                value={txRef}
                onChange={(e) => setTxRef(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium">Phone Number</label>
              <Input 
                id="phone" 
                type="tel" 
                placeholder="e.g., 0712345678" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            <Button 
              type="submit" 
              size="lg" 
              className="w-full gap-2 mt-4" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Tracking...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Track Status
                </>
              )}
            </Button>
          </form>
        </div>

      </div>
    </div>
  );
}
