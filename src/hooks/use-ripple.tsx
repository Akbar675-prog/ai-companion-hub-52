import { useCallback, useRef, useState } from "react";

type Ripple = { key: number; x: number; y: number; size: number };

export function useRipple() {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const idRef = useRef(0);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    const key = ++idRef.current;
    setRipples((r) => [...r, { key, x, y, size }]);
    window.setTimeout(() => {
      setRipples((r) => r.filter((rp) => rp.key !== key));
    }, 600);
  }, []);

  const rippleNodes = (
    <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      {ripples.map((r) => (
        <span
          key={r.key}
          className="absolute rounded-full bg-current opacity-30 animate-[ripple_600ms_ease-out_forwards]"
          style={{
            left: r.x,
            top: r.y,
            width: r.size,
            height: r.size,
          }}
        />
      ))}
    </span>
  );

  return { onPointerDown, rippleNodes };
}
