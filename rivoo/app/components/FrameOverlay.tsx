"use client";

import { useEffect, useRef, useCallback } from "react";
import gsap from "gsap";
import ScrollIndicator from "./ScrollIndicator";
import CinematicText from "./CinematicText";
import PunctureNotification from "./PunctureNotification";
import MagneticButton from "./MagneticButton";

/* ─────────────────────────────────────────────
   FrameOverlay — Cinematic Header + All Overlays
   Contains: premium header with magnetic nav,
   cinematic text, scroll indicator, puncture
   notification, and CTA button.
───────────────────────────────────────────── */

const NAV_LINKS = [
  { label: "Rides", href: "#rides" },
  { label: "Crew", href: "#crew" },
  { label: "About", href: "#about" },
];

const MAGNETIC_NAV_STRENGTH = 5; // max px movement for nav links

interface FrameOverlayProps {
  frameRef: React.RefObject<number>;
}

export default function FrameOverlay({ frameRef }: FrameOverlayProps) {
  const navRef = useRef<HTMLElement>(null);
  const navLinksRef = useRef<(HTMLAnchorElement | null)[]>([]);
  const headerBgRef = useRef<HTMLDivElement>(null);
  const navVisible = useRef(false);

  /* ── Header animation: fade nav in as scroll begins ── */
  useEffect(() => {
    const check = () => {
      const frame = frameRef.current ?? 0;
      const nav = navRef.current;
      const bg = headerBgRef.current;
      if (!nav || !bg) return;

      // Nav links fade in from frame 80–250
      if (frame >= 80 && !navVisible.current) {
        navVisible.current = true;
        gsap.to(nav, {
          opacity: 1,
          duration: 0.6,
          ease: "power2.out",
        });
        gsap.to(bg, {
          opacity: 1,
          duration: 0.8,
          ease: "power2.out",
        });
      } else if (frame < 80 && navVisible.current) {
        navVisible.current = false;
        gsap.to(nav, {
          opacity: 0,
          duration: 0.4,
          ease: "power2.in",
        });
        gsap.to(bg, {
          opacity: 0,
          duration: 0.4,
          ease: "power2.in",
        });
      }

      // During intense cinematic moments (600–900, 1500–1800), make header more subtle
      if (
        (frame >= 600 && frame <= 900) ||
        (frame >= 1500 && frame <= 1800)
      ) {
        gsap.to(nav, {
          opacity: Math.max(0.25, nav.style.opacity === "0" ? 0 : 0.25),
          duration: 0.5,
          overwrite: "auto",
        });
      } else if (frame >= 250 && navVisible.current) {
        gsap.to(nav, {
          opacity: 0.7,
          duration: 0.5,
          overwrite: "auto",
        });
      }
    };

    const interval = setInterval(check, 100);
    return () => clearInterval(interval);
  }, [frameRef]);

  /* ── Magnetic nav interaction ── */
  const handleNavMouseMove = useCallback((e: MouseEvent, link: HTMLAnchorElement) => {
    const rect = link.getBoundingClientRect();
    const x = e.clientX - (rect.left + rect.width / 2);
    const y = e.clientY - (rect.top + rect.height / 2);

    const magnetX = (x / (rect.width / 2)) * MAGNETIC_NAV_STRENGTH;
    const magnetY = (y / (rect.height / 2)) * MAGNETIC_NAV_STRENGTH;

    gsap.to(link, {
      x: magnetX,
      y: magnetY,
      duration: 0.25,
      ease: "power2.out",
    });
  }, []);

  const handleNavMouseLeave = useCallback((link: HTMLAnchorElement) => {
    gsap.to(link, {
      x: 0,
      y: 0,
      duration: 0.45,
      ease: "power3.out",
    });
  }, []);

  /* ── Attach magnetic listeners to nav links ── */
  useEffect(() => {
    const links = navLinksRef.current.filter(Boolean) as HTMLAnchorElement[];
    const handlers: Array<{ el: HTMLAnchorElement; move: (e: MouseEvent) => void; leave: () => void }> = [];

    links.forEach((link) => {
      const move = (e: MouseEvent) => handleNavMouseMove(e, link);
      const leave = () => handleNavMouseLeave(link);
      link.addEventListener("mousemove", move, { passive: true });
      link.addEventListener("mouseleave", leave);
      handlers.push({ el: link, move, leave });
    });

    return () => {
      handlers.forEach(({ el, move, leave }) => {
        el.removeEventListener("mousemove", move);
        el.removeEventListener("mouseleave", leave);
      });
    };
  }, [handleNavMouseMove, handleNavMouseLeave]);

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {/* ── Header ── */}
      <header className="absolute inset-x-0 top-0 z-40">
        {/* Subtle gradient background — only visible after scroll */}
        <div
          ref={headerBgRef}
          className="absolute inset-x-0 top-0 h-24"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)",
            opacity: 0,
          }}
          aria-hidden="true"
        />

        <div className="relative flex items-center justify-between px-6 py-7 md:px-10 md:py-9">
          {/* Logo */}
          <a
            href="/"
            aria-label="Rivo home"
            className="pointer-events-auto flex items-center gap-2.5"
            data-cursor="link"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              aria-hidden="true"
              className="text-white/90"
            >
              <path
                d="M3 15V3h4.5l3 9 3-9H15v12"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 500,
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.9)",
              }}
            >
              Rivo
            </span>
          </a>

          {/* Navigation */}
          <nav
            ref={navRef}
            aria-label="Primary"
            className="pointer-events-auto flex items-center gap-7 md:gap-9"
            style={{ opacity: 0 }}
          >
            {NAV_LINKS.map((link, i) => (
              <a
                key={link.label}
                href={link.href}
                ref={(el) => {
                  navLinksRef.current[i] = el;
                }}
                data-cursor="link"
                className="transition-colors duration-300 hover:text-white/90"
                style={{
                  fontSize: "11px",
                  fontWeight: 400,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.45)",
                  display: "inline-block",
                  willChange: "transform",
                }}
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      {/* ── Cinematic Text Overlays ── */}
      <CinematicText frameRef={frameRef} />

      {/* ── Puncture Notification ── */}
      <PunctureNotification frameRef={frameRef} />

      {/* ── Magnetic CTA ── */}
      <MagneticButton frameRef={frameRef} />

      {/* ── Scroll Indicator ── */}
      <ScrollIndicator frameRef={frameRef} />
    </div>
  );
}
