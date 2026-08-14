// Fakta resmi untuk GetrixAI (mis. pembuat AI, presiden Indonesia saat ini,
// nomor/akun media sosial pembuat). Disimpan di Supabase Storage bucket
// app-metadata karena DB eksternal tidak bisa dibuatkan tabel baru.

const BUCKET = "app-metadata";
const KEY = "ai-facts.json";

export type AiFact = {
  id: string;
  label: string;
  value: string;
  createdAt: number;
};

export async function readFacts(): Promise<AiFact[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(KEY);
  if (error || !data) return [];
  try {
    const parsed = JSON.parse(await data.text()) as AiFact[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeFacts(list: AiFact[]): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const body = new Blob([JSON.stringify(list.slice(0, 200))], { type: "application/json" });
  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(KEY, body, {
    contentType: "application/json",
    upsert: true,
  });
  if (error) throw new Error(`Gagal menyimpan info: ${error.message}`);
}

function clean(label: string, value: string) {
  const l = label.trim().slice(0, 120);
  const v = value.trim().slice(0, 1000);
  if (l.length < 2) throw new Error("Nama info terlalu pendek.");
  if (v.length < 1) throw new Error("Isi info tidak boleh kosong.");
  return { l, v };
}

export async function addFact(label: string, value: string): Promise<AiFact[]> {
  const { l, v } = clean(label, value);
  const list = await readFacts();
  const next: AiFact[] = [
    {
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      label: l,
      value: v,
      createdAt: Date.now(),
    },
    ...list,
  ];
  await writeFacts(next);
  return next;
}

export async function updateFact(id: string, label: string, value: string): Promise<AiFact[]> {
  const { l, v } = clean(label, value);
  const list = (await readFacts()).map((f) => (f.id === id ? { ...f, label: l, value: v } : f));
  await writeFacts(list);
  return list;
}

export async function deleteFact(id: string): Promise<AiFact[]> {
  const list = (await readFacts()).filter((f) => f.id !== id);
  await writeFacts(list);
  return list;
}
