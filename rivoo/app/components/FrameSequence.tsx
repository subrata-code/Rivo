"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import FrameOverlay from "./FrameOverlay";
import CustomCursor from "./CustomCursor";

gsap.registerPlugin(ScrollTrigger);

const TOTAL_FRAMES = 3096;
const INITIAL_FRAMES = 150;
const FRAME_PATH = (i: number) =>
  `/frames/frame_${String(i + 1).padStart(4, "0")}.jpg`;

export default function FrameSequence() {
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<(HTMLImageElement | null)[]>(
    new Array(TOTAL_FRAMES).fill(null)
  );
  const [loadProgress, setLoadProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const currentFrameRef = useRef(0);
  const pendingFrameRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const frameAspectRef = useRef(16 / 9); // will be set from first loaded image

  /* ── Image loading ── */

  const loadImage = useCallback(
    (index: number): Promise<HTMLImageElement | null> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = FRAME_PATH(index);
        img.onload = () => {
          imagesRef.current[index] = img;
          // Capture aspect ratio from first image
          if (index === 0 && img.width > 0) {
            frameAspectRef.current = img.width / img.height;
          }
          resolve(img);
        };
        img.onerror = () => resolve(null);
      });
    },
    []
  );

  /* ── Canvas drawing with cinematic cover/contain ── */

  const drawFrame = useCallback((index: number) => {
    const canvas = canvasRef.current;
    const img = imagesRef.current[index];
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;

    // Set canvas to viewport size * dpr for crisp rendering
    canvas.width = vpW * dpr;
    canvas.height = vpH * dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Calculate cover-fit (like CSS object-fit: cover)
    const imgAspect = img.width / img.height;
    const vpAspect = vpW / vpH;

    let drawW: number, drawH: number, drawX: number, drawY: number;

    if (imgAspect > vpAspect) {
      // Image is wider — fit height, crop sides
      drawH = vpH;
      drawW = vpH * imgAspect;
      drawX = (vpW - drawW) / 2;
      drawY = 0;
    } else {
      // Image is taller — fit width, crop top/bottom
      drawW = vpW;
      drawH = vpW / imgAspect;
      drawX = 0;
      drawY = (vpH - drawH) / 2;
    }

    // Clear and draw
    ctx.clearRect(0, 0, vpW, vpH);
    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    currentFrameRef.current = index;
  }, []);

  /* ── Batched RAF drawing ── */

  const scheduleDraw = useCallback(
    (frame: number) => {
      if (frame === currentFrameRef.current) return;

      pendingFrameRef.current = frame;
      if (rafIdRef.current !== null) return;

      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        const pending = pendingFrameRef.current;
        pendingFrameRef.current = null;

        if (pending !== null && pending !== currentFrameRef.current) {
          drawFrame(pending);
        }
      });
    },
    [drawFrame]
  );

  /* ── Preload frames ── */

  useEffect(() => {
    let cancelled = false;

    async function preload() {
      let count = 0;
      const batchSize = 10;

      for (let i = 0; i < INITIAL_FRAMES; i += batchSize) {
        const batch = Array.from(
          { length: Math.min(batchSize, INITIAL_FRAMES - i) },
          (_, k) =>
            loadImage(i + k).then(() => {
              count++;
              if (!cancelled) {
                setLoadProgress(Math.round((count / INITIAL_FRAMES) * 100));
              }
            })
        );
        await Promise.all(batch);
        if (cancelled) return;
      }

      if (!cancelled) {
        setLoaded(true);
        loadRemaining();
      }
    }

    async function loadRemaining() {
      for (let i = INITIAL_FRAMES; i < TOTAL_FRAMES; i++) {
        if (cancelled) return;
        await loadImage(i);
      }
    }

    preload();
    return () => {
      cancelled = true;
    };
  }, [loadImage]);

  /* ── ScrollTrigger setup ── */

  useEffect(() => {
    if (!loaded || !sectionRef.current || !pinRef.current) return;

    const scrollTrigger = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: "top top",
      end: "bottom bottom",
      pin: pinRef.current,
      pinSpacing: true,
      onUpdate: (self) => {
        const frame = Math.floor(self.progress * (TOTAL_FRAMES - 1));
        scheduleDraw(frame);
      },
    });

    scheduleDraw(0);
    ScrollTrigger.refresh();

    return () => {
      scrollTrigger.kill();
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [loaded, scheduleDraw]);

  /* ── Resize handler for canvas ── */

  useEffect(() => {
    if (!loaded) return;

    const onResize = () => {
      const frame = currentFrameRef.current;
      drawFrame(frame);
    };

    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, [loaded, drawFrame]);

  /* ── Render ── */

  return (
    <>
      {/* Premium loader */}
      {!loaded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="flex flex-col items-center gap-5">
            {/* RIVO logo */}
            <div className="flex items-center gap-2.5 mb-4">
              <svg
                width="22"
                height="22"
                viewBox="0 0 18 18"
                fill="none"
                aria-hidden="true"
                style={{ color: "rgba(255,255,255,0.8)" }}
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
                  fontSize: "13px",
                  fontWeight: 500,
                  letterSpacing: "0.35em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.8)",
                }}
              >
                Rivo
              </span>
            </div>

            {/* Progress bar */}
            <div className="relative h-[2px] w-52 overflow-hidden rounded-full bg-white/10">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${loadProgress}%`,
                  background:
                    "linear-gradient(90deg, var(--rivo-red), rgba(255,255,255,0.9))",
                }}
              />
            </div>

            {/* Percentage */}
            <span
              style={{
                fontSize: "11px",
                fontWeight: 500,
                letterSpacing: "0.15em",
                color: "rgba(255,255,255,0.4)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {loadProgress}%
            </span>
          </div>
        </div>
      )}

      {/* ── Cinematic Section ── */}
      <section
        ref={sectionRef}
        className="relative bg-black"
        style={{ height: "800vh" }}
      >
        <div
          ref={pinRef}
          className="relative flex h-screen w-full items-center justify-center overflow-hidden"
          data-cursor="canvas"
        >
          {/* Canvas — full viewport cinematic */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full"
            style={{ display: "block" }}
            aria-label="Rivo cinematic motorcycle experience — scroll to play"
            role="img"
          />

          {/* All overlays */}
          <FrameOverlay frameRef={currentFrameRef} />
        </div>
      </section>

      {/* Custom cursor — rendered at page level */}
      <CustomCursor frameRef={currentFrameRef} />
    </>
  );
}
