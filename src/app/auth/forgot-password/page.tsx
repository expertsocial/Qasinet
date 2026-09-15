"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Loader2, ArrowLeft, MailCheck, ShieldCheck, KeyRound, AlertCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"request" | "verify" | "reset" | "success">("request");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusNotice, setStatusNotice] = useState("");
  const [countdown, setCountdown] = useState(0);

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Handle Step 1: Request OTP
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setStatusNotice("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Failed to send verification code. Please try again.");
        setIsLoading(false);
        return;
      }

      setStatusNotice(data.message || "Verification code sent!");
      setStep("verify");
      setCountdown(60); // 60s cooldown before allowing resend
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Network error. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Resending OTP
  const handleResendOTP = async () => {
    if (countdown > 0 || isLoading) return;
    setErrorMessage("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Could not resend code. Please wait.");
        setIsLoading(false);
        return;
      }

      setStatusNotice("A new 6-digit code has been dispatched.");
      setCountdown(60);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Network error during resend.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Step 2: Verify OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: otpCode.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Incorrect or expired verification code.");
        setIsLoading(false);
        return;
      }

      setResetToken(data.resetToken);
      setStep("reset");
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Network error during verification.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Step 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Failed to reset password. Please request a new code.");
        setIsLoading(false);
        return;
      }

      setStep("success");
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Network error while saving new password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)] pt-20">
      <div className="absolute top-1/4 -right-1/4 w-1/2 h-1/2 bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="container mx-auto px-4 md:px-6 flex-1 flex flex-col items-center justify-center relative z-10 py-12">
        <div className="w-full max-w-md p-8 sm:p-10 rounded-3xl bg-card border border-border/50 shadow-xl backdrop-blur-sm transition-all duration-300">

          {/* STEP 1: REQUEST CODE */}
          {step === "request" && (
            <>
              <div className="text-center mb-8">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
                  Reset Password
                </h1>
                <p className="text-sm text-muted-foreground">
                  Enter your registered account email address. We&apos;ll send a 6-digit verification code.
                </p>
              </div>

              {errorMessage && (
                <div className="mb-5 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleRequestOTP} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Account Email Address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                  <p className="text-xs text-muted-foreground">
                    Note: For security, verification codes are sent strictly via email.
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full mt-4"
                  size="lg"
                  disabled={isLoading || !email}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Sending Code...
                    </>
                  ) : (
                    "Send 6-Digit Code"
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to login
                </Link>
              </div>
            </>
          )}

          {/* STEP 2: VERIFY OTP */}
          {step === "verify" && (
            <>
              <div className="text-center mb-8">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
                  <MailCheck className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
                  Verify Code
                </h1>
                <p className="text-sm text-muted-foreground">
                  We sent a 6-digit code to <span className="font-semibold text-foreground">{email}</span>. Valid for 10 minutes.
                </p>
              </div>

              {statusNotice && (
                <div className="mb-4 p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs text-center">
                  {statusNotice}
                </div>
              )}

              {errorMessage && (
                <div className="mb-5 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleVerifyOTP} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="otp" className="text-sm font-medium text-center block">
                    Enter 6-Digit Code
                  </label>
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="123456"
                    className="text-center text-2xl tracking-[8px] font-mono font-bold"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    required
                    autoFocus
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full mt-4"
                  size="lg"
                  disabled={isLoading || otpCode.length !== 6}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify Code"
                  )}
                </Button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={countdown > 0 || isLoading}
                    className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
                  >
                    {countdown > 0 ? `Resend code in ${countdown}s` : "Didn't receive a code? Resend"}
                  </button>
                </div>
              </form>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setStep("request");
                    setErrorMessage("");
                  }}
                  className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Change email address
                </button>
              </div>
            </>
          )}

          {/* STEP 3: ENTER NEW PASSWORD */}
          {step === "reset" && (
            <>
              <div className="text-center mb-8">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
                  New Password
                </h1>
                <p className="text-sm text-muted-foreground">
                  Choose a secure password for your QasiNet account.
                </p>
              </div>

              {errorMessage && (
                <div className="mb-5 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="newPassword" className="text-sm font-medium">
                    New Password
                  </label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium">
                    Confirm New Password
                  </label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full mt-4"
                  size="lg"
                  disabled={isLoading || !newPassword || !confirmPassword}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Updating Password...
                    </>
                  ) : (
                    "Set New Password"
                  )}
                </Button>
              </form>
            </>
          )}

          {/* STEP 4: SUCCESS */}
          {step === "success" && (
            <div className="text-center py-4">
              <div className="mx-auto w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400 mb-4 border border-emerald-500/20">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
                Password Reset Complete
              </h1>
              <p className="text-sm text-muted-foreground mb-8">
                Your password has been successfully updated. You can now sign in with your new credentials.
              </p>

              <Link href="/auth/login" className="w-full block">
                <Button className="w-full" size="lg">
                  Sign In to QasiNet
                </Button>
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
