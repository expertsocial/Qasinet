import React from "react";
import { MousePointerClick, FileText, CreditCard, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function HowItWorks() {
  const steps = [
    {
      icon: MousePointerClick,
      title: "Choose a Service",
      description: "Select Airtime, Data, TV, or Electricity from our dashboard.",
    },
    {
      icon: FileText,
      title: "Enter Details",
      description: "Provide the necessary account or phone number.",
    },
    {
      icon: CreditCard,
      title: "Review & Pay",
      description: "Confirm details and pay securely via Mobile Money.",
    },
    {
      icon: CheckCircle,
      title: "Get Confirmed",
      description: "Service is delivered instantly with a digital receipt.",
    },
  ];

  return (
    <section className="py-20 md:py-32 relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
            How Qasi<span className="text-primary">Net</span> Works
          </h2>
          <p className="text-lg text-muted-foreground">
            Experience the simplest way to purchase digital services and pay your bills in four easy steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {/* Connecting line for desktop */}
          <div className="hidden lg:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-border -z-10" />

          {steps.map((step, index) => (
            <div key={step.title} className="flex flex-col items-center text-center group">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-3xl bg-background border-2 border-primary/20 flex items-center justify-center shadow-sm group-hover:shadow-premium-hover group-hover:-translate-y-1 group-hover:border-primary/50 transition-all duration-300">
                  <step.icon className="w-10 h-10 text-primary" />
                </div>
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-sm shadow-sm">
                  {index + 1}
                </div>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
