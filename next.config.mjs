/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Configure image domains if needed for external images
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },

  // Environment variables that should be available to the browser
  // NOTE: NEXT_PUBLIC_ prefix makes variables available client-side
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },

  // Mark Puppeteer and related packages as external
  // This prevents Webpack from trying to bundle them (they use dynamic require)
  experimental: {
    serverComponentsExternalPackages: [
      "puppeteer",
      "puppeteer-core",
      "puppeteer-extra",
      "puppeteer-extra-plugin-stealth",
      "clone-deep",
      "merge-deep",
    ],
  },

  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude puppeteer from webpack bundling on server
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push({
          puppeteer: "commonjs puppeteer",
          "puppeteer-core": "commonjs puppeteer-core",
          "puppeteer-extra": "commonjs puppeteer-extra",
          "puppeteer-extra-plugin-stealth": "commonjs puppeteer-extra-plugin-stealth",
        });
      }
    }
    return config;
  },

  // Redirects for legacy routes if needed
  async redirects() {
    return [];
  },
};

export default nextConfig;
