import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });

export const metadata: Metadata = {
  title: "Dental JC | Panel Admin",
  description: "Panel de administración Técnica Dental JC",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${outfit.variable} font-sans`}>{children}</body>
    </html>
  );
}
