// Kredit AI harian per pengguna (chat token + gambar).
// Disimpan di storage (bucket app-metadata) supaya tidak butuh tabel baru.
// Reset otomatis setiap pukul 07:00 WIB = 00:00 UTC (kunci memakai tanggal UTC).

const BUCKET = "app-metadata";
export const DAILY_CHAT_TOKENS = 100_000;

export type UsagePoint = { date: string; used: number };
export type ThreadUsage = { title: string; tokens: number };

type Credits = {
  day: string;
  used: number;
  threads: Record<string, number>;
  history: Record<string, number>;
};

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function keyFor(userId: string) {
  return `ai-credits/${userId}.json`;
}

function empty(): Credits {
  return { day: todayUtc(), used: 0, threads: {}, history: {} };
}

function trimHistory(history: Record<string, number>): Record<string, number> {
  const keys = Object.keys(history).sort();
  const keep = keys.slice(-30);
  const out: Record<string, number> = {};
  for (const k of keep) out[k] = history[k];
  return out;
}

async function readCredits(userId: string): Promise<Credits> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.storage.from(BUCKET).download(keyFor(userId));
  if (!data) return empty();
  try {
    const parsed = JSON.parse(await data.text()) as Partial<Credits>;
    const c: Credits = {
      day: String(parsed.day ?? todayUtc()),
      used: Number(parsed.used) || 0,
      threads: parsed.threads ?? {},
      history: parsed.history ?? {},
    };
    if (c.day !== todayUtc()) {
      const history = trimHistory({ ...c.history, [c.day]: c.used });
      return { day: todayUtc(), used: 0, threads: {}, history };
    }
    return c;
  } catch {
    return empty();
  }
}

async function writeCredits(userId: string, c: Credits): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const body = new Blob([JSON.stringify(c)], { type: "application/json" });
  await supabaseAdmin.storage.from(BUCKET).upload(keyFor(userId), body, {
    contentType: "application/json",
    upsert: true,
  });
}

function toSeries(history: Record<string, number>, today: string, todayUsed: number): UsagePoint[] {
  const out: UsagePoint[] = [];
  const now = new Date(`${today}T00:00:00Z`);
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86_400_000).toISOString().slice(0, 10);
    out.push({ date: d, used: d === today ? todayUsed : (history[d] ?? 0) });
  }
  return out;
}

export async function chatCreditsFor(userId: string) {
  const c = await readCredits(userId);
  const threads: ThreadUsage[] = Object.entries(c.threads)
    .map(([title, tokens]) => ({ title, tokens }))
    .sort((a, b) => b.tokens - a.tokens);
  return {
    used: c.used,
    limit: DAILY_CHAT_TOKENS,
    remaining: Math.max(0, DAILY_CHAT_TOKENS - c.used),
    threads,
    series: toSeries(c.history, c.day, c.used),
  };
}

/** Catat pemakaian token chat untuk satu percakapan. */
export async function recordChatUsage(userId: string, tokens: number, title: string) {
  const c = await readCredits(userId);
  const t = Math.max(0, Math.min(50_000, Math.round(tokens) || 0));
  const key = (title || "Chat baru").slice(0, 60);
  c.used += t;
  c.threads[key] = (c.threads[key] ?? 0) + t;
  await writeCredits(userId, c);
  return {
    used: c.used,
    limit: DAILY_CHAT_TOKENS,
    remaining: Math.max(0, DAILY_CHAT_TOKENS - c.used),
  };
}
