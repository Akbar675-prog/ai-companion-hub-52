import { createServerFn } from "@tanstack/react-start";

/** Hostname of the incoming request (SSR only; the client reads window.location). */
export const getRequestHostFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ host: string }> => {
    const { getRequestHost } = await import("@tanstack/react-start/server");
    try {
      return { host: getRequestHost({ xForwardedHost: true }) };
    } catch {
      return { host: "" };
    }
  },
);
