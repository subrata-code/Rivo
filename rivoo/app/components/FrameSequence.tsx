"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import FrameOverlay from "./FrameOverlay";

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
  const currentFrameRef = useRef(-1);
  const pendingFrameRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const loadImage = useCallback((index: number): Promise<HTMLImageElement | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = FRAME_PATH(index);
      img.onload = () => {
        imagesRef.current[index] = img;
        resolve(img);
      };
      img.onerror = () => resolve(null);
    });
  }, []);

  const drawFrame = useCallback((index: number) => {
    const canvas = canvasRef.current;
    const img = imagesRef.current[index];
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    currentFrameRef.current = index;
  }, []);

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

  return (
    <>
      {!loaded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="flex flex-col items-center gap-4">
            <div className="relative h-1 w-48 overflow-hidden rounded-full bg-white/10">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-white transition-all duration-200"
                style={{ width: `${loadProgress}%` }}
              />
            </div>
            <span className="text-sm font-medium tabular-nums text-white/70">
              {loadProgress}%
            </span>
          </div>
        </div>
      )}
      <section ref={sectionRef} className="relative h-[500vh] bg-black">
        <div ref={pinRef} className="relative flex h-screen w-full items-center justify-center">
          <canvas ref={canvasRef} className="max-h-full max-w-full object-contain" />
          <FrameOverlay />
        </div>
      </section>
    </>
  );
}
