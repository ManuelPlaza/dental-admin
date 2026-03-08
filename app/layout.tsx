import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

// Outfit is loaded via the @import in globals.css (browser-side).
// Using next/font/google is avoided so the build doesn't require
// network access to fonts.googleapis.com at build time.

export const metadata: Metadata = {
  title: "Dental JC | Panel Admin",
  description: "Panel de administración Técnica Dental JC",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}