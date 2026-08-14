/**
 * supabase-js encodes the `download` option with encodeURIComponent and then
 * runs it through URLSearchParams, which escapes the `%` again. The Storage API
 * therefore receives a double-encoded name and emits
 * `Duolingo_6.89.4 %28Max%29.apk` instead of `Duolingo_6.89.4 (Max).apk`.
 *
 * Fix: sign without the download option and append the parameter ourselves,
 * encoded exactly once.
 */
export function withDownloadName(signedUrl: string, filename: string): string {
  const clean = filename.replace(/[\r\n"]/g, "").trim() || "download.apk";
  const sep = signedUrl.includes("?") ? "&" : "?";
  return `${signedUrl}${sep}download=${encodeURIComponent(clean)}`;
}
