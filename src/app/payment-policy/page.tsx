import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Payment Policy",
  description: "Learn about QasiNet's M-Pesa payment methods, STK push verification, and transaction security policies.",
  alternates: {
    canonical: "/payment-policy",
  },
  openGraph: {
    title: "Payment Policy | QasiNet",
    description: "Learn about QasiNet's M-Pesa payment methods, STK push verification, and transaction security policies.",
  },
};

export default function PaymentPolicyPage() {
  return (
    <div className="flex flex-col min-h-screen pt-20">
      <section className="bg-secondary/30 py-16">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">Payment Policy</h1>
          <p className="text-muted-foreground">Last updated: September 2026</p>
        </div>
      </section>

      <section className="py-12 container mx-auto px-4 md:px-6 max-w-4xl">
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">1. Accepted Payment Methods</h2>
            <p className="text-muted-foreground leading-relaxed">
              QasiNet accepts Mobile Money payments (primarily Safaricom M-PESA via Daraja STK Push and Kyanda payment gateway). All orders are calculated and settled in Kenyan Shillings (KES).
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">2. Payment Verification & Real-Time Vending</h2>
            <p className="text-muted-foreground leading-relaxed">
              Airtime and data bundles are vended automatically immediately after payment verification callback is received from the payment gateway. In instances where network latency delays the carrier receipt notification, our automated poller re-checks transaction health continuously.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">3. Transaction Fees</h2>
            <p className="text-muted-foreground leading-relaxed">
              Transparent pricing is our hallmark: checkout screens display the exact amount payable before you enter your M-Pesa PIN. Standard telco network operator fee structures apply where applicable.
            </p>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">4. Payment Security & Encryption</h2>
            <p className="text-muted-foreground leading-relaxed">
              We employ end-to-end SSL encryption and never store your personal M-Pesa PIN. Authentication takes place directly through Safaricom&apos;s encrypted SIM toolkit prompt.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
