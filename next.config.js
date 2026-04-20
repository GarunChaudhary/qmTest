/** @type {import('next').NextConfig} */
const nextConfig = {
 // reactStrictMode: true, // Ensures React runs in strict mode
 productionBrowserSourceMaps: true, // Enables source maps for debugging in production
 // distDir: "build-output",
  async headers() {
    return [
      {
        source: "/call-monitoring-widget",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://*.cisco.com;",
          },
        ],
      },
      {
        source: "/call-monitoring-widget/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://*.cisco.com;",
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.pexels.com",
      },
      {
        protocol: "https",
        hostname: "commondatastorage.googleapis.com",
      },
    ],
  },
};

module.exports = nextConfig;
