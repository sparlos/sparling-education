/** @type {import('next').NextConfig} */
const nextConfig = {
  // One static page, so the build is plain files for Cloudflare to serve.
  output: "export",
  // No server to resize images on request, so <Image> serves the files as-is.
  images: { unoptimized: true },
  // The product's wordmark comes from @repo/ui, its name from @repo/tokens.
  transpilePackages: ["@repo/ui", "@repo/tokens"],
};

export default nextConfig;
