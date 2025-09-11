import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // External packages for server components
  serverExternalPackages: ['mongoose'],
  // Experimental features for larger request bodies
  experimental: {
    serverComponentsExternalPackages: ['mongoose'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Handle PDF.js worker files
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
  // Handle static files
  async headers() {
    return [
      {
        source: '/pdf.worker.min.mjs',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
