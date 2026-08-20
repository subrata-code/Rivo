"use client";

import { useEffect, useRef, useState } from "react";
import Lenis, { type LenisOptions } from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const DEFAULT_OPTIONS: LenisOptions = {
  autoRaf: false,
  lerp: 0.07,
  duration: 1.4,
  smoothWheel: true,
  syncTouch: true,
  syncTouchLerp: 0.075,
  touchMultiplier: 1.2,
  wheelMultiplier: 0.6,
  orientation: "vertical",
  gestureOrientation: "vertical",
  anchors: true,
  respectReducedMotion: true,
};

export function useLenis(options?: LenisOptions): Lenis | null {
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const lenisInstance = new Lenis({
      ...DEFAULT_OPTIONS,
      ...optionsRef.current,
    });

    setLenis(lenisInstance);

    const scroller = document.documentElement;

    const onLenisScroll = () => ScrollTrigger.update();
    lenisInstance.on("scroll", onLenisScroll);

    ScrollTrigger.scrollerProxy(scroller, {
      scrollTop(value?: number) {
        if (value !== undefined) {
          lenisInstance.scrollTo(value, { immediate: true });
        }
        return lenisInstance.scroll;
      },
      getBoundingClientRect() {
        return {
          top: 0,
          left: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        };
      },
    });

    const onScrollTriggerRefresh = () => lenisInstance.resize();
    ScrollTrigger.addEventListener("refresh", onScrollTriggerRefresh);

    const tickerCallback = (time: number) => {
      lenisInstance.raf(time * 1000);
    };

    gsap.ticker.add(tickerCallback);
    gsap.ticker.lagSmoothing(0);
    ScrollTrigger.refresh();

    return () => {
      lenisInstance.off("scroll", onLenisScroll);
      ScrollTrigger.removeEventListener("refresh", onScrollTriggerRefresh);
      gsap.ticker.remove(tickerCallback);

      ScrollTrigger.scrollerProxy(scroller, {
        scrollTop(value?: number) {
          if (value !== undefined) {
            window.scrollTo(0, value);
          }
          return window.scrollY;
        },
        getBoundingClientRect() {
          return {
            top: 0,
            left: 0,
            width: window.innerWidth,
            height: window.innerHeight,
          };
        },
      });

      lenisInstance.destroy();
      setLenis(null);
    };
  }, []);

  return lenis;
}
