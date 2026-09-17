import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Customer Support | 24/7 Helpdesk",
  description: "Get in touch with the QasiNet support team. Reach us via phone (+254 116 209 855), email, or our direct contact form for instant purchase assistance.",
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: "Contact Support | QasiNet",
    description: "24/7 assistance for your airtime and data bundle transactions.",
    url: "/contact",
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
