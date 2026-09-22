import React from "react";
import { DetailedServiceCard } from "@/components/services/DetailedServiceCard";
import type { Metadata } from "next";
import { Smartphone, Zap, Sparkles } from "lucide-react";
import { getGroupedServices } from "@/lib/services/registry";
import { getAllLiveServiceStatuses } from "@/lib/services/service-lock";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

export const dynamic = 'force-dynamic';

const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://qasinet.com';

export const metadata: Metadata = {
  title: "Digital Services & Bundles Directory",
  description: "Browse our complete catalog of certified airtime top-ups and high-speed data bundles across Safaricom, Airtel, Telkom, Equitel, and Faiba with instant M-Pesa delivery.",
  alternates: {
    canonical: "/services",
  },
  openGraph: {
    title: "Digital Services & Bundles Directory | QasiNet",
    description: "Certified airtime top-ups and high-speed data bundles across Kenya.",
    url: `${siteUrl}/services`,
  },
};

export default async function ServicesDirectoryPage() {
  const [liveStatuses, serviceGroups] = await Promise.all([
    getAllLiveServiceStatuses(),
    Promise.resolve(getGroupedServices()),
  ]);

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": siteUrl,
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Services",
        "item": `${siteUrl}/services`,
      },
    ],
  };

  return (
    <div className="flex flex-col min-h-screen pt-4 pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      
      {/* Breadcrumb Navigation */}
      <div className="container mx-auto px-4 md:px-6 max-w-7xl pt-4">
        <Breadcrumbs items={[{ label: "Services" }]} />
      </div>

      {/* Header Banner */}
      <section className="py-8 sm:py-12 text-center max-w-3xl mx-auto px-4 space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" /> Direct Services Marketplace
        </div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-foreground">
          Digital Services Directory
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
          Explore our complete catalogue of certified telecom and high-speed data bundles. Automated M-Pesa delivery guaranteed.
        </p>
      </section>

      {/* Grouped Service Catalog */}
      <div className="container mx-auto px-4 md:px-6 space-y-16 max-w-7xl">
        {serviceGroups.map((group) => {
          const GroupIcon = group.iconName === "Smartphone" ? Smartphone : Zap;
          const iconColor = group.key === "airtime_data" 
            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
            : "bg-amber-500/10 text-amber-500 border border-amber-500/20";

          return (
            <div key={group.key} className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/60">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-2xl ${iconColor}`}>
                    <GroupIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-foreground tracking-tight">
                      {group.title}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {group.tagline}
                    </p>
                  </div>
                </div>

                <span className="text-xs font-semibold text-muted-foreground bg-secondary/60 px-3 py-1 rounded-full w-fit">
                  {group.services.length} services
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {group.services
                  .filter((service) => {
                    const live = liveStatuses[service.id];
                    return live ? live.status !== 'hidden' : service.status !== 'hidden';
                  })
                  .map((service) => {
                    const live = liveStatuses[service.id];
                    const effectiveStatus = live ? live.status : service.status;
                    const effectiveCustomerMessage = live?.customerMessage || service.comingSoonMessage;
                    return (
                      <DetailedServiceCard 
                        key={service.id}
                        id={service.id}
                        title={service.title}
                        description={service.description}
                        logoSrc={service.logoSrc}
                        href={service.href}
                        ctaText={
                          service.category === 'airtime' ? `Buy ${service.shortName}` :
                          service.category === 'data' ? `Browse ${service.shortName}` :
                          service.category === 'electricity' ? `Vend ${service.shortName}` :
                          `Pay ${service.shortName}`
                        }
                        badge={service.badge}
                        status={effectiveStatus}
                        customerMessage={effectiveCustomerMessage}
                        comingSoonMessage={service.comingSoonMessage}
                      />
                    );
                  })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
