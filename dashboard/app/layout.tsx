import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SecureNodeX — Control & Audit Plane",
  description: "Minimalist, zero-trust cryptographic edge cluster and decentralized storage engine.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light">
      <body className="min-h-screen bg-[#fbfbfa] text-zinc-900 antialiased selection:bg-zinc-200 selection:text-zinc-900">
        {children}
      </body>
    </html>
  );
}
