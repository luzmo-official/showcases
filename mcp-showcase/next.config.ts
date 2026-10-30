import type { NextConfig } from "next";

const luzmoApiHost = process.env.LUZMO_API_HOST || "https://api.luzmo.com";

const nextConfig: NextConfig = {
  transpilePackages: ["@luzmo/react-embed", "@luzmo/embed"],
  serverExternalPackages: ["@luzmo/nodejs-sdk"],
  async rewrites() {
    return [
      {
        source: "/0.1.0/:path*",
        destination: `${luzmoApiHost}/0.1.0/:path*`,
      },
      {
        source: "/realtime/:path*",
        destination: `${luzmoApiHost}/realtime/:path*`,
      },
    ];
  },
};

export default nextConfig;
