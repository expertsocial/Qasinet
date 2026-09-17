import React from "react";
import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { HelpCircle, MessageSquare, PhoneCall, Mail } from "lucide-react";
import { SupportForm } from "./SupportForm";
import { Accordion } from "@/components/ui/Accordion";

export const metadata: Metadata = {
  title: "Customer Support & Help Center",
  description: "Get immediate help with your QasiNet airtime top-ups, internet data bundle orders, and M-Pesa payment resolutions. Contact us via phone, email, or support ticket.",
  alternates: {
    canonical: "/support",
  },
  openGraph: {
    title: "Customer Support & Help Center | QasiNet",
    description: "Get immediate help with your QasiNet airtime top-ups, internet data bundle orders, and M-Pesa payment resolutions. Contact us via phone, email, or support ticket.",
  },
};

export default async function SupportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-background pt-24 pb-16">
      <div className="container max-w-5xl mx-auto px-4">
        
        {/* Header Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-full text-primary mb-6">
            <HelpCircle className="w-10 h-10" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">How can we help you?</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Whether you have a question about an airtime or data bundle transaction, need order assistance, or have feedback, our support team is standing by.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {/* Quick Contact Cards */}
          <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
            <div className="p-3 bg-secondary rounded-xl text-foreground mb-4">
              <PhoneCall className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Call Us</h3>
            <p className="text-sm text-muted-foreground mb-4">Mon-Sat from 8:00 AM to 8:00 PM</p>
            <a href="tel:+254116209855" className="text-primary hover:underline font-medium">+254 116 209 855</a>
          </div>

          <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
            <div className="p-3 bg-secondary rounded-xl text-foreground mb-4">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Email Support</h3>
            <p className="text-sm text-muted-foreground mb-4">Fast responses within 24 hours</p>
            <a href="mailto:qasinetltd@gmail.com" className="text-primary hover:underline font-medium">qasinetltd@gmail.com</a>
          </div>

          <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
            <div className="p-3 bg-secondary rounded-xl text-foreground mb-4">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Track Order</h3>
            <p className="text-sm text-muted-foreground mb-4">Check live status of any transaction</p>
            <Link href="/track" className="text-primary hover:underline font-medium">Track Order Status →</Link>
          </div>
        </div>

        {/* Ticket Submission Section */}
        <div className="max-w-2xl mx-auto bg-card border border-border/50 rounded-3xl p-8 shadow-sm mb-16">
          <h2 className="text-2xl font-semibold mb-2">Submit a Ticket</h2>
          <p className="text-muted-foreground mb-8">
            Describe your inquiry or order reference in detail and our support team will get back to you promptly.
          </p>
          
          {user ? (
            <SupportForm />
          ) : (
            <div className="text-center p-8 bg-secondary/30 rounded-2xl border border-border/50">
              <h3 className="text-lg font-medium mb-2">Sign in to submit a ticket</h3>
              <p className="text-sm text-muted-foreground mb-6">
                You need to be logged into your QasiNet account to create and track support tickets. Guest buyers can reach us directly via WhatsApp, phone, or email.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link 
                  href="/auth/login?redirectTo=/support" 
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                >
                  Sign In
                </Link>
                <Link 
                  href="/contact" 
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-secondary text-secondary-foreground font-medium hover:bg-secondary/80 transition-colors"
                >
                  Contact Info
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-muted-foreground">Find quick answers to common questions about our airtime and bundle services.</p>
          </div>
          
          <Accordion 
            items={[
              {
                title: "How long does a transaction take to process?",
                content: "Most transactions (such as Safaricom, Airtel, Telkom airtime and Faiba or Bingwa data bundles) are processed within seconds. In rare cases where there is network congestion with the carrier, it may take up to 3-5 minutes. You can also monitor your live status anytime via our Track Order tool."
              },
              {
                title: "What happens if I enter the wrong recipient phone number?",
                content: "Once airtime or a data bundle has been successfully vended by the telecommunications network, the transaction cannot be reversed. Please always double-check the recipient phone number before confirming your M-Pesa payment."
              },
              {
                title: "Why did my transaction fail?",
                content: "Transactions can fail for reasons such as an M-Pesa timeout, insufficient funds in your M-Pesa wallet, or temporary downtime on the telecom operator's billing node. If a payment succeeds but vending fails, our automated system or support team will ensure your funds are protected and refunded."
              },
              {
                title: "Can I buy airtime or data bundles without creating an account?",
                content: "Yes! QasiNet fully supports guest checkout. Simply select your service, enter the recipient phone number, pay securely via M-Pesa STK push, and receive your receipt and tracking code instantly."
              },
              {
                title: "Is there a limit on how much I can transact?",
                content: "Transaction limits follow Kenyan telco guidelines (e.g., minimum 5 KES for airtime). All package prices and validity details are clearly displayed before you initiate payment."
              }
            ]}
          />
        </div>

      </div>
    </main>
  );
}
