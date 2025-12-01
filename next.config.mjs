/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Ensure sql.js runs in a Node context instead of being bundled for RSC/edge
    serverComponentsExternalPackages: ['sql.js'],
  },
};

export default nextConfig;
