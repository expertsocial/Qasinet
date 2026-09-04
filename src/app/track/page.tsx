"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { 
  Search, 
  Loader2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Zap, 
  ArrowRight, 
  Copy, 
  Check, 
  Mail, 
  ExternalLink, 
  RefreshCw, 
  ShieldCheck, 
  Smartphone, 
  FileText,
  X
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

interface TransactionData {
  id: string;
  qsn_reference: string;
  destination: string;
  guest_phone?: string;
  amount: number;
  selling_price: number;
  status: string;
  failure_reason?: string;
  payment_reference?: string;
  kyanda_reference?: string;
  created_at: string;
  updated_at?: string;
  services?: {
    name?: string;
    slug?: string;
    type?: string;
  };
  products?: {
    name?: string;
  };
}

interface TrackResponse {
  transaction: TransactionData;
  events: Array<{
    id: string;
    status: string;
    details?: any;
    created_at: string;
  }>;
  metadata?: {
    token?: string;
    units?: string | number;
    accountName?: string;
  };
}

function TrackTransactionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refFromQuery = searchParams.get("ref") || searchParams.get("reference") || "";
  const phoneFromQuery = searchParams.get("phone") || "";

  const [txRef, setTxRef] = useState(refFromQuery);
  const [phone, setPhone] = useState(phoneFromQuery);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TrackResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  // Polling state
  const [isPolling, setIsPolling] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Email modal state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const fetchTrackData = useCallback(async (reference: string, phoneNumber: string, isBackground = false) => {
    if (!isBackground) {
      setIsLoading(true);
      setErrorMsg(null);
    }

    try {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: reference.trim(), phone: phoneNumber.trim() }),
      });

      const json = await res.json();

      if (!res.ok) {
        if (!isBackground) {
          setErrorMsg(json.error || "Could not find transaction. Check your reference and phone number.");
          setResult(null);
        }
        return null;
      }

      setResult(json);
      return json;
    } catch (err: any) {
      if (!isBackground) {
        setErrorMsg("Network error checking transaction status. Please retry.");
      }
      return null;
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  }, []);

  // Handle URL query parameters on mount
  useEffect(() => {
    if (refFromQuery && phoneFromQuery) {
      fetchTrackData(refFromQuery, phoneFromQuery);
    }
  }, [refFromQuery, phoneFromQuery, fetchTrackData]);

  // Live auto-polling if transaction is pending
  useEffect(() => {
    if (!result?.transaction) return;

    const pendingStates = ["CREATED", "PAYMENT_PENDING", "VENDING_PENDING"];
    const status = result.transaction.status;

    if (pendingStates.includes(status)) {
      setIsPolling(true);

      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

      pollIntervalRef.current = setInterval(async () => {
        const updated = await fetchTrackData(txRef, phone, true);
        if (updated?.transaction && !pendingStates.includes(updated.transaction.status)) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setIsPolling(false);
          if (updated.transaction.status === "SUCCESS") {
            toast.success("Order Complete! Your utility has been delivered.");
          } else {
            toast.error("Transaction status updated: " + updated.transaction.status);
          }
        }
      }, 3000);
    } else {
      setIsPolling(false);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [result?.transaction?.status, txRef, phone, fetchTrackData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txRef.trim() || !phone.trim()) return;
    router.replace(`/track?ref=${encodeURIComponent(txRef.trim())}&phone=${encodeURIComponent(phone.trim())}`);
    await fetchTrackData(txRef, phone);
  };

  const handleCopyToken = (token: string) => {
    const rawClean = token.replace(/[^0-9]/g, "");
    navigator.clipboard.writeText(rawClean);
    setCopiedToken(true);
    toast.success("Token copied to clipboard!");
    setTimeout(() => setCopiedToken(false), 2500);
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!result?.transaction?.qsn_reference) return;
    if (!emailInput.trim()) {
      toast.error("Please enter a valid email");
      return;
    }

    setIsSendingEmail(true);
    try {
      const res = await fetch(`/api/transactions/${result.transaction.qsn_reference}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Receipt sent to ${emailInput.trim()}!`);
        setShowEmailModal(false);
      } else {
        toast.error(data.error || "Failed to send email");
      }
    } catch {
      toast.error("Failed to connect to email service");
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Stepper calculations
  const tx = result?.transaction;
  const metadata = result?.metadata;
  const status = tx?.status || "";

  const isCreated = Boolean(tx);
  const isPaid = status === "PAYMENT_CONFIRMED" || status === "VENDING_PENDING" || status === "SUCCESS";
  const isVending = status === "VENDING_PENDING" || status === "SUCCESS";
  const isDelivered = status === "SUCCESS";
  const isFailed = status.includes("FAILED");

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)] pt-20 pb-16">
      <div className="absolute top-1/4 -right-1/4 w-1/2 h-1/2 bg-primary/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-cyan-500/10 blur-[130px] rounded-full pointer-events-none" />
      
      <div className="container mx-auto px-4 md:px-6 flex-1 flex flex-col items-center relative z-10 py-8">
        
        {/* Header */}
        <div className="text-center max-w-2xl mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 mb-3">
            <ShieldCheck className="w-4 h-4" /> Live Tracking Engine
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground mb-3">
            Track Your Transaction
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Get instant, second-by-second updates on your M-Pesa payment confirmation and utility vending.
          </p>
        </div>

        {/* Lookup Form */}
        <div className="w-full max-w-xl p-6 sm:p-8 rounded-3xl bg-card border border-border/50 shadow-xl backdrop-blur-sm mb-10">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="tx-ref" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Transaction Reference
                </label>
                <Input 
                  id="tx-ref" 
                  placeholder="e.g., QSN-20260902-000001" 
                  value={txRef}
                  onChange={(e) => setTxRef(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-1.5">
                <label htmlFor="phone" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Phone Number Used
                </label>
                <Input 
                  id="phone" 
                  type="tel" 
                  placeholder="e.g., 0712345678" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              size="lg" 
              className="w-full gap-2 mt-2" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Locating Transaction...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Track Live Progress
                </>
              )}
            </Button>
          </form>

          {errorMsg && (
            <div className="mt-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Transaction Not Found</p>
                <p className="text-xs mt-0.5 text-red-400">{errorMsg}</p>
              </div>
            </div>
          )}
        </div>

        {/* Live Timeline Result View */}
        {tx && (
          <div className="w-full max-w-2xl bg-card border border-border/60 shadow-2xl rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Top Bar with Live Polling Indicator */}
            <div className="bg-primary/5 p-6 border-b border-border/60 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">
                  Reference: <strong className="text-foreground">{tx.qsn_reference}</strong>
                </span>
                <h2 className="text-xl font-bold text-foreground mt-0.5">
                  {tx.services?.name || "Utility Service"}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                {isPolling && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Live Syncing
                  </span>
                )}
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                  isDelivered 
                    ? "bg-green-500/10 text-green-500 border-green-500/20" 
                    : isFailed 
                    ? "bg-red-500/10 text-red-500 border-red-500/20" 
                    : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                }`}>
                  {isDelivered ? "DELIVERED" : isFailed ? "FAILED" : "PROCESSING"}
                </span>
              </div>
            </div>

            {/* KPLC Token Card (If Generated) */}
            {metadata?.token && (
              <div className="p-6 bg-gradient-to-b from-amber-500/15 to-transparent border-b border-amber-500/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
                    <Zap className="w-5 h-5 fill-current" />
                    <span>ELECTRICITY RECHARGE TOKEN</span>
                  </div>
                  {metadata?.units && (
                    <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-400 rounded-md text-xs font-mono font-bold">
                      {metadata.units} kWh
                    </span>
                  )}
                </div>

                <div className="bg-background/90 border border-amber-500/30 rounded-2xl p-4 text-center my-2">
                  <p className="text-2xl sm:text-3xl font-mono font-black text-foreground tracking-wider">
                    {metadata.token.replace(/[^0-9]/g, "").match(/.{1,4}/g)?.join(" - ") || metadata.token}
                  </p>
                </div>

                <div className="flex justify-center mt-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleCopyToken(metadata.token!)}
                    className="gap-2 border-amber-500/30 text-amber-400"
                  >
                    {copiedToken ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    {copiedToken ? "Copied!" : "Copy Token"}
                  </Button>
                </div>
              </div>
            )}

            {/* 4-Stage Progress Stepper */}
            <div className="p-6 sm:p-8 space-y-6">
              
              {/* Step 1: Order Initialized */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                    isCreated ? "bg-green-500 text-black shadow-lg shadow-green-500/20" : "bg-muted text-muted-foreground"
                  }`}>
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className={`w-0.5 h-14 ${isPaid ? "bg-green-500" : "bg-border"}`} />
                </div>
                <div className="pt-1 flex-1">
                  <div className="flex justify-between items-baseline">
                    <h3 className="text-sm font-bold text-foreground">1. Order Initialized</h3>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(tx.created_at).toLocaleTimeString("en-KE", { timeZone: "Africa/Nairobi" })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Reference registered for {tx.destination} (KES {Number(tx.amount).toLocaleString()})
                  </p>
                </div>
              </div>

              {/* Step 2: M-Pesa Payment */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                    isPaid 
                      ? "bg-green-500 text-black shadow-lg shadow-green-500/20" 
                      : status === "PAYMENT_PENDING"
                      ? "bg-blue-500 text-white animate-pulse"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {isPaid ? <CheckCircle2 className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
                  </div>
                  <div className={`w-0.5 h-14 ${isVending ? "bg-green-500" : "bg-border"}`} />
                </div>
                <div className="pt-1 flex-1">
                  <div className="flex justify-between items-baseline">
                    <h3 className="text-sm font-bold text-foreground">2. M-Pesa Payment</h3>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {tx.payment_reference || (status === "PAYMENT_PENDING" ? "Awaiting STK..." : "")}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isPaid 
                      ? `Confirmed via M-Pesa (${tx.payment_reference})`
                      : status === "PAYMENT_PENDING"
                      ? "M-Pesa STK Prompt dispatched to phone. Enter PIN on your handset."
                      : "Pending payment confirmation."}
                  </p>
                </div>
              </div>

              {/* Step 3: Provider Vending */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                    isDelivered 
                      ? "bg-green-500 text-black shadow-lg shadow-green-500/20" 
                      : status === "VENDING_PENDING"
                      ? "bg-amber-500 text-black animate-pulse"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {isDelivered ? <CheckCircle2 className="w-5 h-5" /> : <RefreshCw className={`w-5 h-5 ${status === "VENDING_PENDING" ? "animate-spin" : ""}`} />}
                  </div>
                  <div className={`w-0.5 h-14 ${isDelivered ? "bg-green-500" : "bg-border"}`} />
                </div>
                <div className="pt-1 flex-1">
                  <div className="flex justify-between items-baseline">
                    <h3 className="text-sm font-bold text-foreground">3. Provider Vending & Telco Dispatch</h3>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {tx.kyanda_reference || ""}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isDelivered 
                      ? "Order dispatched & processed by provider."
                      : status === "VENDING_PENDING"
                      ? "Processing with utility provider. Generating token/airtime..."
                      : "Waiting for payment verification."}
                  </p>
                </div>
              </div>

              {/* Step 4: Completion / Delivery */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                    isDelivered 
                      ? "bg-green-500 text-black shadow-lg shadow-green-500/20" 
                      : isFailed
                      ? "bg-red-500 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {isDelivered ? <CheckCircle2 className="w-5 h-5" /> : isFailed ? <AlertCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>
                </div>
                <div className="pt-1 flex-1">
                  <div className="flex justify-between items-baseline">
                    <h3 className="text-sm font-bold text-foreground">4. Delivery & Final Receipt</h3>
                    {isDelivered && (
                      <span className="text-[11px] font-semibold text-green-500">
                        SUCCESS
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isDelivered 
                      ? "Transaction completed successfully. Service delivered."
                      : isFailed 
                      ? `Vending failed: ${tx.failure_reason || "Provider error"}`
                      : "Awaiting final confirmation from telco / provider."}
                  </p>
                </div>
              </div>

            </div>

            {/* Contextual Action Buttons */}
            <div className="bg-muted/40 p-6 border-t border-border/60 flex flex-wrap gap-3 justify-between items-center">
              <div className="flex flex-wrap gap-2">
                <Link href={`/receipt/${encodeURIComponent(tx.qsn_reference)}`}>
                  <Button className="gap-2">
                    <FileText className="w-4 h-4" /> View Full Receipt
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  onClick={() => setShowEmailModal(true)}
                  className="gap-2"
                >
                  <Mail className="w-4 h-4" /> Email Receipt
                </Button>
              </div>

              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setResult(null);
                  setErrorMsg(null);
                }}
                className="text-muted-foreground text-xs"
              >
                Track Another Order
              </Button>
            </div>

          </div>
        )}

      </div>

      {/* Email Modal Dialog */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border border-border/60 rounded-3xl p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowEmailModal(false)}
              className="absolute top-5 right-5 text-muted-foreground hover:text-foreground rounded-full p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Email Official Receipt</h3>
                <p className="text-xs text-muted-foreground">Receive receipt and token in your inbox</p>
              </div>
            </div>

            <form onSubmit={handleSendEmail} className="space-y-4 mt-4">
              <div className="space-y-2">
                <label htmlFor="email-track" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Your Email Address
                </label>
                <input
                  id="email-track"
                  type="email"
                  placeholder="name@example.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm font-medium"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowEmailModal(false)}
                  className="flex-1"
                  disabled={isSendingEmail}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 gap-2"
                  disabled={isSendingEmail}
                >
                  {isSendingEmail ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Send Receipt
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default function TrackTransactionPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center pt-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <TrackTransactionContent />
    </Suspense>
  );
}
