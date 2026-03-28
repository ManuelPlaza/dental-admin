/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  // Disable React Strict Mode to prevent double-invocation of effects in development.
  // Strict Mode intentionally mounts/unmounts components twice in dev to surface
  // side-effect bugs — this causes every API call to fire twice in localhost.
  // Production (Railway) is unaffected: Strict Mode has no effect in production builds.
  reactStrictMode: false,

  // ── HTTP Security Headers ────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent browsers from sniffing content-type
          { key: "X-Content-Type-Options",   value: "nosniff" },
          // Block click-jacking
          { key: "X-Frame-Options",           value: "DENY" },
          // Force HTTPS for 1 year (enable in production behind TLS)
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          // Restrict referrer information leakage
          { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
          // Disable browser features not needed by this app
          {
            key:   "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          // Content Security Policy
          // – default-src 'self': only same-origin by default
          // – script-src 'self' 'unsafe-inline' 'unsafe-eval': Next.js requires these for RSC/hydration
          // – style-src 'self' 'unsafe-inline' fonts.googleapis.com: Tailwind inline styles + Google Fonts CSS
          // – font-src 'self' fonts.gstatic.com: Google Fonts files
          // – img-src 'self' data: blob:: allow local images, data URIs, and blob URLs
          // – connect-src 'self' <API>: only allow API calls to configured backend
          {
            key:   "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob:",
              `connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}`,
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
