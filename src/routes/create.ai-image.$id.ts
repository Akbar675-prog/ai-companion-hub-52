import { createFileRoute } from "@tanstack/react-router";
import { isUserContentHost } from "@/lib/user-content";
import { readAiImage } from "@/lib/image-gen.server";

/** Gambar hasil generate AI hanya disajikan dari host user content. */
export const Route = createFileRoute("/create/ai-image/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const host =
          request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
        const bare = host.split(":")[0];
        const dev =
          /^(localhost|127\.0\.0\.1)/.test(bare) ||
          host.endsWith(".lovable.app") ||
          host.endsWith(".lovableproject.com");
        if (!isUserContentHost(host) && !dev) return new Response("Not found", { status: 404 });

        const file = await readAiImage(params.id);
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
