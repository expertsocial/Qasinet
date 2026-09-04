"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ServiceCard } from "./ServiceCard";
import { Smartphone, Wifi, Zap, Tv, Droplets, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

interface ServiceItem {
  id: string;
  title: string;
  category: "airtime" | "data" | "electricity" | "tv" | "water";
  categoryLabel: string;
  logoSrc: string;
  badge: string;
  tagline: string;
}

const services: ServiceItem[] = [
  {
    id: "safaricom-airtime",
    title: "Safaricom Airtime",
    category: "airtime",
    categoryLabel: "Airtime",
    logoSrc: "/logos/safaricom-logo.png",
    badge: "0% Fee",
    tagline: "Instant Top-Up",
  },
  {
    id: "airtel-airtime",
    title: "Airtel Airtime",
    category: "airtime",
    categoryLabel: "Airtime",
    logoSrc: "/logos/airtel-logo.jpg",
    badge: "0% Fee",
    tagline: "Instant Top-Up",
  },
  {
    id: "telkom-airtime",
    title: "Telkom Airtime",
    category: "airtime",
    categoryLabel: "Airtime",
    logoSrc: "/logos/telcom-logo.png",
    badge: "0% Fee",
    tagline: "Instant Top-Up",
  },
  {
    id: "faiba-airtime",
    title: "Faiba 4G Airtime",
    category: "airtime",
    categoryLabel: "Airtime",
    logoSrc: "/logos/faiba-logo.png",
    badge: "0% Fee",
    tagline: "Instant Top-Up",
  },
  {
    id: "equitel-airtime",
    title: "Equitel Airtime",
    category: "airtime",
    categoryLabel: "Airtime",
    logoSrc: "/logos/equitel-logo.jpg",
    badge: "0% Fee",
    tagline: "Instant Top-Up",
  },
  {
    id: "safaricom-data",
    title: "Safaricom Data Bundles",
    category: "data",
    categoryLabel: "Data",
    logoSrc: "/logos/safaricom-logo.png",
    badge: "Daily/Weekly",
    tagline: "High-Speed 4G/5G",
  },
  {
    id: "airtel-data",
    title: "Airtel Bamba Bundles",
    category: "data",
    categoryLabel: "Data",
    logoSrc: "/logos/airtel-logo.jpg",
    badge: "Hot Deals",
    tagline: "Non-Stop Internet",
  },
  {
    id: "faiba-data",
    title: "Faiba Data Packages",
    category: "data",
    categoryLabel: "Data",
    logoSrc: "/logos/faiba-logo.png",
    badge: "Best Rates",
    tagline: "Superfast 4G+",
  },
  {
    id: "telkom-data",
    title: "Telkom Data Bundles",
    category: "data",
    categoryLabel: "Data",
    logoSrc: "/logos/telcom-logo.png",
    badge: "Value",
    tagline: "Freedom Plans",
  },
  {
    id: "kplc-prepaid",
    title: "KPLC Prepaid Tokens",
    category: "electricity",
    categoryLabel: "Electricity",
    logoSrc: "/logos/kenya-power-logo.jpg",
    badge: "24/7 Vend",
    tagline: "Instant Meter Token",
  },
  {
    id: "kplc-postpaid",
    title: "KPLC Postpaid Bill",
    category: "electricity",
    categoryLabel: "Electricity",
    logoSrc: "/logos/kenya-power-logo.jpg",
    badge: "Verified",
    tagline: "Direct Bill Pay",
  },
  {
    id: "dstv",
    title: "DStv Subscription",
    category: "tv",
    categoryLabel: "TV & Media",
    logoSrc: "/logos/dstv-logo.jpg",
    badge: "Instant Clear",
    tagline: "Premium Channels",
  },
  {
    id: "gotv",
    title: "GOtv Subscription",
    category: "tv",
    categoryLabel: "TV & Media",
    logoSrc: "/logos/gotv-logo.png",
    badge: "Instant Clear",
    tagline: "Digital Decoder Pay",
  },
  {
    id: "startimes",
    title: "StarTimes Decoder",
    category: "tv",
    categoryLabel: "TV & Media",
    logoSrc: "/logos/startimes-logo.jpg",
    badge: "Instant",
    tagline: "Smartcard Recharge",
  },
  {
    id: "zuku",
    title: "Zuku Satellite TV",
    category: "tv",
    categoryLabel: "TV & Media",
    logoSrc: "/logos/zuku-logo.jpg",
    badge: "Instant",
    tagline: "Fiber & Decoder",
  },
  {
    id: "nairobi-water",
    title: "Nairobi Water Utility",
    category: "water",
    categoryLabel: "Water",
    logoSrc: "/logos/water-service-logo.jpg",
    badge: "Auto Detect",
    tagline: "Direct Bill Settle",
  },
];

const categories = [
  { id: "all", label: "All Services", icon: LayoutGrid },
  { id: "airtime", label: "Airtime", icon: Smartphone },
  { id: "data", label: "Data Bundles", icon: Wifi },
  { id: "electricity", label: "Electricity", icon: Zap },
  { id: "tv", label: "TV Subscriptions", icon: Tv },
  { id: "water", label: "Water", icon: Droplets },
];

export function ServiceGrid() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const filteredServices = selectedCategory === "all"
    ? services
    : services.filter(s => s.category === selectedCategory);

  const handleServiceClick = (category: string, serviceId: string) => {
    router.push(`/services/${category}?provider=${serviceId}`);
  };

  return (
    <div className="w-full space-y-8">
      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none justify-start sm:justify-center">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 border",
                isSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                  : "bg-card/70 hover:bg-card text-muted-foreground hover:text-foreground border-border/80"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Grid of Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {filteredServices.map((service, index) => (
          <ServiceCard
            key={service.id}
            title={service.title}
            category={service.categoryLabel}
            logoSrc={service.logoSrc}
            badge={service.badge}
            tagline={service.tagline}
            delay={index * 30}
            onClick={() => handleServiceClick(service.category, service.id)}
          />
        ))}
      </div>
    </div>
  );
}
