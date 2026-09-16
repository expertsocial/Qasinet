import type { NextConfig } from "next";
import { assertDeploymentSafeguards } from "./src/lib/startup-check";

// Deployment Safeguard: Fail loudly on build/startup if electricity is enabled but channel code is blank
assertDeploymentSafeguards();

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [32, 48, 64, 96, 128, 256],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
