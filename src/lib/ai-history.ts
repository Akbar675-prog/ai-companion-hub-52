export type ChatRole = "user" | "assistant";

export type ChatSource = {
  title: string;
  link: string;
  snippet?: string;
};

export type ChatMessage = {
  role: ChatRole;
  content: string;
  image?: string;
  /** Gambar hasil generate AI (URL Pollinations). */
  imageUrl?: string;
  imagePrompt?: string;
  searchQuery?: string;
  sources?: ChatSource[];
  reasoning?: string;
  thoughtSeconds?: number;
  analyzedImage?: boolean;
};

export type ChatThread = {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
};

const PREFIX = "getrix-ai-chats:";

function keyFor(userId: string | null) {
  return PREFIX + (userId ?? "guest");
}

export function loadThreads(userId: string | null): ChatThread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(keyFor(userId));
    const parsed = raw ? (JSON.parse(raw) as ChatThread[]) : [];
    return Array.isArray(parsed) ? parsed.sort((a, b) => b.updatedAt - a.updatedAt) : [];
  } catch {
    return [];
  }
}

export function saveThreads(userId: string | null, threads: ChatThread[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(keyFor(userId), JSON.stringify(threads.slice(0, 60)));
  } catch {
    /* storage full — ignore */
  }
}

export function newThreadId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function faviconOf(url: string) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostOf(url))}&sz=64`;
}
