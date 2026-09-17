import React from "react";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "Learn about QasiNet's refund policy and resolution process for failed mobile airtime and data bundle transactions.",
  alternates: {
    canonical: "/refunds",
  },
  openGraph: {
    title: "Refund Policy | QasiNet",
    description: "Learn about QasiNet's refund policy and resolution process for failed mobile airtime and data bundle transactions.",
  },
};

export default function RefundsPage() {
  return (
    <div className="flex flex-col min-h-screen pt-20">
      <section className="bg-secondary/30 py-16">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">Refund Policy</h1>
          <p className="text-muted-foreground">Last updated: September 2026</p>
        </div>
      </section>

      <section className="py-12 container mx-auto px-4 md:px-6 max-w-4xl">
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">1. Failed Transactions & Automated Retries</h2>
            <p className="text-muted-foreground leading-relaxed">
              If your M-Pesa payment is successfully deducted but the telecommunications carrier (such as Safaricom, Airtel, Telkom, Equitel, or Faiba) experiences temporary system latency, your transaction is placed in &quot;Pending&quot; status. Our automated vending queue will safely retry the delivery. If vending fails permanently, a reversal or refund process is initiated.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">2. Refund Processing Timeframes</h2>
            <p className="text-muted-foreground leading-relaxed">
              Refunds for confirmed failed orders are processed promptly back to your source M-Pesa account. Depending on mobile network operator clearing times, reversals generally reflect within 1 to 24 hours.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">3. User Errors & Wrong Recipient Numbers</h2>
            <p className="text-muted-foreground leading-relaxed">
              QasiNet cannot reverse airtime or data packages that have been successfully vended by the telecom provider to an incorrect phone number entered by the customer. Please review the destination phone number carefully on the checkout confirmation screen before authorizing payment.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">4. Support & Dispute Resolution</h2>
            <p className="text-muted-foreground leading-relaxed">
              If your M-Pesa transaction was debited but the status has not updated, visit our{" "}
              <Link href="/track" className="text-primary font-medium hover:underline">
                Order Tracking page
              </Link>{" "}
              or reach our support team directly at <a href="mailto:qasinetltd@gmail.com" className="text-primary hover:underline">qasinetltd@gmail.com</a> or phone <a href="tel:+254116209855" className="text-primary hover:underline font-medium">+254 116 209 855</a>.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
