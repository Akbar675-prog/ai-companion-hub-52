import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/broadcasts/image/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const { data: row } = await supabaseAdmin
          .from("broadcasts")
          .select("image_content_type")
          .eq("image_id", params.id)
          .maybeSingle();
        if (!row) return new Response("Not found", { status: 404 });

        const { data: file, error } = await supabaseAdmin.storage
          .from("broadcast-images")
          .download(params.id);
        if (error || !file) return new Response("Not found", { status: 404 });

        const buf = await file.arrayBuffer();
        return new Response(buf, {
          status: 200,
          headers: {
            "Content-Type":
              (row as { image_content_type: string | null }).image_content_type ||
              file.type ||
              "application/octet-stream",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
