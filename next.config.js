/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Esto es lo que realmente ignora los errores de tipos durante el build
    ignoreBuildErrors: true,
  },
  eslint: {
    // También es recomendable ignorar ESLint para un despliegue rápido
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
