import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Track Transaction Status & M-Pesa Vending",
  description: "Verify and track your QasiNet airtime or data bundle purchase in real-time. Enter your Transaction Reference or phone number to check live vending delivery.",
  alternates: {
    canonical: "/track",
  },
  openGraph: {
    title: "Track Transaction Status | QasiNet",
    description: "Real-time audit and tracking for all QasiNet purchases.",
    url: "/track",
  },
};

export default function TrackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
