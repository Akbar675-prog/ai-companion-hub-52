import { forwardRef, type ButtonHTMLAttributes, type AnchorHTMLAttributes } from "react";
import { useRipple } from "@/hooks/use-ripple";

type CommonProps = { children: React.ReactNode; className?: string };

export const PressButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & CommonProps
>(function PressButton({ children, className = "", onPointerDown, ...rest }, ref) {
  const { onPointerDown: rippleDown, rippleNodes } = useRipple();
  return (
    <button
      ref={ref}
      {...rest}
      onPointerDown={(e) => {
        rippleDown(e);
        onPointerDown?.(e);
      }}
      className={`relative overflow-hidden transition-transform duration-150 active:scale-[0.96] ${className}`}
    >
      {children}
      {rippleNodes}
    </button>
  );
});

export const PressAnchor = forwardRef<
  HTMLAnchorElement,
  AnchorHTMLAttributes<HTMLAnchorElement> & CommonProps
>(function PressAnchor({ children, className = "", onPointerDown, ...rest }, ref) {
  const { onPointerDown: rippleDown, rippleNodes } = useRipple();
  return (
    <a
      ref={ref}
      {...rest}
      onPointerDown={(e) => {
        rippleDown(e);
        onPointerDown?.(e);
      }}
      className={`relative overflow-hidden transition-transform duration-150 active:scale-[0.96] ${className}`}
    >
      {children}
      {rippleNodes}
    </a>
  );
});
