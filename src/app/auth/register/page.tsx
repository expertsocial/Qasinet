"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Loader2, ArrowRight, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

type Step = "DETAILS" | "OTP";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("OTP");
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    if (otp.length < 4) {
      setError("Please enter a valid OTP.");
      setIsSubmitting(false);
      return;
    }

    try {
      await register(formData);
      router.push("/dashboard");
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
          
          {step === "DETAILS" ? (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
                  Create an account
                </h1>
                <p className="text-sm text-muted-foreground">
                  Join QasiNet to track transactions and save details.
                </p>
              </div>

              <form onSubmit={handleDetailsSubmit} className="space-y-5">
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
                  <label htmlFor="phone" className="text-sm font-medium">Phone Number</label>
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
                  <label htmlFor="email" className="text-sm font-medium">Email Address (Optional)</label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
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
                >
                  Continue
                  <ArrowRight className="w-5 h-5 ml-2" />
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
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
                  Verify your number
                </h1>
                <p className="text-sm text-muted-foreground">
                  We've sent a 4-digit code to <span className="font-medium text-foreground">{formData.phone}</span>.
                </p>
              </div>

              <form onSubmit={handleOtpSubmit} className="space-y-5">
                {error && (
                  <div className="p-3 text-sm font-medium text-destructive bg-destructive/10 rounded-xl text-center">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="otp" className="text-sm font-medium text-center block">Enter OTP Code</label>
                  <Input
                    id="otp"
                    className="text-center text-2xl tracking-widest font-mono h-14"
                    maxLength={4}
                    placeholder="0000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    required
                    autoFocus
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full mt-4" 
                  size="lg"
                  disabled={isSubmitting || otp.length < 4}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Create Account"
                  )}
                </Button>
                
                <button 
                  type="button"
                  className="w-full text-center text-sm font-medium text-muted-foreground hover:text-foreground mt-4"
                  onClick={() => setStep("DETAILS")}
                  disabled={isSubmitting}
                >
                  Back
                </button>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
