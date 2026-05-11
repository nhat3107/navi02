/** Cloudinary resource URLs include `/video/upload/` for video deliveries. */
export function isCloudinaryVideoUrl(url: string): boolean {
  return /\/video\/upload\//.test(url);
}
