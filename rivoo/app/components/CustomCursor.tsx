"use client";

import { useEffect, useRef, useCallback } from "react";
import gsap from "gsap";

/* ─────────────────────────────────────────────
   Custom Cursor — dot + trailing ring
   Desktop only (pointer: fine).
   Uses GSAP quickTo for 60fps-smooth tracking.
───────────────────────────────────────────── */

interface CustomCursorProps {
  /** Current cinematic frame (0-based). Used to decide "SCROLL" label visibility. */
  frameRef: React.RefObject<number>;
}

export default function CustomCursor({ frameRef }: CustomCursorProps) {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const isTouch = useRef(false);
  const hasScrolled = useRef(false);
  const hoverState = useRef<"default" | "link" | "cta" | "canvas">("default");
  const quickX = useRef<ReturnType<typeof gsap.quickTo> | null>(null);
  const quickY = useRef<ReturnType<typeof gsap.quickTo> | null>(null);

  /* ── Check touch device ── */
  useEffect(() => {
    isTouch.current = !window.matchMedia("(pointer: fine)").matches;
    if (isTouch.current) return;

    // Enable custom cursor CSS
    document.documentElement.classList.add("cursor-ready");
    return () => {
      document.documentElement.classList.remove("cursor-ready");
    };
  }, []);

  /* ── Set up GSAP quickTo for ring trailing ── */
  useEffect(() => {
    if (isTouch.current) return;
    const ring = ringRef.current;
    if (!ring) return;

    quickX.current = gsap.quickTo(ring, "x", {
      duration: 0.45,
      ease: "power3.out",
    });
    quickY.current = gsap.quickTo(ring, "y", {
      duration: 0.45,
      ease: "power3.out",
    });
  }, []);

  /* ── Mouse move handler ── */
  const onMouseMove = useCallback((e: MouseEvent) => {
    const dot = dotRef.current;
    if (!dot) return;

    // Dot follows exactly
    gsap.set(dot, { x: e.clientX, y: e.clientY });

    // Ring trails
    quickX.current?.(e.clientX);
    quickY.current?.(e.clientY);
  }, []);

  /* ── Hover detection ── */
  const onMouseOver = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const ring = ringRef.current;
    const label = labelRef.current;
    if (!ring || !label) return;

    if (target.closest("[data-cursor='cta']")) {
      hoverState.current = "cta";
      gsap.to(ring, {
        width: 80,
        height: 80,
        borderColor: "rgba(230, 57, 70, 0.5)",
        duration: 0.35,
        ease: "power2.out",
      });
      label.textContent = "RIDE →";
      gsap.to(label, { opacity: 1, duration: 0.2 });
    } else if (
      target.closest("a") ||
      target.closest("button") ||
      target.closest("[data-cursor='link']")
    ) {
      hoverState.current = "link";
      gsap.to(ring, {
        width: 52,
        height: 52,
        borderColor: "rgba(255,255,255,0.3)",
        duration: 0.3,
        ease: "power2.out",
      });
      gsap.to(label, { opacity: 0, duration: 0.15 });
    } else if (target.closest("[data-cursor='canvas']")) {
      hoverState.current = "canvas";
      if (!hasScrolled.current) {
        label.textContent = "SCROLL ↓";
        gsap.to(label, { opacity: 1, duration: 0.25 });
      }
      gsap.to(ring, {
        width: 56,
        height: 56,
        borderColor: "rgba(255,255,255,0.15)",
        duration: 0.3,
        ease: "power2.out",
      });
    } else {
      resetCursor();
    }
  }, []);

  const resetCursor = useCallback(() => {
    const ring = ringRef.current;
    const label = labelRef.current;
    if (!ring || !label) return;
    hoverState.current = "default";
    gsap.to(ring, {
      width: 40,
      height: 40,
      borderColor: "rgba(255,255,255,0.2)",
      duration: 0.35,
      ease: "power2.out",
    });
    gsap.to(label, { opacity: 0, duration: 0.15 });
  }, []);

  const onMouseOut = useCallback(
    (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest("[data-cursor='cta']") ||
        target.closest("a") ||
        target.closest("button") ||
        target.closest("[data-cursor='canvas']") ||
        target.closest("[data-cursor='link']")
      ) {
        resetCursor();
      }
    },
    [resetCursor]
  );

  /* ── Track scroll to hide SCROLL label ── */
  useEffect(() => {
    if (isTouch.current) return;

    const checkScroll = () => {
      const frame = frameRef.current ?? 0;
      if (frame > 30 && !hasScrolled.current) {
        hasScrolled.current = true;
        if (hoverState.current === "canvas" && labelRef.current) {
          gsap.to(labelRef.current, { opacity: 0, duration: 0.3 });
        }
      }
    };

    const interval = setInterval(checkScroll, 200);
    return () => clearInterval(interval);
  }, [frameRef]);

  /* ── Attach listeners ── */
  useEffect(() => {
    if (isTouch.current) return;

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("mouseover", onMouseOver, { passive: true });
    document.addEventListener("mouseout", onMouseOut, { passive: true });

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseover", onMouseOver);
      document.removeEventListener("mouseout", onMouseOut);
    };
  }, [onMouseMove, onMouseOver, onMouseOut]);

  /* ── Hide on mouse leave window ── */
  useEffect(() => {
    if (isTouch.current) return;
    const onLeave = () => {
      gsap.to([dotRef.current, ringRef.current], {
        opacity: 0,
        duration: 0.2,
      });
    };
    const onEnter = () => {
      gsap.to([dotRef.current, ringRef.current], {
        opacity: 1,
        duration: 0.2,
      });
    };
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);
    return () => {
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
    };
  }, []);

  /* ── Don't render on touch ── */
  // We always render but hide via CSS pointer check + opacity

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[9999] hidden md:block"
      style={{ mixBlendMode: "difference" }}
    >
      {/* Dot */}
      <div
        ref={dotRef}
        className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: "var(--cursor-dot-size)",
          height: "var(--cursor-dot-size)",
          borderRadius: "50%",
          background: "white",
        }}
      />

      {/* Ring */}
      <div
        ref={ringRef}
        className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
        style={{
          width: "var(--cursor-ring-size)",
          height: "var(--cursor-ring-size)",
          borderRadius: "50%",
          border: "var(--cursor-ring-border) solid rgba(255,255,255,0.2)",
          willChange: "transform, width, height",
        }}
      >
        {/* Label */}
        <div
          ref={labelRef}
          className="whitespace-nowrap text-center"
          style={{
            fontSize: "9px",
            fontWeight: 500,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "white",
            opacity: 0,
          }}
        />
      </div>
    </div>
  );
}
