// Generate gambar via Pollinations AI + kuota harian per pengguna.
// Hasil gambar disimpan permanen di storage (bucket app-metadata) pada path
// create/ai-image/<id 32 karakter> dan disajikan lewat host user content.
// Kuota disimpan di storage juga (tanpa tabel baru), reset otomatis setiap
// tengah malam UTC karena kunci kuota memakai tanggal UTC.

import { USER_CONTENT_ORIGIN } from "./user-content";

const BUCKET = "app-metadata";
export const DAILY_IMAGE_LIMIT = 5;
export const AI_IMAGE_PREFIX = "create/ai-image";

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function keyFor(userId: string) {
  return `ai-image-quota/${userId}.json`;
}

type Quota = { day: string; used: number; history?: Record<string, number> };

function trimHistory(history: Record<string, number>): Record<string, number> {
  const keep = Object.keys(history).sort().slice(-30);
  const out: Record<string, number> = {};
  for (const k of keep) out[k] = history[k];
  return out;
}

async function readQuota(userId: string): Promise<Quota> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.storage.from(BUCKET).download(keyFor(userId));
  if (!data) return { day: todayUtc(), used: 0 };
  try {
    const parsed = JSON.parse(await data.text()) as Quota;
    const history = parsed.history ?? {};
    if (parsed.day !== todayUtc()) {
      return {
        day: todayUtc(),
        used: 0,
        history: trimHistory({ ...history, [parsed.day]: Number(parsed.used) || 0 }),
      };
    }
    return { day: parsed.day, used: Number(parsed.used) || 0, history };
  } catch {
    return { day: todayUtc(), used: 0 };
  }
}

async function writeQuota(userId: string, quota: Quota): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const body = new Blob([JSON.stringify(quota)], { type: "application/json" });
  await supabaseAdmin.storage.from(BUCKET).upload(keyFor(userId), body, {
    contentType: "application/json",
    upsert: true,
  });
}

export async function imageQuotaFor(userId: string) {
  const q = await readQuota(userId);
  const history = q.history ?? {};
  const today = todayUtc();
  const now = new Date(`${today}T00:00:00Z`);
  const series: { date: string; used: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86_400_000).toISOString().slice(0, 10);
    series.push({ date: d, used: d === today ? q.used : (history[d] ?? 0) });
  }
  return {
    used: q.used,
    limit: DAILY_IMAGE_LIMIT,
    remaining: Math.max(0, DAILY_IMAGE_LIMIT - q.used),
    series,
  };
}

/** ID acak 32 karakter (base64url) untuk nama file gambar. */
function newImageId(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "").slice(0, 32);
}


const UAS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Mobile Safari/537.36",
];

/**
 * Selalu coba URL langsung dulu (ini yang paling stabil). Proxy publik hanya
 * dipakai sebagai cadangan terakhir — beberapa di antaranya justru membalas 403
 * dan itulah penyebab error 403 yang muncul sebelumnya.
 */
function routesFor(target: string): string[] {
  const enc = encodeURIComponent(target);
  return [
    target,
    target,
    `https://wsrv.nl/?url=${enc}&output=jpg&q=90`,
    `https://api.codetabs.com/v1/proxy/?quest=${enc}`,
  ];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function tryFetchImage(target: string): Promise<
  { ok: true; bytes: ArrayBuffer; type: string } | { ok: false; error: string; forbidden: boolean }
> {
  let lastError = "";
  let forbidden = false;
  const routes = routesFor(target);
  for (let i = 0; i < routes.length; i++) {
    const url = routes[i];
    try {
      // Header seminimal mungkin & wajar seperti browser. Jangan memalsukan
      // Origin/Referer/X-Forwarded-For: Cloudflare di depan Pollinations
      // menolak (403) request dengan header asal yang tidak konsisten.
      const res = await fetch(url, {
        headers: {
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "User-Agent": UAS[Math.floor(Math.random() * UAS.length)],
        },
        signal: AbortSignal.timeout(90_000),
      });
      if (!res.ok) {
        if (res.status === 403 || res.status === 429) forbidden = true;
        lastError = `HTTP ${res.status}`;
        await sleep(1200 * (i + 1));
        continue;
      }
      const type = res.headers.get("content-type") ?? "image/jpeg";
      if (!type.startsWith("image/")) {
        lastError = `tipe tidak valid (${type})`;
        continue;
      }
      const bytes = await res.arrayBuffer();
      if (bytes.byteLength < 1024) {
        lastError = "gambar kosong";
        continue;
      }
      return { ok: true, bytes, type };
    } catch (e) {
      lastError = e instanceof Error ? e.message : "gagal";
    }
  }
  return { ok: false, error: lastError, forbidden };
}


/**
 * Coba beberapa varian URL Pollinations (model & parameter berbeda) dengan
 * jeda singkat. Ini yang membuat error 403 sesekali tidak langsung gagal.
 */
async function fetchImageBytes(targets: string[]): Promise<{ bytes: ArrayBuffer; type: string }> {
  let lastError = "";
  let sawForbidden = false;
  for (let pass = 0; pass < 2; pass++) {
    for (const target of targets) {
      const r = await tryFetchImage(target);
      if (r.ok) return { bytes: r.bytes, type: r.type };
      lastError = r.error;
      if (r.forbidden) sawForbidden = true;
      await sleep(600);
    }
  }
  throw new Error(
    sawForbidden
      ? "Layanan gambar lagi membatasi permintaan (403). Tunggu sebentar lalu coba lagi ya."
      : `Gagal membuat gambar (${lastError}). Coba lagi sebentar lagi.`,
  );
}

export async function generateImage(userId: string, prompt: string) {
  const quota = await readQuota(userId);
  if (quota.used >= DAILY_IMAGE_LIMIT) {
    throw new Error(
      `Limit membuat gambar hari ini sudah habis (${DAILY_IMAGE_LIMIT}/hari). Coba lagi setelah pukul 07:00 WIB.`,
    );
  }

  const clean = prompt.replace(/\s+/g, " ").trim().slice(0, 500);
  if (!clean) throw new Error("Deskripsi gambar tidak boleh kosong.");

  const seed = Math.floor(Math.random() * 1_000_000);
  const base = `https://image.pollinations.ai/prompt/${encodeURIComponent(clean)}`;
  const common = `width=1024&height=1024&seed=${seed}&nologo=true`;
  const targets = [
    `${base}?${common}`,
    `${base}?${common}&model=flux`,
    `${base}?width=768&height=768&seed=${seed + 1}&nologo=true`,
  ];

  const { bytes, type } = await fetchImageBytes(targets);


  const id = newImageId();
  const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
  const path = `${AI_IMAGE_PREFIX}/${id}`;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: type, upsert: true });
  if (error) throw new Error(`Gagal menyimpan gambar: ${error.message}`);

  await writeQuota(userId, { ...quota, day: todayUtc(), used: quota.used + 1 });

  return {
    url: `${USER_CONTENT_ORIGIN}/${AI_IMAGE_PREFIX}/${id}`,
    id,
    ext,
    prompt: clean,
    used: quota.used + 1,
    limit: DAILY_IMAGE_LIMIT,
    remaining: Math.max(0, DAILY_IMAGE_LIMIT - (quota.used + 1)),
  };
}

/** Baca gambar hasil generate untuk disajikan lewat host user content. */
export async function readAiImage(id: string) {
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .download(`${AI_IMAGE_PREFIX}/${id}`);
  if (error || !data) return null;
  return { bytes: await data.arrayBuffer(), type: data.type || "image/jpeg" };
}
