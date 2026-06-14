import withPWAInit from "@ducanh2912/next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: 'www.google.com',
      },
      {
        hostname: 'www.google-analytics.com',
      },
      {
        hostname: 'localhost',
      }
    ],
  },
  // Proxy /outputs and /api/outputs requests to the backend server
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';
    return [
      {
        source: '/api/outputs/:path*',
        destination: `${backendUrl}/api/outputs/:path*`,
      },
      {
        source: '/outputs/:path*',
        destination: `${backendUrl}/outputs/:path*`,
      },
    ];
  },
};

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

export default withPWA(nextConfig);
