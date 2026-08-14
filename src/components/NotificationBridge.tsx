import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { registerSubscriberFn } from "@/lib/broadcasts.functions";

const CLIENT_KEY = "galileo:notif:client_id";
const ASKED_KEY = "galileo:notif:asked";

function getClientId(): string {
  let id = localStorage.getItem(CLIENT_KEY);
  if (!id) {
    id =
      (crypto.randomUUID?.() as string | undefined) ??
      `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(CLIENT_KEY, id);
  }
  return id;
}

async function ensureSW(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator)) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration("/sw.js");
    if (existing) return existing;
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    return null;
  }
}

async function showNotification(payload: {
  title: string;
  body: string;
  icon?: string;
  image?: string;
  url?: string;
}) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const reg = await ensureSW();
  if (reg) {
    try {
      await reg.showNotification(payload.title, {
        body: payload.body,
        icon: payload.icon || "/favicon.png",
        badge: "/favicon.png",
        image: payload.image,
        data: { url: payload.url || "/" },
        vibrate: [200, 100, 200],
      } as NotificationOptions);
      return;
    } catch {
      // fall through to legacy Notification
    }
  }
  try {
    const n = new Notification(payload.title, {
      body: payload.body,
      icon: payload.icon || "/favicon.png",
    });
    if (payload.url) {
      n.onclick = () => window.open(payload.url!, "_blank", "noopener,noreferrer");
    }
  } catch {
    // ignore
  }
}

export function NotificationBridge() {
  const register = useServerFn(registerSubscriberFn);
  const [prompt, setPrompt] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    // Register the SW early so Chrome can show notifications reliably.
    void ensureSW();

    if (Notification.permission === "default" && !localStorage.getItem(ASKED_KEY)) {
      const t = window.setTimeout(() => setPrompt(true), 1200);
      return () => window.clearTimeout(t);
    }

    if (Notification.permission === "granted") {
      register({
        data: { client_id: getClientId(), user_agent: navigator.userAgent },
      }).catch(() => {});
    }
  }, [register]);

  // Realtime: show notification on new broadcast
  useEffect(() => {
    if (typeof window === "undefined") return;
    const channel = supabase
      .channel("broadcasts-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "broadcasts" },
        (payload) => {
          const row = payload.new as {
            title: string;
            body: string;
            image_id: string | null;
            url: string | null;
          };
          const icon = row.image_id ? `/broadcasts/image/${row.image_id}` : "/favicon.png";
          void showNotification({
            title: row.title,
            body: row.body || "",
            icon,
            image: row.image_id ? `/broadcasts/image/${row.image_id}` : undefined,
            url: row.url || undefined,
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function accept() {
    localStorage.setItem(ASKED_KEY, "1");
    setPrompt(false);
    try {
      const res = await Notification.requestPermission();
      if (res === "granted") {
        await ensureSW();
        await register({
          data: { client_id: getClientId(), user_agent: navigator.userAgent },
        });
        // Confirm to the user that notifications work.
        void showNotification({
          title: "Notifikasi aktif ✨",
          body: "Kamu akan menerima info aplikasi baru dan pengumuman.",
          icon: "/favicon.png",
        });
      }
    } catch {
      // ignore
    }
  }

  function dismiss() {
    localStorage.setItem(ASKED_KEY, "1");
    setPrompt(false);
  }

  if (!prompt) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-md animate-[fade-in_.3s_ease-out]">
      <div className="m3-shadow-2 flex items-start gap-3 rounded-3xl bg-card p-4">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container">
          <Bell className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg leading-tight">Aktifkan notifikasi</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Dapatkan info aplikasi baru & pengumuman langsung dari Galileo.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={accept}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground active:scale-95"
            >
              Izinkan
            </button>
            <button
              onClick={dismiss}
              className="rounded-full bg-surface-variant px-4 py-2 text-sm font-medium active:scale-95"
            >
              Nanti
            </button>
          </div>
        </div>
        <button
          onClick={dismiss}
          aria-label="Tutup"
          className="inline-flex size-8 items-center justify-center rounded-full hover:bg-surface-variant"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
