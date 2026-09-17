import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://qasinet.vercel.app';

export const metadata: Metadata = {
  title: "Buy Data Bundles Online Kenya | Faiba, Safaricom & Airtel Packages",
  description: "Instant high-speed internet data bundles in Kenya. Buy Faiba 4G bundles, Safaricom Super & Okoa-friendly bundles, and Airtel data with automated M-Pesa delivery.",
  keywords: [
    "Faiba data bundles online Kenya",
    "buy Safaricom data bundles",
    "Airtel data bundles M-Pesa",
    "Faiba 4G bundles",
    "Bingwa Sokoni data bundles",
    "cheap data bundles Kenya",
    "buy internet bundles online",
  ],
  alternates: {
    canonical: "/services/data",
  },
  openGraph: {
    title: "Buy Data Bundles Online Kenya | Faiba, Safaricom & Airtel - QasiNet",
    description: "Instant data bundles for Faiba, Safaricom, and Airtel lines with automated M-Pesa delivery.",
    url: `${siteUrl}/services/data`,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Buy Data Bundles Online Kenya | QasiNet",
    description: "Instant data bundle activation for Faiba, Safaricom, and Airtel.",
  },
};

export default function DataLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
      {
        "@type": "ListItem",
        "position": 3,
        "name": "Buy Data Bundles",
        "item": `${siteUrl}/services/data`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {children}
    </>
  );
}
