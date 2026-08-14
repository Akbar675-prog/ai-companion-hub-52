// Profil khusus GetrixAI (terpisah dari profil akun /profile).
// Disimpan di storage bucket app-metadata: ai-profile/<userId>.json

const BUCKET = "app-metadata";

export type AiProfile = {
  nickname: string;
  fullName: string;
  age: number | null;
  about: string;
};

export const EMPTY_AI_PROFILE: AiProfile = { nickname: "", fullName: "", age: null, about: "" };

function keyFor(userId: string) {
  return `ai-profile/${userId}.json`;
}

export async function readAiProfile(userId: string): Promise<AiProfile> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.storage.from(BUCKET).download(keyFor(userId));
  if (!data) return EMPTY_AI_PROFILE;
  try {
    const p = JSON.parse(await data.text()) as Partial<AiProfile>;
    return {
      nickname: String(p.nickname ?? "").slice(0, 40),
      fullName: String(p.fullName ?? "").slice(0, 80),
      age: typeof p.age === "number" && p.age > 0 ? Math.min(120, Math.round(p.age)) : null,
      about: String(p.about ?? "").slice(0, 600),
    };
  } catch {
    return EMPTY_AI_PROFILE;
  }
}

export async function writeAiProfile(userId: string, profile: AiProfile): Promise<AiProfile> {
  const clean: AiProfile = {
    nickname: profile.nickname.trim().slice(0, 40),
    fullName: profile.fullName.trim().slice(0, 80),
    age: profile.age && profile.age > 0 ? Math.min(120, Math.round(profile.age)) : null,
    about: profile.about.trim().slice(0, 600),
  };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const body = new Blob([JSON.stringify(clean)], { type: "application/json" });
  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(keyFor(userId), body, {
    contentType: "application/json",
    upsert: true,
  });
  if (error) throw new Error(error.message);
  return clean;
}
