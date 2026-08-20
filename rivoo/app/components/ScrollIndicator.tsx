"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

/* ─────────────────────────────────────────────
   Scroll Indicator — "SCROLL TO RIDE"
   Appears at the start, fades out once scrolling begins.
───────────────────────────────────────────── */

interface ScrollIndicatorProps {
  frameRef: React.RefObject<number>;
}

export default function ScrollIndicator({ frameRef }: ScrollIndicatorProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const hidden = useRef(false);

  useEffect(() => {
    const check = () => {
      const frame = frameRef.current ?? 0;
      if (frame > 20 && !hidden.current && wrapRef.current) {
        hidden.current = true;
        gsap.to(wrapRef.current, {
          opacity: 0,
          y: -10,
          duration: 0.6,
          ease: "power2.inOut",
          onComplete: () => {
            if (wrapRef.current) wrapRef.current.style.display = "none";
          },
        });
      }
    };

    const interval = setInterval(check, 150);
    return () => clearInterval(interval);
  }, [frameRef]);

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      className="absolute bottom-10 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-3 md:bottom-14"
    >
      {/* Label */}
      <span
        className="select-none whitespace-nowrap"
        style={{
          fontSize: "10px",
          fontWeight: 500,
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.5)",
        }}
      >
        SCROLL TO RIDE
      </span>

      {/* Line with traveling dot */}
      <div className="relative h-14 w-px overflow-hidden bg-white/10">
        <div
          className="absolute left-0 w-full rounded-full"
          style={{
            height: "8px",
            background: "var(--rivo-red)",
            animation: "scroll-dot-travel 2.2s ease-in-out infinite",
            boxShadow: "0 0 6px var(--rivo-red-glow)",
          }}
        />
      </div>
    </div>
  );
}
