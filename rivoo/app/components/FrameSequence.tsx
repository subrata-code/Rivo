"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const TOTAL_FRAMES = 3096;
const INITIAL_FRAMES = 150;
const FRAME_PATH = (i: number) => `/frames/frame_${String(i + 1).padStart(4, "0")}.jpg`;

export default function FrameSequence() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<(HTMLImageElement | null)[]>(new Array(TOTAL_FRAMES).fill(null));
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const currentFrameRef = useRef(0);

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

  useEffect(() => {
    let cancelled = false;

    async function preload() {
      let count = 0;
      const batchSize = 10;

      for (let i = 0; i < INITIAL_FRAMES; i += batchSize) {
        const batch = Array.from(
          { length: Math.min(batchSize, INITIAL_FRAMES - i) },
          (_, k) => loadImage(i + k).then(() => {
            count++;
            if (!cancelled) setProgress(Math.round((count / INITIAL_FRAMES) * 100));
          })
        );
        await Promise.all(batch);
        if (cancelled) return;
      }

      if (!cancelled) {
        setLoaded(true);
        drawFrame(0);
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
    return () => { cancelled = true; };
  }, [loadImage, drawFrame]);

  useEffect(() => {
    if (!loaded) return;

    const handleScroll = () => {
      const scrollFraction = window.scrollY / (document.body.scrollHeight - window.innerHeight);
      const maxFrame = imagesRef.current.reduce(
        (max, img, i) => (img ? i : max), 0
      );
      const index = Math.min(Math.floor(scrollFraction * TOTAL_FRAMES), maxFrame);
      if (index !== currentFrameRef.current) drawFrame(index);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loaded, drawFrame]);

  return (
    <>
      {!loaded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="flex flex-col items-center gap-4">
            <div className="relative h-1 w-48 overflow-hidden rounded-full bg-white/10">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-white transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-sm font-medium tabular-nums text-white/70">
              {progress}%
            </span>
          </div>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="sticky top-0 h-screen w-full object-contain"
      />
    </>
  );
}
