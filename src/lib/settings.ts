import { useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

export type AppSettings = {
  reduceMotion: boolean;
  lowGraphics: boolean;
  disableRipple: boolean;
  theme: ThemeMode;
};

const DEFAULTS: AppSettings = {
  reduceMotion: false,
  lowGraphics: false,
  disableRipple: false,
  theme: "light",
};

const KEY = "galileo:settings:v1";

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch {
    return DEFAULTS;
  }
}

export function saveSettings(s: AppSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(s));
  applySettings(s);
  window.dispatchEvent(new CustomEvent("galileo:settings", { detail: s }));
}

function resolveDark(theme: ThemeMode): boolean {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches === true
  );
}

export function applySettings(s: AppSettings) {
  if (typeof document === "undefined") return;
  const b = document.body;
  b.classList.toggle("reduce-motion", s.reduceMotion);
  b.classList.toggle("low-graphics", s.lowGraphics);
  b.classList.toggle("no-ripple", s.disableRipple);
  document.documentElement.classList.toggle("dark", resolveDark(s.theme));
  document.documentElement.style.colorScheme = resolveDark(s.theme) ? "dark" : "light";
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  useEffect(() => {
    const s = loadSettings();
    setSettings(s);
    applySettings(s);
    function onChange(e: Event) {
      const detail = (e as CustomEvent<AppSettings>).detail;
      if (detail) setSettings(detail);
    }
    window.addEventListener("galileo:settings", onChange);
    return () => window.removeEventListener("galileo:settings", onChange);
  }, []);
  return {
    settings,
    update: (patch: Partial<AppSettings>) => {
      const next = { ...settings, ...patch };
      setSettings(next);
      saveSettings(next);
    },
  };
}
