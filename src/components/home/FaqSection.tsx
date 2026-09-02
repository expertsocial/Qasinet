import React from "react";
import { Accordion } from "@/components/ui/Accordion";
import { buttonVariants } from "@/components/ui/Button";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export function FaqSection() {
  const faqItems = [
    {
      title: "Do I need an account to use QasiNet?",
      content: "No, you do not need an account. QasiNet is service-first, meaning you can purchase airtime, data, or pay bills instantly as a guest. However, creating an account helps you track your transaction history and speeds up future purchases.",
    },
    {
      title: "How do I purchase a service?",
      content: "Simply select the service you want (e.g., Airtime, KPLC) from our homepage, enter your phone or account number, choose the amount, and proceed to checkout. You will pay securely via Mobile Money and your service will be vended immediately.",
    },
    {
      title: "How do I track a transaction?",
      content: "You can track any transaction by clicking on 'Track Transaction' in the navigation menu. Enter your Transaction ID or the phone number used during the purchase to see the real-time status of your order.",
    },
    {
      title: "What happens if a transaction is pending?",
      content: "Sometimes network delays can cause a transaction to remain in a 'Pending' state. Do not worry. Our system continuously monitors pending transactions. Once the network confirms the status, your service will be delivered. You can use the Track Transaction tool to check for updates.",
    },
    {
      title: "What happens if payment succeeds but vending is pending?",
      content: "If your Mobile Money payment is deducted but the service provider (like KPLC or Safaricom) is experiencing downtime, your vending status will show as pending. Our system will automatically retry the vending process until it succeeds. If it fails permanently, the system will initiate a refund.",
    },
    {
      title: "How do I get my receipt?",
      content: "Once your transaction is successful, a digital receipt is generated instantly. You can download it directly from the success page. If you have an account, all your receipts are saved in your transaction history.",
    },
    {
      title: "How do I contact support?",
      content: "Our customer support team is available 24/7. You can reach out to us by clicking the 'Help' link in the navigation menu, calling our toll-free number, or messaging us directly via WhatsApp or Email.",
    },
  ];

  return (
    <section className="py-20 md:py-32 bg-secondary/30 relative">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* FAQ Header & CTA */}
          <div className="lg:col-span-5 lg:sticky lg:top-32">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
              Frequently Asked <span className="text-primary">Questions</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Everything you need to know about purchasing digital services and paying bills on QasiNet. Can't find the answer you're looking for?
            </p>
            <Link href="/contact" className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto gap-2 inline-flex")}>
              <MessageSquare className="w-5 h-5" />
              Contact Support
            </Link>
          </div>

          {/* FAQ Accordion */}
          <div className="lg:col-span-7">
            <Accordion items={faqItems} />
          </div>

        </div>
      </div>
    </section>
  );
}
