const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

/**
 * If the image URL is from a carsforsale CDN (which blocks hotlinking),
 * route it through our proxy edge function. Otherwise return as-is.
 */
export function proxyImageUrl(url: string): string {
  if (!url) return url;
  if (/cdn\d+\.carsforsale\.com/.test(url)) {
    return `${SUPABASE_URL}/functions/v1/proxy-image?url=${encodeURIComponent(url)}`;
  }
  return url;
}
