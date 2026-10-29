import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SecureNodeX Control Plane",
  description: "Decentralised ECC-secured platform for IoT device identity, RBAC, digital assets, and split storage.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-snx-bg text-gray-100 antialiased">
        {children}
      </body>
    </html>
  );
}
