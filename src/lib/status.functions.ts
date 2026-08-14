import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const BUCKET = "app-metadata";
const KEY = "status.json";

export type StatusLevel = "operational" | "degraded" | "lag" | "down";
export type StatusService =
  | "website"
  | "download_api"
  | "password_api"
  | "ddos"
  | "overall";

export type StatusEntry = {
  id: string;
  service: StatusService;
  level: StatusLevel;
  message: string;
  created_at: string;
};

export type StatusFile = {
  entries: StatusEntry[];
};

async function readFile(): Promise<StatusFile> {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  const { data } = await supabaseAdmin.storage.from(BUCKET).download(KEY);
  if (!data) return { entries: [] };
  try {
    const text = await data.text();
    const parsed = JSON.parse(text) as StatusFile;
    return { entries: Array.isArray(parsed?.entries) ? parsed.entries : [] };
  } catch {
    return { entries: [] };
  }
}

async function writeFile(file: StatusFile): Promise<void> {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  const body = new Blob([JSON.stringify(file)], { type: "application/json" });
  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(KEY, body, { contentType: "application/json", upsert: true });
  if (error) throw new Error(`Status write failed: ${error.message}`);
}

export const listStatusFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<StatusFile> => readFile(),
);

export const addStatusFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        service: z.enum([
          "website",
          "download_api",
          "password_api",
          "ddos",
          "overall",
        ]),
        level: z.enum(["operational", "degraded", "lag", "down"]),
        message: z.string().min(1).max(500),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<StatusEntry> => {
    const file = await readFile();
    const entry: StatusEntry = {
      id: crypto.randomUUID(),
      service: data.service,
      level: data.level,
      message: data.message,
      created_at: new Date().toISOString(),
    };
    file.entries.unshift(entry);
    // keep last 200
    file.entries = file.entries.slice(0, 200);
    await writeFile(file);
    return entry;
  });

export const deleteStatusFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().min(1).max(64) }).parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const file = await readFile();
    file.entries = file.entries.filter((e) => e.id !== data.id);
    await writeFile(file);
    return { ok: true };
  });