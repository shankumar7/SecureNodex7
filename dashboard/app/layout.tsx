import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "../context/ThemeContext";

export const metadata: Metadata = {
  title: "SecureNodeX — Control & Audit Plane",
  description: "Zero-trust cryptographic edge cluster and decentralized storage engine.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light" className="light" suppressHydrationWarning>
      <body className="min-h-screen antialiased selection:bg-indigo-500/20 selection:text-indigo-900">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
