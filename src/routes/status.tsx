import { createFileRoute, redirect } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  Shield,
  Download as DownloadIcon,
  Lock,
  Globe,
  Activity,
} from "lucide-react";
import {
  listStatusFn,
  type StatusEntry,
  type StatusLevel,
  type StatusService,
} from "@/lib/status.functions";
import {
  currentHost,
  isMainHost,
  isStatusHost,
  isDevHost,
  STATUS_ORIGIN,
  MAIN_ORIGIN,
} from "@/lib/status-host";

const statusQuery = queryOptions({
  queryKey: ["status"],
  queryFn: () => listStatusFn(),
});

export const Route = createFileRoute("/status")({
  beforeLoad: async () => {
    const host = await currentHost();
    if (isStatusHost(host) || isDevHost(host) || !host) return;
    if (isMainHost(host)) throw redirect({ href: STATUS_ORIGIN });
  },
  head: () => ({
    meta: [
      { title: "Galileo Mod APK Status" },
      {
        name: "description",
        content:
          "Live availability for Galileo Mod APK: website, download APIs, password APIs, and DDoS protection.",
      },
      { property: "og:title", content: "Galileo Mod APK Status" },
      {
        property: "og:description",
        content: "Live availability for every Galileo Mod APK service.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: STATUS_ORIGIN + "/" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(statusQuery),
  component: StatusPage,
});

const SERVICES: StatusService[] = [
  "website",
  "download_api",
  "password_api",
  "ddos",
];

const SERVICE_LABEL: Record<StatusService, string> = {
  website: "Website",
  download_api: "Download APIs",
  password_api: "Password APIs",
  ddos: "DDoS Protection",
  overall: "Overall System",
};

const SERVICE_ICON: Record<StatusService, React.ReactNode> = {
  website: <Globe className="size-4" />,
  download_api: <DownloadIcon className="size-4" />,
  password_api: <Lock className="size-4" />,
  ddos: <Shield className="size-4" />,
  overall: <Activity className="size-4" />,
};

const LEVEL_META: Record<
  StatusLevel,
  { label: string; dot: string; bar: string; text: string; icon: React.ReactNode; weight: number }
> = {
  operational: {
    label: "Operational",
    dot: "bg-status-ok",
    bar: "bg-status-ok",
    text: "text-status-ok",
    icon: <CheckCircle2 className="size-4" />,
    weight: 0,
  },
  lag: {
    label: "Degraded performance",
    dot: "bg-status-warn",
    bar: "bg-status-warn",
    text: "text-status-warn",
    icon: <Clock className="size-4" />,
    weight: 1,
  },
  degraded: {
    label: "Partial outage",
    dot: "bg-status-alert",
    bar: "bg-status-alert",
    text: "text-status-alert",
    icon: <AlertTriangle className="size-4" />,
    weight: 2,
  },
  down: {
    label: "Major outage",
    dot: "bg-status-down",
    bar: "bg-status-down",
    text: "text-status-down",
    icon: <XCircle className="size-4" />,
    weight: 3,
  },
};

const DAYS = 90;

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function lastDays(n: number): Date[] {
  const out: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push(d);
  }
  return out;
}

function fmtDay(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusPage() {
  const { data } = useSuspenseQuery(statusQuery);
  const entries = data.entries ?? [];
  const days = lastDays(DAYS);

  // Latest entry per service defines the current state.
  const latest: Partial<Record<StatusService, StatusEntry>> = {};
  for (const e of entries) if (!latest[e.service]) latest[e.service] = e;

  const currentLevel = (s: StatusService): StatusLevel => latest[s]?.level ?? "operational";

  const worst = SERVICES.reduce<StatusLevel>((acc, s) => {
    const l = currentLevel(s);
    return LEVEL_META[l].weight > LEVEL_META[acc].weight ? l : acc;
  }, currentLevel("overall"));
  const allGood = worst === "operational";

  // Per-service, per-day worst level derived from the incident log.
  const history: Record<string, Record<string, StatusEntry>> = {};
  for (const e of entries) {
    const k = dayKey(new Date(e.created_at));
    const bucket = (history[e.service] ??= {});
    const prev = bucket[k];
    if (!prev || LEVEL_META[e.level].weight > LEVEL_META[prev.level].weight) bucket[k] = e;
  }

  function uptime(s: StatusService): string {
    const bad = days.filter((d) => {
      const hit = history[s]?.[dayKey(d)];
      return hit && hit.level !== "operational";
    }).length;
    return (((DAYS - bad) / DAYS) * 100).toFixed(2);
  }

  const incidentDays = lastDays(14).slice().reverse();

  return (
    <div className="min-h-screen bg-status-canvas text-status-ink">
      <header className="border-b border-status-line">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5">
          <a href={MAIN_ORIGIN} className="flex items-center gap-2.5">
            <img src="/favicon.png" alt="" className="size-7 rounded-md" />
            <span className="text-[15px] font-medium tracking-tight">Galileo Mod APK</span>
          </a>
          <span className="text-[13px] text-status-muted">Status</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-24 pt-10">
        <h1 className="text-[28px] font-medium leading-tight tracking-tight md:text-[34px]">
          Galileo Mod APK Status
        </h1>

        <div
          className={`mt-6 flex items-center gap-3 rounded-xl border px-5 py-4 ${
            allGood
              ? "border-status-ok/25 bg-status-ok/10"
              : "border-status-alert/25 bg-status-alert/10"
          }`}
        >
          <span className={allGood ? "text-status-ok" : LEVEL_META[worst].text}>
            {allGood ? <CheckCircle2 className="size-5" /> : LEVEL_META[worst].icon}
          </span>
          <p className="text-[15px] font-medium">
            {allGood ? "All Systems Operational" : `Some systems are affected — ${LEVEL_META[worst].label}`}
          </p>
        </div>

        <section className="mt-8 divide-y divide-status-line rounded-xl border border-status-line bg-status-surface">
          {SERVICES.map((s) => {
            const level = currentLevel(s);
            const meta = LEVEL_META[level];
            return (
              <div key={s} className="px-5 py-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="text-status-muted">{SERVICE_ICON[s]}</span>
                    <span className="truncate text-[14px] font-medium">{SERVICE_LABEL[s]}</span>
                  </div>
                  <span className={`flex shrink-0 items-center gap-1.5 text-[13px] ${meta.text}`}>
                    <span className={`size-2 rounded-full ${meta.dot}`} />
                    {meta.label}
                  </span>
                </div>

                <div className="mt-3.5 flex h-8 items-stretch gap-[2px]">
                  {days.map((d) => {
                    const hit = history[s]?.[dayKey(d)];
                    const dl = hit?.level ?? "operational";
                    return (
                      <span
                        key={dayKey(d)}
                        title={`${fmtDay(d)} — ${LEVEL_META[dl].label}`}
                        className={`min-w-0 flex-1 rounded-[2px] transition-opacity hover:opacity-70 ${LEVEL_META[dl].bar}`}
                      />
                    );
                  })}
                </div>

                <div className="mt-2 flex items-center justify-between text-[12px] text-status-muted">
                  <span>90 days ago</span>
                  <span>{uptime(s)} % uptime</span>
                  <span>Today</span>
                </div>
              </div>
            );
          })}
        </section>

        <section className="mt-12">
          <h2 className="text-[18px] font-medium tracking-tight">Past Incidents</h2>
          <div className="mt-4 space-y-7">
            {incidentDays.map((d) => {
              const key = dayKey(d);
              const dayEntries = entries.filter((e) => dayKey(new Date(e.created_at)) === key);
              return (
                <div key={key} className="border-b border-status-line pb-6 last:border-b-0">
                  <p className="text-[13px] font-medium text-status-muted">{fmtDay(d)}</p>
                  {dayEntries.length === 0 ? (
                    <p className="mt-2 text-[14px] text-status-muted">No incidents reported.</p>
                  ) : (
                    <ul className="mt-3 space-y-3">
                      {dayEntries.map((e) => {
                        const meta = LEVEL_META[e.level];
                        return (
                          <li key={e.id}>
                            <p className={`flex items-center gap-2 text-[14px] font-medium ${meta.text}`}>
                              {meta.icon}
                              {SERVICE_LABEL[e.service]} — {meta.label}
                            </p>
                            <p className="mt-1 pl-6 text-[14px] leading-relaxed text-status-ink/80">
                              {e.message}
                            </p>
                            <p className="mt-1 pl-6 text-[12px] text-status-muted">{fmtTime(e.created_at)}</p>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <footer className="mt-14 flex flex-col items-center gap-2 text-[13px] text-status-muted">
          <a href={MAIN_ORIGIN} className="hover:text-status-ink">
            galileomodapk.visora.my.id
          </a>
          <span>Powered by FlashDuty</span>
        </footer>
      </main>
    </div>
  );
}
