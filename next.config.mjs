import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // typedRoutes removed to allow placeholder routes
  serverExternalPackages: [],
  turbopack: {
    // Force turbopack to use this directory as workspace root (avoid parent lockfile)
    root: __dirname
  }
};

export default nextConfig;
