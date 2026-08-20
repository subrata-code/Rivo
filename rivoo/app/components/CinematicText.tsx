"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

/* ─────────────────────────────────────────────
   Cinematic Text System
   GSAP-driven text overlays synced to frame progress.
   All animation via refs — no React state in the loop.
───────────────────────────────────────────── */

const TOTAL_FRAMES = 3096;

/* ── Text moment configuration ── */

interface TextMoment {
  id: string;
  lines: string[];
  startFrame: number;
  endFrame: number;
  /** Frame range within which the text is fully visible (enter done, exit not started) */
  enterDuration: number; // frames to animate in
  exitDuration: number; // frames to animate out
  position:
    | "center"
    | "left"
    | "right"
    | "bottom-left"
    | "bottom-right"
    | "top-right";
  size: "hero" | "large" | "medium";
  /** Optional: treat as notification style (smaller, card-like) */
  isNotification?: boolean;
}

const TEXT_MOMENTS: TextMoment[] = [
  {
    id: "ready",
    lines: ["READY TO RIDE."],
    startFrame: 250,
    endFrame: 500,
    enterDuration: 60,
    exitDuration: 45,
    position: "center",
    size: "hero",
  },
  {
    id: "beyond",
    lines: ["RIDE BEYOND", "THE ROAD."],
    startFrame: 550,
    endFrame: 850,
    enterDuration: 60,
    exitDuration: 45,
    position: "left",
    size: "hero",
  },
  {
    id: "crew",
    lines: ["YOUR CREW.", "YOUR ROUTE.", "YOUR RIDE."],
    startFrame: 900,
    endFrame: 1150,
    enterDuration: 70,
    exitDuration: 50,
    position: "bottom-left",
    size: "large",
  },
  {
    id: "connected",
    lines: ["EVERY RIDE", "CONNECTED."],
    startFrame: 1200,
    endFrame: 1500,
    enterDuration: 60,
    exitDuration: 45,
    position: "right",
    size: "large",
  },
  {
    id: "wrong",
    lines: ["WHEN SOMETHING", "GOES WRONG..."],
    startFrame: 1750,
    endFrame: 2050,
    enterDuration: 65,
    exitDuration: 50,
    position: "center",
    size: "hero",
  },
  {
    id: "gotyou",
    lines: ["WE'VE GOT YOU."],
    startFrame: 2100,
    endFrame: 2450,
    enterDuration: 55,
    exitDuration: 45,
    position: "left",
    size: "hero",
  },
  {
    id: "bestroutes",
    lines: ["THE BEST ROUTES", "AREN'T ALWAYS", "ON THE MAP."],
    startFrame: 2500,
    endFrame: 2750,
    enterDuration: 65,
    exitDuration: 50,
    position: "bottom-left",
    size: "large",
  },
  {
    id: "final",
    lines: ["RIDE WITH RIVO."],
    startFrame: 2800,
    endFrame: 3050,
    enterDuration: 70,
    exitDuration: 50,
    position: "center",
    size: "hero",
  },
];

/* ── Position styles ── */

function getPositionClasses(position: TextMoment["position"]): string {
  switch (position) {
    case "center":
      return "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center";
    case "left":
      return "left-[6%] top-1/2 -translate-y-1/2 text-left md:left-[8%]";
    case "right":
      return "right-[6%] top-1/2 -translate-y-1/2 text-right md:right-[8%]";
    case "bottom-left":
      return "left-[6%] bottom-[12%] text-left md:left-[8%] md:bottom-[14%]";
    case "bottom-right":
      return "right-[6%] bottom-[12%] text-right md:right-[8%] md:bottom-[14%]";
    case "top-right":
      return "right-[6%] top-[18%] text-right md:right-[8%] md:top-[20%]";
  }
}

function getSizeStyle(size: TextMoment["size"]): React.CSSProperties {
  switch (size) {
    case "hero":
      return {
        fontSize: "clamp(2.2rem, 7vw, 7.5rem)",
        fontWeight: 600,
        lineHeight: 0.95,
        letterSpacing: "-0.02em",
      };
    case "large":
      return {
        fontSize: "clamp(1.6rem, 4.5vw, 4.5rem)",
        fontWeight: 500,
        lineHeight: 1.0,
        letterSpacing: "-0.01em",
      };
    case "medium":
      return {
        fontSize: "clamp(1.1rem, 2.5vw, 2rem)",
        fontWeight: 500,
        lineHeight: 1.15,
        letterSpacing: "0",
      };
  }
}

/* ── Component ── */

interface CinematicTextProps {
  frameRef: React.RefObject<number>;
}

export default function CinematicText({ frameRef }: CinematicTextProps) {
  const blockRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const lineRefs = useRef<Map<string, HTMLDivElement[]>>(new Map());
  const stateRefs = useRef<Map<string, "hidden" | "entering" | "visible" | "exiting">>(
    new Map()
  );

  /* Initialize all blocks as hidden */
  useEffect(() => {
    TEXT_MOMENTS.forEach((m) => {
      stateRefs.current.set(m.id, "hidden");
      const block = blockRefs.current.get(m.id);
      if (block) {
        gsap.set(block, { opacity: 0, visibility: "hidden" });
      }
      const lines = lineRefs.current.get(m.id);
      if (lines) {
        lines.forEach((line) => {
          gsap.set(line, {
            opacity: 0,
            y: 30,
            filter: "blur(8px)",
            scale: 0.96,
          });
        });
      }
    });
  }, []);

  /* ── Animation loop via interval (checking frame ref) ── */
  useEffect(() => {
    const animate = () => {
      const currentFrame = frameRef.current ?? 0;

      TEXT_MOMENTS.forEach((moment) => {
        const state = stateRefs.current.get(moment.id) ?? "hidden";
        const block = blockRefs.current.get(moment.id);
        const lines = lineRefs.current.get(moment.id);
        if (!block || !lines) return;

        const enterEnd = moment.startFrame + moment.enterDuration;
        const exitStart = moment.endFrame - moment.exitDuration;

        if (currentFrame >= moment.startFrame && currentFrame <= moment.endFrame) {
          // Should be visible
          if (state === "hidden") {
            stateRefs.current.set(moment.id, "entering");
            gsap.set(block, { visibility: "visible" });
            gsap.to(block, { opacity: 1, duration: 0.1 });

            lines.forEach((line, i) => {
              gsap.to(line, {
                opacity: 1,
                y: 0,
                filter: "blur(0px)",
                scale: 1,
                duration: 0.7,
                delay: i * 0.1,
                ease: "power2.out",
                onComplete: () => {
                  if (i === lines.length - 1) {
                    stateRefs.current.set(moment.id, "visible");
                  }
                },
              });
            });
          } else if (
            state === "visible" &&
            currentFrame >= exitStart
          ) {
            stateRefs.current.set(moment.id, "exiting");

            lines.forEach((line, i) => {
              gsap.to(line, {
                opacity: 0,
                y: -20,
                filter: "blur(4px)",
                scale: 0.97,
                duration: 0.5,
                delay: i * 0.06,
                ease: "power2.in",
              });
            });
            gsap.to(block, {
              opacity: 0,
              duration: 0.55,
              delay: lines.length * 0.06,
              onComplete: () => {
                gsap.set(block, { visibility: "hidden" });
                stateRefs.current.set(moment.id, "hidden");
                // Reset lines for potential re-entry
                lines.forEach((line) => {
                  gsap.set(line, {
                    opacity: 0,
                    y: 30,
                    filter: "blur(8px)",
                    scale: 0.96,
                  });
                });
              },
            });
          }
        } else if (state !== "hidden") {
          // Force hide if scrolled past/before
          stateRefs.current.set(moment.id, "hidden");
          gsap.killTweensOf(block);
          lines.forEach((line) => gsap.killTweensOf(line));
          gsap.set(block, { opacity: 0, visibility: "hidden" });
          lines.forEach((line) => {
            gsap.set(line, {
              opacity: 0,
              y: 30,
              filter: "blur(8px)",
              scale: 0.96,
            });
          });
        }
      });
    };

    // Check at ~30fps — plenty for text transitions
    const interval = setInterval(animate, 33);
    return () => clearInterval(interval);
  }, [frameRef]);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {TEXT_MOMENTS.map((moment) => (
        <div
          key={moment.id}
          ref={(el) => {
            if (el) blockRefs.current.set(moment.id, el);
          }}
          className={`cinematic-text absolute ${getPositionClasses(moment.position)}`}
          style={{
            opacity: 0,
            visibility: "hidden",
            willChange: "opacity",
          }}
        >
          {moment.lines.map((line, i) => (
            <div
              key={i}
              ref={(el) => {
                if (el) {
                  const arr = lineRefs.current.get(moment.id) ?? [];
                  arr[i] = el;
                  lineRefs.current.set(moment.id, arr);
                }
              }}
              className="select-none text-white"
              style={{
                ...getSizeStyle(moment.size),
                willChange: "transform, opacity, filter",
                textShadow: "0 2px 30px rgba(0,0,0,0.5)",
              }}
            >
              {line}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
