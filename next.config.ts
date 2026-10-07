import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: '/privacy-policy', destination: '/?view=privacy', permanent: false },
      { source: '/terms-of-service', destination: '/?view=terms', permanent: false },
      { source: '/log-in', destination: '/auth?view=log-in', permanent: false },
      { source: '/sign-up', destination: '/auth?view=sign-up', permanent: false },
      {
        source: '/forgot-password',
        destination: '/auth?view=forgot-password',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
