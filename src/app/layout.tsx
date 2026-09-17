import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { PWAProvider } from "@/components/pwa/PWAProvider";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://qasinet.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "QasiNet | Instant Airtime & Data Bundles in Kenya",
    template: "%s | QasiNet",
  },
  description: "Buy Safaricom, Airtel, Telkom, Equitel, and Faiba airtime or high-speed data bundles with instant automated M-Pesa delivery across Kenya.",
  keywords: [
    "buy airtime online Kenya",
    "buy Safaricom airtime M-Pesa",
    "Faiba data bundles online",
    "Airtel airtime Kenya",
    "Telkom airtime top up",
    "Equitel airtime online",
    "Bingwa Sokoni data bundles",
    "cheap 4G data Kenya",
    "instant airtime top up",
    "QasiNet",
  ],
  authors: [{ name: "QasiNet Ltd" }],
  creator: "QasiNet Ltd",
  publisher: "QasiNet Ltd",
  formatDetection: {
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "QasiNet | Instant Airtime & Data Bundles in Kenya",
    description: "Buy airtime and high-speed data bundles across Safaricom, Airtel, Telkom, Equitel, and Faiba with instant automated M-Pesa delivery.",
    url: siteUrl,
    siteName: "QasiNet",
    locale: "en_KE",
    type: "website",
    images: [
      {
        url: "/icon.jpeg",
        width: 512,
        height: 512,
        alt: "QasiNet - Instant Airtime & Data Bundles",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "QasiNet | Instant Airtime & Data Bundles in Kenya",
    description: "Instant M-Pesa airtime and data bundles top-up across all Kenyan mobile networks.",
    images: ["/icon.jpeg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || '8ZLWD4On8ut6TXjnbmwjoMRlWTsBH706ri7MK94oHbo',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "QasiNet Ltd",
    "alternateName": "QasiNet",
    "url": siteUrl,
    "logo": `${siteUrl}/icon.jpeg`,
    "description": "Kenya's dedicated digital-services platform for instant airtime top-ups and high-speed data bundles.",
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+254116209855",
      "contactType": "customer service",
      "areaServed": "KE",
      "availableLanguage": ["English", "Swahili"],
    },
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Nairobi",
      "addressCountry": "KE",
    },
  };

  const webSiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "QasiNet",
    "url": siteUrl,
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${siteUrl}/track?ref={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteSchema) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
        suppressHydrationWarning
      >
        <Providers attribute="class" defaultTheme="dark" enableSystem>
          <PWAProvider>
            <Navbar />
            <main className="flex-grow pt-24">
              {children}
            </main>
            <Footer />
          </PWAProvider>
        </Providers>
      </body>
    </html>
  );
}
