import { createFileRoute } from "@tanstack/react-router";
import { decodePath, isUserContentHost } from "@/lib/user-content";
import { readAvatar } from "@/lib/account.server";

/** Avatars are only served from galileouserscontent.visora.my.id. */
export const Route = createFileRoute("/u/p/$b64")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const host =
          request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
        const dev = /^(localhost|127\.0\.0\.1)/.test(host.split(":")[0]) ||
          host.endsWith(".lovable.app") ||
          host.endsWith(".lovableproject.com");
        if (!isUserContentHost(host) && !dev) return new Response("Not found", { status: 404 });

        let path: string;
        try {
          path = decodePath(params.b64);
        } catch {
          return new Response("Not found", { status: 404 });
        }
        if (!path || path.includes("..")) return new Response("Not found", { status: 404 });

        const file = await readAvatar(path);
        if (!file) return new Response("Not found", { status: 404 });

        return new Response(file.bytes, {
          status: 200,
          headers: {
            "Content-Type": file.type,
            "Cache-Control": "public, max-age=31536000, immutable",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
    },
  },
});
