import React from "react";
import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

interface DetailedServiceCardProps {
  id: string;
  title: string;
  description: string;
  logoSrc: string;
  href: string;
  ctaText: string;
}

export function DetailedServiceCard({
  title,
  description,
  logoSrc,
  href,
  ctaText,
}: DetailedServiceCardProps) {
  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/50 bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/50">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      
      <div className="relative z-10">
        <div className="mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-border/50 p-2">
          <Image
            src={logoSrc}
            alt={`${title} logo`}
            width={64}
            height={64}
            className="h-full w-full object-contain"
          />
        </div>
        
        <h3 className="mb-2 text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h3>
        <p className="mb-6 text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>

      <div className="relative z-10 mt-auto pt-4 border-t border-border/50">
        <Link
          href={href}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "w-full group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary gap-2 transition-colors"
          )}
        >
          {ctaText} <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
