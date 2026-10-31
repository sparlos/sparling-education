/** @type {import('next').NextConfig} */
const nextConfig = {
  // One static page, so the build is plain files for Cloudflare to serve.
  output: "export",
  // The product's wordmark comes from @repo/ui, its name from @repo/tokens.
  transpilePackages: ["@repo/ui", "@repo/tokens"],
};

export default nextConfig;
