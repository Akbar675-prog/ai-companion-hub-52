import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAccountAuth } from "@/integrations/auth-supabase/auth-middleware";

const BUCKET = "app-exclusive";


async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type MetaJson = { enabled: boolean; hash: string };

async function readMeta(id: string): Promise<MetaJson | null> {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .download(`${id}.json`);
  if (error || !data) return null;
  try {
    const text = await data.text();
    const parsed = JSON.parse(text) as MetaJson;
    if (typeof parsed?.hash !== "string") return null;
    return { enabled: parsed.enabled !== false, hash: parsed.hash };
  } catch {
    return null;
  }
}

export async function listExclusiveIds(): Promise<Set<string>> {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .list("", { limit: 1000 });
  if (error || !data) return new Set();
  const ids = new Set<string>();
  for (const f of data) {
    if (f.name.endsWith(".json")) ids.add(f.name.replace(/\.json$/, ""));
  }
  return ids;
}

export async function isExclusive(id: string): Promise<boolean> {
  const m = await readMeta(id);
  return !!(m && m.enabled);
}

export const setExclusiveFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().min(1).max(40),
        enabled: z.boolean(),
        password: z.string().min(1).max(200).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    if (!data.enabled) {
      await supabaseAdmin.storage.from(BUCKET).remove([`${data.id}.json`]);
      return { ok: true };
    }
    // enabling — require password (or reuse existing)
    let hash: string | null = null;
    if (data.password && data.password.trim().length > 0) {
      hash = await sha256Hex(data.password.trim());
    } else {
      const existing = await readMeta(data.id);
      if (existing) hash = existing.hash;
    }
    if (!hash) throw new Error("Password wajib diisi untuk mengaktifkan Exclusive.");
    const body = new Blob([JSON.stringify({ enabled: true, hash })], {
      type: "application/json",
    });
    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(`${data.id}.json`, body, {
        contentType: "application/json",
        upsert: true,
      });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const verifyExclusiveFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().min(1).max(40),
        password: z.string().min(1).max(200),
      })
      .parse(d),
  )
  .handler(
    async ({
      data,
    }): Promise<{ ok: boolean; url?: string }> => {
      const meta = await readMeta(data.id);
      if (!meta || !meta.enabled) {
        // Not exclusive — treat as pass-through
        return { ok: true };
      }
      const attemptHash = await sha256Hex(data.password.trim());
      if (attemptHash !== meta.hash) return { ok: false };

      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );
      const { data: row } = await supabaseAdmin
        .from("apps")
        .select("id, download_url, apk_id")
        .eq("id", data.id)
        .maybeSingle();
      if (!row) return { ok: false };
      const apkId = (row as { apk_id?: string | null }).apk_id;
      const url = apkId
        ? `/apps/gyps/${btoa(row.id)
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/g, "")}`
        : row.download_url ?? "";
      return { ok: true, url };
    },
  );

/** Pengguna yang sudah login boleh mengunduh app Exclusive tanpa password. */
export const exclusiveBypassFn = createServerFn({ method: "POST" })
  .middleware([requireAccountAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().min(1).max(40) }).parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean; url?: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("apps")
      .select("id, download_url, apk_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) return { ok: false };
    const apkId = (row as { apk_id?: string | null }).apk_id;
    const url = apkId
      ? `/apps/gyps/${btoa(row.id).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")}`
      : (row.download_url ?? "");
    return { ok: true, url };
  });
