/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
        pathname: "/**",
      },
    ],
  },
  eslint: {
    // Linting is run separately in CI; don't fail local builds on warnings.
    ignoreDuringBuilds: false,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
