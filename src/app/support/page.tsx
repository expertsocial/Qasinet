import React from "react";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { HelpCircle, MessageSquare, PhoneCall, Mail } from "lucide-react";
import { SupportForm } from "./SupportForm";
import { Accordion } from "@/components/ui/Accordion";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Support | QasiNet",
  description: "Get help and support for QasiNet services.",
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
            Whether you have a question about a transaction, need technical assistance, or just want to learn more about our services, our team is here for you.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {/* Quick Contact Cards */}
          <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
            <div className="p-3 bg-secondary rounded-xl text-foreground mb-4">
              <PhoneCall className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Call Us</h3>
            <p className="text-sm text-muted-foreground mb-4">Mon-Fri from 8am to 6pm</p>
            <a href="tel:+254116209855" className="text-primary hover:underline font-medium">+254 116 209 855</a>
          </div>

          <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
            <div className="p-3 bg-secondary rounded-xl text-foreground mb-4">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Email Support</h3>
            <p className="text-sm text-muted-foreground mb-4">We usually respond within 24 hours</p>
            <a href="mailto:qasinetltd@gmail.com" className="text-primary hover:underline font-medium">qasinetltd@gmail.com</a>
          </div>

          <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
            <div className="p-3 bg-secondary rounded-xl text-foreground mb-4">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Live Chat</h3>
            <p className="text-sm text-muted-foreground mb-4">Available during business hours</p>
            <button className="text-primary hover:underline font-medium">Start a Chat</button>
          </div>
        </div>

        {/* Ticket Submission Section */}
        <div className="max-w-2xl mx-auto bg-card border border-border/50 rounded-3xl p-8 shadow-sm mb-16">
          <h2 className="text-2xl font-semibold mb-2">Submit a Ticket</h2>
          <p className="text-muted-foreground mb-8">
            Describe your issue in detail and our support team will get back to you as soon as possible.
          </p>
          
          {user ? (
            <SupportForm />
          ) : (
            <div className="text-center p-8 bg-secondary/30 rounded-2xl border border-border/50">
              <h3 className="text-lg font-medium mb-2">Sign in to submit a ticket</h3>
              <p className="text-sm text-muted-foreground mb-6">
                You need to be logged into your QasiNet account to create and track support tickets.
              </p>
              <Link 
                href="/auth/login?redirectTo=/support" 
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-muted-foreground">Find quick answers to common questions about our services.</p>
          </div>
          
          <Accordion 
            items={[
              {
                title: "How long does a transaction take to process?",
                content: "Most transactions (like airtime, data, and tokens) are processed instantly. In rare cases where there is network congestion with the provider, it may take up to 5 minutes. If your transaction is still pending after that, please submit a support ticket."
              },
              {
                title: "What happens if I enter the wrong account number or phone number?",
                content: "Unfortunately, once a transaction is successfully processed to the provider, we cannot reverse it. Please always double-check the recipient phone number or meter number before confirming payment."
              },
              {
                title: "Why did my transaction fail?",
                content: "Transactions can fail for several reasons, such as insufficient balance, provider downtime, or an invalid account number. If a transaction fails, your QasiNet wallet will be refunded immediately."
              },
              {
                title: "How do I top up my wallet?",
                content: "You can top up your wallet using M-Pesa. Go to the 'Wallet' section in your dashboard, click 'Fund Wallet', and follow the prompt to make an STK push payment."
              },
              {
                title: "Is there a limit on how much I can transact?",
                content: "Yes, minimum and maximum transaction limits apply depending on the service (e.g., minimum 5 KES for airtime). These limits are displayed on the checkout page before you complete a purchase."
              }
            ]}
          />
        </div>

      </div>
    </main>
  );
}
