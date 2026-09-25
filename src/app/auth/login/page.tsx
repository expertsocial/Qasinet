"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { isAuthorizedAdminEmail } from "@/lib/auth/admin-check";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Loader2, ArrowRight, ArrowLeft, MailCheck, ShieldCheck, AlertCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

type LoginStep = "CREDENTIALS" | "OTP" | "SUCCESS";

function LoginForm() {
  const [step, setStep] = useState<LoginStep>("CREDENTIALS");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [resolvedEmail, setResolvedEmail] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const { user, login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Prefetch dashboard & admin routes for instant client-side transition
  useEffect(() => {
    router.prefetch("/dashboard");
    router.prefetch("/admin");
  }, [router]);

  // Redirect immediately if already authenticated
  useEffect(() => {
    if (user && step !== "SUCCESS") {
      const emailToCheck = (user.email || "").trim().toLowerCase();
      const isAdminUser = isAuthorizedAdminEmail(emailToCheck);
      const target = isAdminUser
        ? (searchParams.get("redirect") || "/admin")
        : "/dashboard";
      setStep("SUCCESS");
      router.replace(target);
      setTimeout(() => {
        window.location.replace(target);
      }, 500);
    }
  }, [user, step, searchParams, router]);

  // Resend cooldown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Step 1: Validate credentials and dispatch login OTP strictly to email
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/otp/login/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to initiate sign-in. Please check your credentials.");
        setIsSubmitting(false);
        return;
      }

      setMaskedEmail(data.email || identifier);
      setResolvedEmail(data.rawEmail || identifier);
      setNotice(data.message || `A 6-digit verification code has been dispatched to your email.`);
      setStep("OTP");
      setCountdown(60);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend Login OTP
  const handleResendOTP = async () => {
    if (countdown > 0 || isSubmitting) return;
    setError("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/otp/login/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: resolvedEmail || identifier.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not resend verification code. Please wait.");
        setIsSubmitting(false);
        return;
      }

      setNotice(data.message || "A fresh 6-digit sign-in code has been sent to your email.");
      setCountdown(60);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resend code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Verify OTP and grant account access
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setIsSubmitting(true);

    if (otpCode.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      setIsSubmitting(false);
      return;
    }

    try {
      const verifyRes = await fetch("/api/auth/otp/login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: resolvedEmail || identifier.trim(),
          code: otpCode.trim(),
        }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        setError(verifyData.error || "Invalid verification code.");
        setIsSubmitting(false);
        return;
      }

      // Establish authenticated session
      await login(resolvedEmail || identifier.trim(), password);

      // Routing logic: only qasinetltd.com can access /admin; all others are strictly guided to /dashboard
      const emailToCheck = (resolvedEmail || identifier).trim().toLowerCase();
      const isAdminUser = isAuthorizedAdminEmail(emailToCheck);
      const target = isAdminUser
        ? (searchParams.get("redirect") || "/admin")
        : "/dashboard";

      // Disappear login page immediately
      setStep("SUCCESS");
      router.replace(target);
      setTimeout(() => {
        window.location.replace(target);
      }, 500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to complete sign-in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Login page disappears immediately upon success
  if (step === "SUCCESS") {
    return null;
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)] pt-20">
      <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="container mx-auto px-4 md:px-6 flex-1 flex flex-col items-center justify-center relative z-10 py-12">
        <div className="w-full max-w-md p-8 sm:p-10 rounded-3xl bg-card border border-border/50 shadow-xl backdrop-blur-sm transition-all duration-300">
          {step === "CREDENTIALS" ? (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
                  Welcome back
                </h1>
                <p className="text-sm text-muted-foreground">
                  Sign in to manage your services and track transactions.
                </p>
              </div>

              {error && (
                <div className="mb-5 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleCredentialsSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="identifier" className="text-sm font-medium">
                    Email or Registered Phone
                  </label>
                  <Input
                    id="identifier"
                    placeholder="e.g. name@example.com or 0712345678"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    autoComplete="username"
                  />
                  <p className="text-xs text-muted-foreground">
                    For security, all verification codes are sent strictly to your registered email.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="text-sm font-medium">Password</label>
                    <Link href="/auth/forgot-password" className="text-xs font-medium text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full mt-2"
                  size="lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Verifying credentials...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link href="/auth/register" className="font-medium text-primary hover:underline">
                  Create an account
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
                  Two-Factor Verification
                </h1>
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code sent to{" "}
                  <span className="font-semibold text-foreground font-mono">{maskedEmail}</span>.
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
                    Enter 6-Digit Sign-In Code
                  </label>
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="123456"
                    className="text-center text-2xl tracking-[8px] font-mono font-bold h-14"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
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
                  disabled={isSubmitting || otpCode.length !== 6}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Verifying code...
                    </>
                  ) : (
                    <>
                      Verify & Sign In
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
                    onClick={() => {
                      setStep("CREDENTIALS");
                      setError("");
                      setNotice("");
                      setOtpCode("");
                    }}
                    className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                    Back to credentials
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

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-neutral-500">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
