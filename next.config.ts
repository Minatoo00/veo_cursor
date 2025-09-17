import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    '@google/genai',
    '@google-cloud/vertexai',
    '@google-cloud/storage',
  ],
};

export default nextConfig;
