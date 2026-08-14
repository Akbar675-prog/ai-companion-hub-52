/** Host that serves user uploaded content (avatars). */
export const USER_CONTENT_HOST = "galileouserscontent.visora.my.id";
export const USER_CONTENT_ORIGIN = `https://${USER_CONTENT_HOST}`;

export function isUserContentHost(host?: string | null): boolean {
  const h = (host ?? "").split(":")[0].trim().toLowerCase();
  return h === USER_CONTENT_HOST;
}

export function encodePath(path: string): string {
  const b64 = btoa(unescape(encodeURIComponent(path)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_");
}

export function decodePath(token: string): string {
  const b64 = token.replace(/-/g, "+").replace(/_/g, "/");
  return decodeURIComponent(escape(atob(b64)));
}

export function avatarUrlFor(path: string): string {
  return `${USER_CONTENT_ORIGIN}/u/p/${encodePath(path)}`;
}
