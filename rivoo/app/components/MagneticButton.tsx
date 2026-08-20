"use client";

import { useEffect, useRef, useCallback } from "react";
import gsap from "gsap";

/* ─────────────────────────────────────────────
   Magnetic Button — Premium CTA
   Appears near the end of the cinematic (~2900+).
   Features magnetic hover, subtle glow, arrow animation.
───────────────────────────────────────────── */

const SHOW_FRAME = 2900;
const MAGNETIC_STRENGTH = 12; // max px movement

interface MagneticButtonProps {
  frameRef: React.RefObject<number>;
}

export default function MagneticButton({ frameRef }: MagneticButtonProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const arrowRef = useRef<HTMLSpanElement>(null);
  const shown = useRef(false);
  const hidden = useRef(true);
  const bounds = useRef<DOMRect | null>(null);

  /* ── Show/hide based on frame ── */
  useEffect(() => {
    const check = () => {
      const frame = frameRef.current ?? 0;
      const wrap = wrapRef.current;
      if (!wrap) return;

      if (frame >= SHOW_FRAME && hidden.current) {
        hidden.current = false;
        shown.current = true;
        gsap.set(wrap, { visibility: "visible" });
        gsap.fromTo(
          wrap,
          { opacity: 0, y: 20, filter: "blur(4px)" },
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 0.7,
            ease: "power2.out",
          }
        );
      } else if (frame < SHOW_FRAME && !hidden.current) {
        hidden.current = true;
        gsap.to(wrap, {
          opacity: 0,
          y: 15,
          duration: 0.4,
          ease: "power2.in",
          onComplete: () => {
            gsap.set(wrap, { visibility: "hidden" });
          },
        });
      }
    };

    const interval = setInterval(check, 33);
    return () => clearInterval(interval);
  }, [frameRef]);

  /* ── Magnetic effect ── */
  const onMouseMove = useCallback((e: MouseEvent) => {
    const btn = btnRef.current;
    if (!btn || !bounds.current) return;

    const rect = bounds.current;
    const x = e.clientX - (rect.left + rect.width / 2);
    const y = e.clientY - (rect.top + rect.height / 2);

    const magnetX = (x / (rect.width / 2)) * MAGNETIC_STRENGTH;
    const magnetY = (y / (rect.height / 2)) * MAGNETIC_STRENGTH;

    gsap.to(btn, {
      x: magnetX,
      y: magnetY,
      duration: 0.3,
      ease: "power2.out",
    });
  }, []);

  const onMouseEnter = useCallback(() => {
    const btn = btnRef.current;
    const arrow = arrowRef.current;
    if (!btn) return;

    bounds.current = btn.getBoundingClientRect();

    gsap.to(btn, {
      borderColor: "rgba(255,255,255,0.3)",
      backgroundColor: "rgba(255,255,255,0.08)",
      duration: 0.3,
    });

    if (arrow) {
      gsap.to(arrow, { x: 4, duration: 0.3, ease: "power2.out" });
    }

    window.addEventListener("mousemove", onMouseMove, { passive: true });
  }, [onMouseMove]);

  const onMouseLeave = useCallback(() => {
    const btn = btnRef.current;
    const arrow = arrowRef.current;
    if (!btn) return;

    gsap.to(btn, {
      x: 0,
      y: 0,
      borderColor: "rgba(255,255,255,0.1)",
      backgroundColor: "rgba(0,0,0,0.45)",
      duration: 0.5,
      ease: "power3.out",
    });

    if (arrow) {
      gsap.to(arrow, { x: 0, duration: 0.3, ease: "power2.out" });
    }

    window.removeEventListener("mousemove", onMouseMove);
  }, [onMouseMove]);

  /* ── Attach button listeners ── */
  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;

    btn.addEventListener("mouseenter", onMouseEnter);
    btn.addEventListener("mouseleave", onMouseLeave);

    return () => {
      btn.removeEventListener("mouseenter", onMouseEnter);
      btn.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [onMouseEnter, onMouseLeave, onMouseMove]);

  return (
    <div
      ref={wrapRef}
      className="absolute bottom-[10%] left-1/2 z-30 -translate-x-1/2 md:bottom-[12%]"
      style={{
        opacity: 0,
        visibility: "hidden",
        willChange: "transform, opacity",
      }}
    >
      <button
        ref={btnRef}
        data-cursor="cta"
        aria-label="Join the Ride — explore Rivo"
        className="pointer-events-auto flex items-center gap-3 rounded-full px-7 py-3.5 transition-shadow duration-300 hover:shadow-[0_0_30px_rgba(230,57,70,0.15)] md:px-9 md:py-4"
        style={{
          background: "rgba(0, 0, 0, 0.45)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(12px)",
          willChange: "transform",
        }}
      >
        <span
          className="select-none whitespace-nowrap text-white"
          style={{
            fontSize: "12px",
            fontWeight: 500,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          JOIN THE RIDE
        </span>
        <span
          ref={arrowRef}
          style={{ color: "var(--rivo-red)", fontSize: "14px", fontWeight: 500 }}
          aria-hidden="true"
        >
          →
        </span>
      </button>
    </div>
  );
}
