import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: '/privacy-policy', destination: '/?view=privacy', permanent: false },
      { source: '/terms-of-service', destination: '/?view=terms', permanent: false },
    ];
  },
};

export default nextConfig;
