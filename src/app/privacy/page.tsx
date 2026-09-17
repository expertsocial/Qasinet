import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Learn how QasiNet collects, utilizes, and protects your personal data during airtime and data bundle transactions.",
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: "Privacy Policy | QasiNet",
    description: "Learn how QasiNet collects, utilizes, and protects your personal data during airtime and data bundle transactions.",
  },
};

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen pt-20">
      <section className="bg-secondary/30 py-16">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: September 2026</p>
        </div>
      </section>

      <section className="py-12 container mx-auto px-4 md:px-6 max-w-4xl">
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">1. Data Collection</h2>
            <p className="text-muted-foreground leading-relaxed">
              We collect minimal information necessary to securely process your transactions, including recipient phone numbers, payment telephone numbers, and M-Pesa transaction reference codes. If you register an optional user account, we also store your email address and transaction history for your convenience.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">2. Data Usage</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your data is strictly utilized to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Process airtime and bundle orders via our payment engine and telecommunication APIs.</li>
              <li>Provide digital transaction receipts, order tracking capabilities, and customer support.</li>
              <li>Communicate critical status updates regarding your transaction fulfillment.</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">3. Data Sharing</h2>
            <p className="text-muted-foreground leading-relaxed">
              We never sell your personal data. We only pass destination phone numbers to telecom carriers (Safaricom, Airtel, Telkom, Equitel, Faiba) strictly required to vend your purchased airtime or data package.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">4. Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement industry-standard encryption and security controls to protect your transaction records against unauthorized access or tampering.
            </p>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">5. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              You have the right to request access to or deletion of your personal account data held by QasiNet. Contact our support team at <a href="mailto:qasinetltd@gmail.com" className="text-primary hover:underline">qasinetltd@gmail.com</a> for assistance.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
