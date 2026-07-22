/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracing: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      {
        source: '/guide/:id',
        destination: '/guides/:id',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
