"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

/* ─────────────────────────────────────────────
   Puncture Notification
   Small notification card for the "JOHN — Puncture Detected" moment.
   Appears at frames ~1550–1700.
───────────────────────────────────────────── */

const START_FRAME = 1550;
const END_FRAME = 1720;

interface PunctureNotificationProps {
  frameRef: React.RefObject<number>;
}

export default function PunctureNotification({
  frameRef,
}: PunctureNotificationProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const shown = useRef(false);
  const hidden = useRef(true);

  useEffect(() => {
    const check = () => {
      const frame = frameRef.current ?? 0;
      const card = cardRef.current;
      if (!card) return;

      if (frame >= START_FRAME && frame <= END_FRAME && hidden.current) {
        // Show
        hidden.current = false;
        shown.current = true;
        gsap.set(card, { visibility: "visible" });
        gsap.fromTo(
          card,
          {
            opacity: 0,
            x: 30,
            scale: 0.9,
            filter: "blur(6px)",
          },
          {
            opacity: 1,
            x: 0,
            scale: 1,
            filter: "blur(0px)",
            duration: 0.65,
            ease: "power2.out",
          }
        );
      } else if (
        (frame < START_FRAME || frame > END_FRAME) &&
        !hidden.current
      ) {
        // Hide
        hidden.current = true;
        gsap.to(card, {
          opacity: 0,
          x: -15,
          scale: 0.95,
          filter: "blur(4px)",
          duration: 0.4,
          ease: "power2.in",
          onComplete: () => {
            gsap.set(card, { visibility: "hidden" });
          },
        });
      }
    };

    const interval = setInterval(check, 33);
    return () => clearInterval(interval);
  }, [frameRef]);

  return (
    <div
      ref={cardRef}
      className="puncture-notification pointer-events-none absolute right-[6%] top-1/2 z-30 -translate-y-1/2 md:right-[8%]"
      style={{
        opacity: 0,
        visibility: "hidden",
        willChange: "transform, opacity, filter",
      }}
      role="status"
      aria-label="Puncture notification: John has a puncture detected"
    >
      <div
        className="flex items-center gap-3 rounded-xl px-5 py-3.5 md:gap-4 md:px-6 md:py-4"
        style={{
          background: "rgba(0, 0, 0, 0.6)",
          border: "1px solid rgba(230, 57, 70, 0.3)",
          backdropFilter: "blur(16px)",
          boxShadow:
            "0 0 25px rgba(230, 57, 70, 0.2), 0 0 6px rgba(230, 57, 70, 0.35), inset 0 0 20px rgba(230, 57, 70, 0.05)",
          animation: "notification-glow 2.5s ease-in-out infinite",
        }}
      >
        {/* Red warning icon */}
        <div className="relative flex-shrink-0">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full md:h-10 md:w-10"
            style={{
              background: "rgba(230, 57, 70, 0.15)",
              border: "1px solid rgba(230, 57, 70, 0.35)",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--rivo-red)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          {/* Pulsing dot */}
          <div
            className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full"
            style={{
              background: "var(--rivo-red)",
              boxShadow: "0 0 8px var(--rivo-red-dim)",
              animation: "loader-pulse 1.5s ease-in-out infinite",
            }}
          />
        </div>

        {/* Text */}
        <div>
          <div
            className="font-medium text-white"
            style={{
              fontSize: "13px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            JOHN
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "rgba(230, 57, 70, 0.9)",
              letterSpacing: "0.06em",
              marginTop: "2px",
            }}
          >
            Puncture detected
          </div>
        </div>
      </div>
    </div>
  );
}
