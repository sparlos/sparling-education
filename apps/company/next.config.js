/** @type {import('next').NextConfig} */
const nextConfig = {
  // The product's wordmark comes from @repo/ui, its name from @repo/tokens.
  transpilePackages: ["@repo/ui", "@repo/tokens"],
};

export default nextConfig;
