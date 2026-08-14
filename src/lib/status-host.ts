/** Hostnames that decide where the status page lives. */
export const MAIN_HOST = "galileomodapk.visora.my.id";
export const STATUS_HOST = "status.galileomodapk.visora.my.id";
export const MAIN_ORIGIN = `https://${MAIN_HOST}`;
export const STATUS_ORIGIN = `https://${STATUS_HOST}`;

function normalize(host?: string | null): string {
  return (host ?? "").split(":")[0].trim().toLowerCase();
}

/** True when the request came in on the dedicated status subdomain. */
export function isStatusHost(host?: string | null): boolean {
  const h = normalize(host);
  return h === STATUS_HOST || h.startsWith("status.");
}

/** True when the request came in on the public site domain. */
export function isMainHost(host?: string | null): boolean {
  const h = normalize(host);
  return h === MAIN_HOST || h === `www.${MAIN_HOST}`;
}

/** Localhost + Lovable preview hosts: everything stays reachable for testing. */
export function isDevHost(host?: string | null): boolean {
  const h = normalize(host);
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h.endsWith(".lovable.app") ||
    h.endsWith(".lovableproject.com")
  );
}

/** Resolve the host both on the client and during SSR. */
export async function currentHost(): Promise<string> {
  if (typeof window !== "undefined") return window.location.host;
  try {
    const { getRequestHostFn } = await import("./host.functions");
    const res = await getRequestHostFn();
    return res.host;
  } catch {
    return "";
  }
}
