import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Payment Policy | QasiNet",
  description: "Information regarding payment processing on QasiNet.",
};

export default function PaymentPolicyPage() {
  return (
    <div className="flex flex-col min-h-screen pt-20">
      <section className="bg-secondary/30 py-16">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">Payment Policy</h1>
          <p className="text-muted-foreground">Last updated: [Date Editable]</p>
        </div>
      </section>

      <section className="py-12 container mx-auto px-4 md:px-6 max-w-4xl">
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">1. Accepted Payment Methods</h2>
            <p className="text-muted-foreground leading-relaxed">
              QasiNet primarily accepts Mobile Money payments (e.g., M-PESA) for the purchase of digital services. All transactions are processed in Kenyan Shillings (KES).
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">2. Payment Verification</h2>
            <p className="text-muted-foreground leading-relaxed">
              No service is vended until the payment has been independently verified by our backend systems. A successful prompt on your mobile device does not guarantee instant vending if the network callback to our system is delayed.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">3. Transaction Fees</h2>
            <p className="text-muted-foreground leading-relaxed">
              Standard Mobile Money transfer charges may apply when making payments to QasiNet. These charges are levied by your mobile network operator and are separate from the purchase price shown on our platform.
            </p>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">4. Payment Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We employ secure, encrypted API integrations (e.g., Kyanda APIs) for all payment processing. We do not directly store your Mobile Money PINs or sensitive authentication details.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
