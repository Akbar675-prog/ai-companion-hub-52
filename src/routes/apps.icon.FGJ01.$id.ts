import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/apps/icon/FGJ01/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const { data: signed } = await supabaseAdmin.storage
          .from("app-icons")
          .createSignedUrl(`FGJ01/${params.id}`, 60 * 60 * 24 * 365);
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
