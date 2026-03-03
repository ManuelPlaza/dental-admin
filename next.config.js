/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Esto ayuda a evitar errores de prerenderizado en algunos entornos
  output: 'standalone', 
}

module.exports = nextConfig
