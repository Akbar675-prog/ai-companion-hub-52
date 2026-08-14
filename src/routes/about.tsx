import { createFileRoute } from "@tanstack/react-router";
import { Info, Sparkles, Package, ShieldCheck, Gift, Lock } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Galileo Mod APK" },
      {
        name: "description",
        content:
          "Tentang Galileo Mod APK — katalog download APK dengan tema Material 3 Expressive.",
      },
      { property: "og:title", content: "About — Galileo Mod APK" },
      {
        property: "og:description",
        content: "Info tentang aplikasi, library, dan pengembangnya.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="mx-auto max-w-3xl px-5 pb-32 pt-6 md:px-10">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container">
            <Info className="size-5" />
          </span>
          <h1 className="font-display text-4xl leading-tight md:text-5xl">
            About
          </h1>
        </div>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Galileo Mod APK adalah katalog aplikasi Android yang bisa kamu unduh
          langsung, dibuat dengan bahasa desain Material 3 Expressive.
        </p>

        <div className="mt-8 grid gap-4">
          <Info3Card
            icon={<Gift className="size-5" />}
            title="100% Gratis"
            body="Semua aplikasi di katalog ini bisa diunduh gratis tanpa biaya apa pun. Tidak ada langganan, tidak ada paywall — cukup klik Download APK."
          />
          <Info3Card
            icon={<Lock className="size-5" />}
            title="Aplikasi Exclusive (butuh password)"
            body="Sebagian kecil aplikasi ditandai Exclusive dan hanya perlu password singkat untuk membuka unduhannya. Aplikasinya tetap gratis — password hanya sebagai pembatas akses."
          />
          <Info3Card
            icon={<Sparkles className="size-5" />}
            title="Material 3 Expressive"
            body="Website ini menggunakan bahasa desain Material 3 (Expressive) — bentuk membulat besar, warna dinamis, dan tipografi Roboto Flex + Roboto Serif."
          />
          <Info3Card
            icon={<Package className="size-5" />}
            title="Library & Stack"
            body="Dibangun dengan TanStack Start (React 19 + Vite 7), Tailwind CSS v4, shadcn/ui, lucide-react, dan Lovable Cloud sebagai backend penyimpanan."
          />
          <Info3Card
            icon={<ShieldCheck className="size-5" />}
            title="Pemberitauan"
            body="Semua APK yang ada di katalog dikelola oleh owner. Pastikan mengunduh hanya dari sumber tepercaya. Web ini masih dalam pengembangan aktif."
          />
        </div>
      </main>
    </div>
  );
}

function Info3Card({
  icon, title, body,
}: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="m3-shadow-1 flex gap-4 rounded-3xl bg-card p-5 md:p-6">
      <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary-container text-on-secondary-container">
        {icon}
      </span>
      <div>
        <h2 className="font-display text-xl leading-tight">{title}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {body}
        </p>
      </div>
    </div>
  );
}
