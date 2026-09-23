"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Loader2, ArrowRight, ArrowLeft, ShieldCheck, MailCheck, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

type Step = "DETAILS" | "OTP" | "SUCCESS";

export default function RegisterPage() {
  const [step, setStep] = useState<Step>("DETAILS");
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
  });
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const { user, register } = useAuth();
  const router = useRouter();

  // Redirect immediately if already authenticated
  useEffect(() => {
    if (user && step !== "SUCCESS") {
      setStep("SUCCESS");
      window.location.replace("/dashboard");
    }
  }, [user, step]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");

    if (!formData.email || !formData.email.includes("@")) {
      setError("Please provide a valid email address.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Dispatch 6-digit registration OTP to the user's EMAIL ONLY
      const res = await fetch("/api/auth/otp/register/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to dispatch verification code. Please try again.");
        setIsSubmitting(false);
        return;
      }

      setNotice(data.message || `Verification code sent to ${formData.email}.`);
      setStep("OTP");
      setCountdown(60);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0 || isSubmitting) return;
    setError("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/otp/register/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not resend code. Please wait.");
        setIsSubmitting(false);
        return;
      }

      setNotice(data.message || "A fresh 6-digit verification code has been dispatched to your email.");
      setCountdown(60);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resend code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    if (otp.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      setIsSubmitting(false);
      return;
    }

    try {
      // 1. Verify OTP code
      const verifyRes = await fetch("/api/auth/otp/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email.trim(),
          code: otp.trim(),
        }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        setError(verifyData.error || "Invalid verification code.");
        setIsSubmitting(false);
        return;
      }

      // 2. Register account with verified email
      await register({
        fullName: formData.fullName,
        phone: formData.phone,
        email: formData.email.trim(),
        password: formData.password,
      });

      // Disappear registration page immediately
      setStep("SUCCESS");
      window.location.replace("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to register.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)] pt-20">
      <div className="absolute top-1/4 -right-1/4 w-1/2 h-1/2 bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="container mx-auto px-4 md:px-6 flex-1 flex flex-col items-center justify-center relative z-10 py-12">
        <div className="w-full max-w-md p-8 sm:p-10 rounded-3xl bg-card border border-border/50 shadow-xl backdrop-blur-sm transition-all duration-300">
          
          {step === "SUCCESS" ? (
            <div className="text-center py-10 space-y-4 animate-in fade-in duration-200">
              <div className="mx-auto w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center">
                <ShieldCheck className="w-9 h-9" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Account Created Successfully
              </h2>
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>Redirecting to your dashboard...</span>
              </p>
            </div>
          ) : step === "DETAILS" ? (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
                  Create an account
                </h1>
                <p className="text-sm text-muted-foreground">
                  Join QasiNet to track transactions and save details.
                </p>
              </div>

              {error && (
                <div className="mb-5 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleDetailsSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="fullName" className="text-sm font-medium">Full Name</label>
                  <Input
                    id="fullName"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">Email Address</label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Required. Verification codes are sent strictly to this email.
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="phone" className="text-sm font-medium">Phone Number (for M-Pesa)</label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="0712345678"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">Password</label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required
                    minLength={6}
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
                      Sending verification code...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/auth/login" className="font-medium text-primary hover:underline">
                  Sign in
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
                  <MailCheck className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
                  Verify your email
                </h1>
                <p className="text-sm text-muted-foreground">
                  We&apos;ve sent a 6-digit code to <span className="font-semibold text-foreground font-mono">{formData.email}</span>.
                </p>
              </div>

              {notice && (
                <div className="mb-4 p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs text-center">
                  {notice}
                </div>
              )}

              {error && (
                <div className="mb-5 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleOtpSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="otp" className="text-sm font-medium text-center block">
                    Enter 6-Digit Email Code
                  </label>
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="text-center text-2xl tracking-[8px] font-mono font-bold h-14"
                    maxLength={6}
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    required
                    autoFocus
                  />
                  <p className="text-[11px] text-muted-foreground text-center">
                    Codes are valid for 10 minutes and sent strictly to your email.
                  </p>
                </div>

                <Button 
                  type="submit" 
                  className="w-full mt-4" 
                  size="lg"
                  disabled={isSubmitting || otp.length !== 6}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Verifying & creating account...
                    </>
                  ) : (
                    <>
                      Verify & Create Account
                      <ShieldCheck className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
                
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={countdown > 0 || isSubmitting}
                    className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
                  >
                    {countdown > 0 ? `Resend code in ${countdown}s` : "Didn't receive a code? Resend"}
                  </button>
                </div>

                <div className="text-center pt-2">
                  <button 
                    type="button"
                    className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => {
                      setStep("DETAILS");
                      setError("");
                      setNotice("");
                      setOtp("");
                    }}
                    disabled={isSubmitting}
                  >
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                    Back to details
                  </button>
                </div>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
