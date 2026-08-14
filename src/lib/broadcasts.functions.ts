import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { customAlphabet } from "nanoid";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const genId = customAlphabet(alphabet, 22);

export type Broadcast = {
  id: string;
  title: string;
  body: string;
  image_url: string;
  url: string;
  created_at: string;
};

function imgUrlFor(row: { image_id: string | null }): string {
  if (row.image_id) return `/broadcasts/image/${row.image_id}`;
  return "";
}

const createInput = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().max(2000).default(""),
  url: z.string().trim().url().max(2000).optional().nullable().or(z.literal("")),
  image_kind: z.enum(["upload", "url", "none"]),
  image_url: z.string().trim().url().max(2000).optional().nullable(),
  image_data_base64: z.string().max(8_000_000).optional().nullable(),
  image_content_type: z.string().max(100).optional().nullable(),
});

async function fetchAsBytes(url: string): Promise<{ bytes: Uint8Array; contentType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Gagal ambil gambar dari URL (${res.status})`);
  const ct = res.headers.get("content-type") || "application/octet-stream";
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength > 8 * 1024 * 1024) throw new Error("Gambar dari URL lebih dari 8MB.");
  return { bytes: buf, contentType: ct };
}

export const listBroadcastsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<Broadcast[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("broadcasts")
      .select("id, title, body, image_id, url, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id as string,
      title: r.title as string,
      body: (r.body as string) ?? "",
      image_url: imgUrlFor(r as { image_id: string | null }),
      url: (r.url as string | null) ?? "",
      created_at: r.created_at as string,
    }));
  },
);

export const createBroadcastFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => createInput.parse(d))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let image_id: string | null = null;
    let image_content_type: string | null = null;

    if (data.image_kind !== "none") {
      let bytes: Uint8Array | null = null;
      if (data.image_kind === "upload" && data.image_data_base64) {
        bytes = Uint8Array.from(atob(data.image_data_base64), (c) => c.charCodeAt(0));
        image_content_type = data.image_content_type || "application/octet-stream";
      } else if (data.image_kind === "url" && data.image_url) {
        const fetched = await fetchAsBytes(data.image_url);
        bytes = fetched.bytes;
        image_content_type = fetched.contentType;
      }
      if (bytes) {
        image_id = genId();
        const { error: upErr } = await supabaseAdmin.storage
          .from("broadcast-images")
          .upload(image_id, bytes, { contentType: image_content_type!, upsert: false });
        if (upErr) throw new Error(`Upload gambar gagal: ${upErr.message}`);
      }
    }

    const { data: row, error } = await supabaseAdmin
      .from("broadcasts")
      .insert({
        title: data.title,
        body: data.body ?? "",
        url: data.url || null,
        image_id,
        image_content_type,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const deleteBroadcastFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("broadcasts")
      .select("image_id")
      .eq("id", data.id)
      .maybeSingle();
    const imgId = (row as { image_id: string | null } | null)?.image_id;
    if (imgId) {
      await supabaseAdmin.storage.from("broadcast-images").remove([imgId]);
    }
    const { error } = await supabaseAdmin.from("broadcasts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const registerSubscriberFn = createServerFn({ method: "POST" })
  .inputValidator((d: { client_id: string; user_agent?: string }) =>
    z
      .object({
        client_id: z.string().min(4).max(80),
        user_agent: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("notification_subscribers")
      .upsert(
        { client_id: data.client_id, user_agent: data.user_agent ?? null },
        { onConflict: "client_id" },
      );
    return { ok: true };
  });
