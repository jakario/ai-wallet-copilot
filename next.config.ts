import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
    resolveAlias: {
      "@x402/core/client": "./src/lib/empty-module.ts",
      "@x402/evm": "./src/lib/empty-module.ts",
      "@x402/evm/exact/client": "./src/lib/empty-module.ts",
      "@x402/evm/upto/client": "./src/lib/empty-module.ts",
      "@x402/svm/exact/client": "./src/lib/empty-module.ts",
      "pino-pretty": "./src/lib/empty-module.ts",
    },
  },
};

export default nextConfig;
