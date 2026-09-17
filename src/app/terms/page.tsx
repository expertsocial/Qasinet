import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description: "Terms and Conditions governing the use of QasiNet's airtime and internet data bundle services.",
  alternates: {
    canonical: "/terms",
  },
  openGraph: {
    title: "Terms and Conditions | QasiNet",
    description: "Terms and Conditions governing the use of QasiNet's airtime and internet data bundle services.",
  },
};

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen pt-20">
      <section className="bg-secondary/30 py-16">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">Terms and Conditions</h1>
          <p className="text-muted-foreground">Last updated: September 2026</p>
        </div>
      </section>

      <section className="py-12 container mx-auto px-4 md:px-6 max-w-4xl">
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Welcome to QasiNet (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;). These Terms and Conditions govern your use of our digital services marketplace, focusing on the purchase and instant delivery of mobile airtime and internet data bundles across Kenyan telecommunication networks. By accessing or using our platform, you agree to be bound by these terms.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">2. Services Offered</h2>
            <p className="text-muted-foreground leading-relaxed">
              QasiNet acts as an authorized intermediary platform for the electronic vending of airtime top-ups (Safaricom, Airtel, Telkom, Equitel, Faiba) and internet data bundles. While we strive for immediate service vending upon M-Pesa payment confirmation, actual transmission times may occasionally vary depending on the telecommunications operator&apos;s network status.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">3. User Responsibilities</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>You are strictly responsible for providing the correct recipient phone number when ordering airtime or data packages.</li>
              <li>You agree not to use the platform for any fraudulent, illegal, or unauthorized transactions.</li>
              <li>You are responsible for safeguarding your device and M-Pesa PIN during transaction authorization.</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">4. Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              QasiNet is not liable for indirect losses, lost profits, or delays resulting from third-party mobile network operator outages, scheduled maintenance, or inaccurate phone numbers supplied by the customer.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">5. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these terms as our platform evolves or as regulatory policies require. We will notify users of any material changes by updating the date on this page.
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
