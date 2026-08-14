import { useEffect, useRef } from "react";

export type UsagePoint = { date: string; used: number };

function fmt(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" }).format(d);
}

/** Grafik pemakaian kredit (canvas) dengan animasi garis mengalir. */
export function UsageGraph({ points, height = 120 }: { points: UsagePoint[]; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let progress = 0;
    const started = performance.now();

    const styles = getComputedStyle(canvas);
    const line = styles.getPropertyValue("color").trim() || "#9ca3af";

    const draw = (now: number) => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      progress = Math.min(1, (now - started) / 900);
      const ease = 1 - Math.pow(1 - progress, 3);
      const wave = Math.sin(now / 900) * 0.5 + 0.5;

      const max = Math.max(1, ...points.map((p) => p.used));
      const pad = 6;
      const innerH = h - pad * 2;
      const step = points.length > 1 ? w / (points.length - 1) : w;

      const xy = points.map((p, i) => {
        const target = p.used / max;
        const v = target * ease;
        return [i * step, pad + innerH - v * innerH] as const;
      });

      // Garis halus (kurva Catmull-Rom sederhana).
      const path = new Path2D();
      path.moveTo(xy[0][0], xy[0][1]);
      for (let i = 0; i < xy.length - 1; i++) {
        const [x0, y0] = xy[i];
        const [x1, y1] = xy[i + 1];
        const cx = (x0 + x1) / 2;
        path.bezierCurveTo(cx, y0, cx, y1, x1, y1);
      }

      // Area gradien di bawah garis.
      const fill = new Path2D(path);
      fill.lineTo(w, h);
      fill.lineTo(0, h);
      fill.closePath();
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, `rgba(148,163,184,${0.28 + wave * 0.12})`);
      grad.addColorStop(1, "rgba(148,163,184,0)");
      ctx.fillStyle = grad;
      ctx.fill(fill);

      ctx.strokeStyle = line;
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.stroke(path);

      // Titik terakhir berdenyut.
      const [lx, ly] = xy[xy.length - 1];
      ctx.beginPath();
      ctx.arc(lx - 2, ly, 3 + wave * 1.6, 0, Math.PI * 2);
      ctx.fillStyle = line;
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [points]);

  if (points.length === 0) return null;

  return (
    <div>
      <canvas ref={ref} style={{ height }} className="w-full text-foreground/70" />
      <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>{fmt(points[0].date)}</span>
        <span>{fmt(points[points.length - 1].date)}</span>
      </div>
    </div>
  );
}
