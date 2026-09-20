import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://qasinet.com';

export const metadata: Metadata = {
  title: "Buy Airtime Online Kenya | Safaricom, Airtel, Telkom, Equitel, Faiba",
  description: "Instant airtime top-up for Safaricom, Airtel, Telkom, Equitel, and Faiba networks with automated M-Pesa delivery. 24/7 instant vending across Kenya.",
  keywords: [
    "buy Safaricom airtime online Kenya",
    "Airtel airtime M-Pesa",
    "Telkom Kenya airtime top up",
    "Equitel airtime online",
    "Faiba airtime top up",
    "instant airtime vending",
    "buy airtime with M-Pesa",
  ],
  alternates: {
    canonical: "/services/airtime",
  },
  openGraph: {
    title: "Buy Airtime Online Kenya | Instant M-Pesa Vending - QasiNet",
    description: "Top up Safaricom, Airtel, Telkom, Equitel, or Faiba airtime instantly with automated M-Pesa processing.",
    url: `${siteUrl}/services/airtime`,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Buy Airtime Online Kenya | QasiNet",
    description: "Instant airtime top-up for Safaricom, Airtel, Telkom, Equitel, and Faiba.",
  },
};

export default function AirtimeLayout({
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
        "name": "Buy Airtime",
        "item": `${siteUrl}/services/airtime`,
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
