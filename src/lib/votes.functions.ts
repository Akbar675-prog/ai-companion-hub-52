import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const BUCKET = "app-metadata";

export type VoteOption = {
  id: string;
  label: string;
  count: number;
};

export type Vote = {
  id: string;
  title: string;
  options: VoteOption[];
  created_at: string;
  ends_at: string;
};

const ID_ALPHABET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

function makeId(len = 25): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < len; i++) out += ID_ALPHABET[bytes[i] % ID_ALPHABET.length];
  return out;
}

function keyFor(id: string) {
  return `votes/${id}.json`;
}

async function readVote(id: string): Promise<Vote | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.storage.from(BUCKET).download(keyFor(id));
  if (!data) return null;
  try {
    return JSON.parse(await data.text()) as Vote;
  } catch {
    return null;
  }
}

async function writeVote(vote: Vote): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const body = new Blob([JSON.stringify(vote)], { type: "application/json" });
  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(keyFor(vote.id), body, {
      contentType: "application/json",
      upsert: true,
    });
  if (error) throw new Error(`Gagal menyimpan vote: ${error.message}`);
}

export const createVoteFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        title: z.string().trim().min(1).max(120),
        options: z.array(z.string().trim().min(1).max(80)).min(2).max(10),
        duration_minutes: z.number().int().min(1).max(60 * 24 * 30),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ id: string }> => {
    const id = makeId();
    const now = new Date();
    const vote: Vote = {
      id,
      title: data.title,
      options: data.options.map((label) => ({
        id: makeId(10),
        label,
        count: 0,
      })),
      created_at: now.toISOString(),
      ends_at: new Date(
        now.getTime() + data.duration_minutes * 60_000,
      ).toISOString(),
    };
    await writeVote(vote);
    return { id };
  });

export const getVoteFn = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().min(1).max(64) }).parse(d),
  )
  .handler(async ({ data }): Promise<Vote | null> => readVote(data.id));

export const castVoteFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().min(1).max(64),
        option_id: z.string().min(1).max(64),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<Vote> => {
    const vote = await readVote(data.id);
    if (!vote) throw new Error("Vote tidak ditemukan.");
    if (new Date(vote.ends_at).getTime() <= Date.now()) {
      throw new Error("Vote sudah selesai.");
    }
    const option = vote.options.find((o) => o.id === data.option_id);
    if (!option) throw new Error("Pilihan tidak valid.");
    option.count += 1;
    await writeVote(vote);
    return vote;
  });
