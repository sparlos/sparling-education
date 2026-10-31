// Remotion's bundler turns an imported image or video into its URL.
declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.mp4" {
  const src: string;
  export default src;
}
