/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'www.certistage.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  // Optimize production builds
  productionBrowserSourceMaps: false,
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  async redirects() {
    // Passwords were retired: sign-in uses an emailed one-time code
    return [
      { source: "/forgot-password", destination: "/client/login", permanent: false },
      { source: "/reset-password", destination: "/client/login", permanent: false },
    ]
  },
}

export default nextConfig
