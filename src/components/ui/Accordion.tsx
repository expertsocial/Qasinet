"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccordionProps {
  items: {
    title: string;
    content: React.ReactNode;
  }[];
  className?: string;
}

export function Accordion({ items, className }: AccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleItem = (index: number) => {
    setOpenIndex((current) => (current === index ? null : index));
  };

  return (
    <div className={cn("w-full space-y-4", className)}>
      {items.map((item, index) => {
        const isOpen = openIndex === index;

        return (
          <div
            key={index}
            className={cn(
              "glass-panel border rounded-2xl overflow-hidden transition-all duration-300",
              isOpen ? "border-primary/50 shadow-premium-soft" : "border-border"
            )}
          >
            <button
              onClick={() => toggleItem(index)}
              className="flex w-full items-center justify-between px-6 py-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-expanded={isOpen}
            >
              <span className="font-semibold text-base md:text-lg text-foreground pr-4">
                {item.title}
              </span>
              <div
                className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
                  isOpen ? "bg-primary text-primary-foreground rotate-180" : "bg-primary/10 text-primary"
                )}
              >
                <ChevronDown className="w-5 h-5" />
              </div>
            </button>
            <div
              className={cn(
                "overflow-hidden transition-all duration-300 ease-in-out",
                isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
              )}
            >
              <div className="px-6 pb-6 pt-0 text-muted-foreground text-sm md:text-base leading-relaxed">
                {item.content}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
