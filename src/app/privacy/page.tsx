import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | QasiNet",
  description: "Learn how QasiNet collects, uses, and protects your personal data.",
};

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen pt-20">
      <section className="bg-secondary/30 py-16">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: [Date Editable]</p>
        </div>
      </section>

      <section className="py-12 container mx-auto px-4 md:px-6 max-w-4xl">
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">1. Data Collection</h2>
            <p className="text-muted-foreground leading-relaxed">
              We collect information necessary to process your transactions, including phone numbers, account identifiers (e.g., KPLC meter numbers, DStv smartcard numbers), and payment details. If you choose to register, we also collect your name and email address.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">2. Data Usage</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your data is strictly used to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Process transactions via our payment engine and third-party vendors (e.g., Kyanda APIs).</li>
              <li>Provide you with transaction receipts and tracking capabilities.</li>
              <li>Communicate important updates regarding your purchases.</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">3. Data Sharing</h2>
            <p className="text-muted-foreground leading-relaxed">
              We do not sell your personal data. We only share necessary transaction identifiers with our verified vending partners to fulfill your requests.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">4. Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement industry-standard security measures to protect your personal information against unauthorized access or disclosure.
            </p>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">5. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              You have the right to request access to or deletion of your personal data held by [EDITABLE: Company Name]. Contact our support team for assistance.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
