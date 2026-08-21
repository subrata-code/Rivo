"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FrameController } from "../../lib/frame-stream/FrameController";
import { FRAME_CONFIG } from "../../lib/frame-stream/config";
import FrameOverlay from "./FrameOverlay";
import CustomCursor from "./CustomCursor";

gsap.registerPlugin(ScrollTrigger);

export default function RivoFrameCanvas() {
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<FrameController | null>(null);
  const currentFrameRef = useRef(0);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);

  /* ── Initialize FrameController ── */

  const initController = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || controllerRef.current) return;

    const controller = new FrameController({
      canvas,
      totalFrames: FRAME_CONFIG.totalFrames,
      framePath: FRAME_CONFIG.framePath,
      onInitialLoadProgress: (progress) => {
        setLoadProgress(progress);
      },
      onReady: () => {
        setLoaded(true);
      },
    });

    // Share the frame ref so overlays can read it
    controllerRef.current = controller;
    // Point our local ref to the controller's internal ref
    // This is the bridge between the streaming engine and the overlay components
    currentFrameRef.current = 0;

    return controller;
  }, []);

  useEffect(() => {
    const controller = initController();
    return () => {
      controller?.destroy();
      controllerRef.current = null;
    };
  }, [initController]);

  /* ── Sync currentFrameRef with controller ── */
  /* The controller updates its own currentFrameRef.current on every scroll tick.
     We need overlays to read from the same ref. Instead of a polling loop,
     we use the GSAP ticker which runs at display refresh rate. */

  useEffect(() => {
    if (!loaded) return;

    const syncFrame = () => {
      const controller = controllerRef.current;
      if (controller) {
        currentFrameRef.current = controller.currentFrameRef.current;
      }
    };

    gsap.ticker.add(syncFrame);
    return () => {
      gsap.ticker.remove(syncFrame);
    };
  }, [loaded]);

  /* ── ScrollTrigger setup ── */

  useEffect(() => {
    if (!loaded || !sectionRef.current || !pinRef.current) return;

    const controller = controllerRef.current;
    if (!controller) return;

    const scrollTrigger = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: "top top",
      end: "bottom bottom",
      pin: pinRef.current,
      pinSpacing: true,
      onUpdate: (self) => {
        controller.setProgress(self.progress);
      },
    });

    // Draw first frame
    controller.setProgress(0);
    ScrollTrigger.refresh();

    return () => {
      scrollTrigger.kill();
    };
  }, [loaded]);

  /* ── Resize handler ── */

  useEffect(() => {
    if (!loaded) return;

    const onResize = () => {
      controllerRef.current?.handleResize();
    };

    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, [loaded]);

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
        style={{ height: FRAME_CONFIG.sectionHeight }}
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
