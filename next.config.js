// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['assets.coingecko.com', 'coin-images.coingecko.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.coingecko.com',
      },
    ],
  },
  // Ensure CSS is properly handled
  experimental: {
    optimizeCss: true,
  },
};

module.exports = nextConfig;