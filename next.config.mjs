/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['oxtbseyzixridlqsplam.supabase.co'],
  },
  experimental: {
    serverComponentsExternalPackages: ['ics'],
  },
};

export default nextConfig; 