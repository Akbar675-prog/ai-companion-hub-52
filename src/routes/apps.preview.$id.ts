import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/apps/preview/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const { data: signed } = await supabaseAdmin.storage
          .from("app-icons")
          .createSignedUrl(`PREVIEWS/${params.id}`, 60 * 60 * 24 * 365);
        if (!signed?.signedUrl)
          return new Response("Not found", { status: 404 });
        return new Response(null, {
          status: 302,
          headers: {
            Location: signed.signedUrl,
            "Cache-Control": "public, max-age=86400",
          },
        });
      },
    },
  },
});
