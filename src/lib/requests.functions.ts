// APK request storage — persisted as a JSON array in the "app-metadata" bucket
// so no schema changes are needed.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const BUCKET = "app-metadata";
const KEY = "apk-requests.json";

export type AppRequest = {
  id: string;
  app_name: string;
  version: string | null;
  note: string;
  contact: string;
  created_at: string;
};

async function readAll(): Promise<AppRequest[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(KEY);
  if (error || !data) return [];
  try {
    const parsed = JSON.parse(await data.text()) as AppRequest[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(rows: AppRequest[]): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const body = new Blob([JSON.stringify(rows)], { type: "application/json" });
  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(KEY, body, { contentType: "application/json", upsert: true });
  if (error) throw new Error(`Requests write failed: ${error.message}`);
}

export const listRequestsFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const rows = await readAll();
    return rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  },
);

const createInput = z.object({
  app_name: z.string().trim().min(1).max(120),
  version: z.string().trim().max(40).optional().nullable(),
  note: z.string().trim().max(2000).default(""),
  contact: z.string().trim().max(200).default(""),
});

export const createRequestFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => createInput.parse(d))
  .handler(async ({ data }) => {
    const rows = await readAll();
    const row: AppRequest = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      app_name: data.app_name,
      version: data.version?.trim() ? data.version.trim() : null,
      note: data.note,
      contact: data.contact,
      created_at: new Date().toISOString(),
    };
    rows.push(row);
    await writeAll(rows);
    return { ok: true, id: row.id };
  });

export const deleteRequestFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().min(1).max(64) }).parse(d),
  )
  .handler(async ({ data }) => {
    const rows = await readAll();
    await writeAll(rows.filter((r) => r.id !== data.id));
    return { ok: true };
  });