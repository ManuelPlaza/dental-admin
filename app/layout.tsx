import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import SplashScreen from "@/components/SplashScreen";

// Outfit is loaded via the @import in globals.css (browser-side).
// Using next/font/google is avoided so the build doesn't require
// network access to fonts.googleapis.com at build time.

export const metadata: Metadata = {
  title: "Dental JC | Panel Admin",
  description: "Panel de administración Técnica Dental JC",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon-32.png",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0F2A47",
};

// Si ya se vio la pantalla de carga en esta sesión, se oculta antes del primer
// pintado para que no parpadee al recargar.
const splashGuard = `try{if(sessionStorage.getItem("dental_splash_seen"))document.documentElement.setAttribute("data-splash","seen")}catch(e){}`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <script dangerouslySetInnerHTML={{ __html: splashGuard }} />
      </head>
      <body>
        <SplashScreen />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
