// Konteks tambahan untuk GetrixAI (instruksi admin + katalog aplikasi).
// PENTING: jangan panggil createServerFn dari dalam route handler — itu memicu
// HTTP call ke server sendiri dan bisa menggantung sangat lama. Di sini kita
// query Supabase langsung, dengan batas waktu supaya jawaban AI tidak tertahan.

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } catch {
    return fallback;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function instructionsBlock(): Promise<string> {
  const { readInstructions } = await import("@/lib/ai-training.server");
  const instructions = await readInstructions();
  if (instructions.length === 0) return "";
  return (
    "\n\nINSTRUKSI KHUSUS DARI ADMIN (prioritas tertinggi, ikuti bila relevan dengan pertanyaan pengguna):\n" +
    instructions.map((i, idx) => `${idx + 1}. ${i.text}`).join("\n")
  );
}

async function factsBlock(): Promise<string> {
  const { readFacts } = await import("@/lib/ai-facts.server");
  const facts = await readFacts();
  if (facts.length === 0) return "";
  return (
    "\n\nINFO RESMI (fakta yang sudah diverifikasi admin — pakai ini sebagai jawaban pasti, jangan dibantah atau dikarang ulang):\n" +
    facts.map((f) => `- ${f.label}: ${f.value}`).join("\n")
  );
}

async function catalogBlock(): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("apps")
    .select("id, app_name, description")
    .order("created_at", { ascending: false })
    .limit(60);
  if (error || !data || data.length === 0) return "";
  const catalog = data
    .map(
      (a) =>
        `- ${a.app_name}: ${String(a.description ?? "")
          .replace(/\s+/g, " ")
          .slice(0, 140)} (halaman: /apps/${a.id})`,
    )
    .join("\n");
  return (
    "\n\nDAFTAR APLIKASI YANG TERSEDIA DI SITUS GALILEO MOD APK:\n" +
    catalog +
    "\nBila pengguna minta rekomendasi aplikasi, pikirkan kebutuhan sebenarnya lalu sarankan aplikasi dari daftar ini beserta tautan halamannya. Jika tidak ada yang cocok, katakan aplikasi itu belum ada di situs."
  );
}

export async function getAiExtraContext(): Promise<string> {
  const [instructions, facts, catalog] = await Promise.all([
    withTimeout(instructionsBlock(), 3500, ""),
    withTimeout(factsBlock(), 3500, ""),
    withTimeout(catalogBlock(), 3500, ""),
  ]);
  return instructions + facts + catalog;
}
