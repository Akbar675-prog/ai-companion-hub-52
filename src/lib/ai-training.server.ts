// Instruksi khusus untuk GetrixAI, disimpan di Supabase Storage (bucket app-metadata)
// karena DB eksternal tidak bisa dibuatkan tabel baru.

const BUCKET = "app-metadata";
const KEY = "ai-instructions.json";

export type AiInstruction = {
  id: string;
  text: string;
  createdAt: number;
};

export async function readInstructions(): Promise<AiInstruction[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(KEY);
  if (error || !data) return [];
  try {
    const parsed = JSON.parse(await data.text()) as AiInstruction[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeInstructions(list: AiInstruction[]): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const body = new Blob([JSON.stringify(list.slice(0, 200))], { type: "application/json" });
  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(KEY, body, {
    contentType: "application/json",
    upsert: true,
  });
  if (error) throw new Error(`Gagal menyimpan instruksi: ${error.message}`);
}

export async function addInstruction(text: string): Promise<AiInstruction[]> {
  const clean = text.trim();
  if (clean.length < 5) throw new Error("Instruksi terlalu pendek.");
  const list = await readInstructions();
  const next: AiInstruction[] = [
    { id: Math.random().toString(36).slice(2) + Date.now().toString(36), text: clean.slice(0, 4000), createdAt: Date.now() },
    ...list,
  ];
  await writeInstructions(next);
  return next;
}

export async function updateInstruction(id: string, text: string): Promise<AiInstruction[]> {
  const clean = text.trim();
  if (clean.length < 5) throw new Error("Instruksi terlalu pendek.");
  const list = (await readInstructions()).map((i) =>
    i.id === id ? { ...i, text: clean.slice(0, 4000) } : i,
  );
  await writeInstructions(list);
  return list;
}

export async function deleteInstruction(id: string): Promise<AiInstruction[]> {
  const list = (await readInstructions()).filter((i) => i.id !== id);
  await writeInstructions(list);
  return list;
}
