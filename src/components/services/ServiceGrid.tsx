"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ServiceCard } from "./ServiceCard";

const services = [
  {
    id: "safaricom-airtime",
    title: "Safaricom Airtime",
    logoSrc: "/logos/safaricom logo.png",
    category: "airtime",
  },
  {
    id: "airtel-airtime",
    title: "Airtel Airtime",
    logoSrc: "/logos/airtel logo.jpg",
    category: "airtime",
  },
  {
    id: "telkom-airtime",
    title: "Telkom Airtime",
    logoSrc: "/logos/telcom logo.png",
    category: "airtime",
  },
  {
    id: "equitel-airtime",
    title: "Equitel Airtime",
    logoSrc: "/logos/Equitel logo.jpg",
    category: "airtime",
  },
  {
    id: "faiba-airtime",
    title: "Faiba Airtime",
    logoSrc: "/logos/Faiba logo.png",
    category: "airtime",
  },
  {
    id: "kplc-prepaid",
    title: "KPLC Tokens",
    logoSrc: "/logos/kenya power logo.jpg",
    category: "electricity",
  },
  {
    id: "dstv",
    title: "DStv",
    logoSrc: "/logos/dstv logo.jpg",
    category: "tv",
  },
  {
    id: "gotv",
    title: "GOtv",
    logoSrc: "/logos/Gotv logo.png",
    category: "tv",
  },
  {
    id: "zuku",
    title: "Zuku",
    logoSrc: "/logos/zuku logo.jpg",
    category: "tv",
  },
  {
    id: "startimes",
    title: "StarTimes",
    logoSrc: "/logos/startimes logo.jpg",
    category: "tv",
  },
  {
    id: "nairobi-water",
    title: "Nairobi Water",
    logoSrc: "/logos/water service logo.jpg",
    category: "water",
  },
];

export function ServiceGrid() {
  const router = useRouter();

  const handleServiceClick = (category: string, serviceId: string) => {
    // Navigate to the respective service category page, optionally passing the selected provider
    router.push(`/services/${category}?provider=${serviceId}`);
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
        {services.map((service, index) => (
          <ServiceCard
            key={service.id}
            title={service.title}
            logoSrc={service.logoSrc}
            delay={index * 50}
            onClick={() => handleServiceClick(service.category, service.id)}
          />
        ))}
      </div>
    </div>
  );
}
