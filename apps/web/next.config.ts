import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@my-barber/types', '@my-barber/config'],
  output: 'export',
};

export default nextConfig;
