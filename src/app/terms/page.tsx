import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms and Conditions | QasiNet",
  description: "Terms and conditions for using QasiNet digital services.",
};

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen pt-20">
      <section className="bg-secondary/30 py-16">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">Terms and Conditions</h1>
          <p className="text-muted-foreground">Last updated: [Date Editable]</p>
        </div>
      </section>

      <section className="py-12 container mx-auto px-4 md:px-6 max-w-4xl">
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Welcome to QasiNet ("we", "our", "us"). These Terms and Conditions govern your use of our digital services marketplace, including but not limited to the purchase of airtime, data bundles, TV subscriptions, and utility payments. By accessing or using our platform, you agree to be bound by these terms.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">2. Services Offered</h2>
            <p className="text-muted-foreground leading-relaxed">
              QasiNet acts as an intermediary platform for the sale of third-party digital services. We process transactions through integrated APIs (e.g., Kyanda). While we strive for immediate service delivery (vending), actual delivery times may vary depending on the third-party service provider's network availability.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">3. User Responsibilities</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>You are responsible for providing accurate information (e.g., correct phone numbers, account numbers, meter numbers) when purchasing a service.</li>
              <li>You agree not to use the platform for any illegal or unauthorized purpose.</li>
              <li>You are responsible for keeping any account credentials secure if you choose to register.</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">4. Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              [EDITABLE: Company Name] is not liable for direct or indirect losses arising from service downtime experienced by third-party telecom operators or utility companies.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">5. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these terms at any time. We will notify users of any material changes by updating the "Last updated" date on this page.
            </p>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">6. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For any questions regarding these terms, please contact us at <a href="mailto:qasinetltd@gmail.com" className="text-primary hover:underline">qasinetltd@gmail.com</a>.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
