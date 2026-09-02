"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Loader2, ArrowLeft, MailCheck } from "lucide-react";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Mock API call
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSent(true);
    }, 1500);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)] pt-20">
      <div className="absolute top-1/4 -right-1/4 w-1/2 h-1/2 bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="container mx-auto px-4 md:px-6 flex-1 flex flex-col items-center justify-center relative z-10 py-12">
        <div className="w-full max-w-md p-8 sm:p-10 rounded-3xl bg-card border border-border/50 shadow-xl backdrop-blur-sm transition-all duration-300">
          
          {!isSent ? (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
                  Reset Password
                </h1>
                <p className="text-sm text-muted-foreground">
                  Enter your email or phone number and we'll send you instructions to reset your password.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="identifier" className="text-sm font-medium">Email or Phone</label>
                  <Input
                    id="identifier"
                    placeholder="e.g. 0712345678 or name@example.com"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full mt-4" 
                  size="lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Reset Instructions"
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link href="/auth/login" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to login
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
                <MailCheck className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
                Check your messages
              </h1>
              <p className="text-sm text-muted-foreground mb-8">
                We've sent a password reset link to <span className="font-medium text-foreground">{identifier}</span>.
              </p>

              <Link href="/auth/login" className="w-full">
                <Button className="w-full" size="lg">
                  Return to Login
                </Button>
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
