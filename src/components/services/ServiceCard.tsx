import React from "react";
import Image from "next/image";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface ServiceCardProps {
  title: string;
  logoSrc: string;
  onClick?: () => void;
  className?: string;
  delay?: number;
}

export function ServiceCard({
  title,
  logoSrc,
  onClick,
  className,
  delay = 0,
}: ServiceCardProps) {
  return (
    <Card
      onClick={onClick}
      style={{ animationDelay: `${delay}ms` }}
      className={cn(
        "group cursor-pointer overflow-hidden relative animate-slide-up bg-card hover:bg-accent border-border hover:border-primary/30",
        "flex flex-col items-center justify-center p-6 gap-4 min-h-[160px]",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center overflow-hidden p-2 group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
        <Image
          src={logoSrc}
          alt={title}
          fill
          className="object-contain p-1"
          sizes="64px"
        />
      </div>
      
      <h3 className="font-medium text-center text-sm md:text-base group-hover:text-primary transition-colors">
        {title}
      </h3>
    </Card>
  );
}
