import { createFileRoute } from "@tanstack/react-router";

function fromBase64Url(input: string): string | null {
  try {
    const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    return atob(b64 + pad);
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/apps/gyps/$b64")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = fromBase64Url(params.b64);
        if (!id) return new Response("Bad request", { status: 400 });

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const { readIndex } = await import("@/lib/metadata.functions");
        const { data: row } = await supabaseAdmin
          .from("apps")
          .select("app_name, apk_id, download_url")
          .eq("id", id)
          .maybeSingle();
        if (!row) return new Response("Not found", { status: 404 });

        const apkId = (row as { apk_id?: string | null }).apk_id;
        if (!apkId) {
          const url = (row as { download_url?: string }).download_url;
          if (url) return Response.redirect(url, 302);
          return new Response("No APK", { status: 404 });
        }

        // Redirect to a signed Supabase CDN URL for much faster delivery.
        const metaIndex = await readIndex();
        const meta = metaIndex[id];
        const originalName = meta?.apkFilename?.trim();
        const fallbackName =
          ((row as { app_name?: string }).app_name ?? "app") + ".apk";
        const filename =
          originalName && originalName.length > 0 ? originalName : fallbackName;
        const { data: signed } = await supabaseAdmin.storage
          .from("app-files")
          .createSignedUrl(`GYPS/${apkId}`, 3600);
        if (!signed?.signedUrl)
          return new Response("Not found", { status: 404 });
        const { withDownloadName } = await import("@/lib/download-url");
        return Response.redirect(withDownloadName(signed.signedUrl, filename), 302);
      },
    },
  },
});
