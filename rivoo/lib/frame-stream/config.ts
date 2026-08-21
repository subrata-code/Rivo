/* ─────────────────────────────────────────────
   Rivo Frame Streaming Engine — Configuration
   All tunable constants in one place.
───────────────────────────────────────────── */

import type { FrameConfig, PreloadConfig, CacheConfig, LoaderConfig } from './types';

/** Frame sequence configuration */
export const FRAME_CONFIG: FrameConfig = {
  totalFrames: 3096,
  framePath: (i: number) =>
    `/frames/frame_${String(i + 1).padStart(4, '0')}.jpg`,
  sectionHeight: '800vh',
};

/** Adaptive preload window sizes (in frames) */
export const PRELOAD_CONFIG: PreloadConfig = {
  slowAhead: 12,
  slowBehind: 8,
  mediumAhead: 24,
  mediumBehind: 8,
  fastAhead: 45,
  fastBehind: 8,
};

/** Cache limits per device tier */
export const CACHE_CONFIG: CacheConfig = {
  maxSizeHigh: 150,
  maxSizeMedium: 80,
  maxSizeLow: 40,
  maxDPRDesktop: 2.5,
  maxDPRMobile: 2,
};

/** Loader concurrency and retry settings */
export const LOADER_CONFIG: LoaderConfig = {
  maxConcurrentHigh: 6,
  maxConcurrentMedium: 4,
  maxConcurrentLow: 2,
  maxRetries: 3,
  retryBaseDelay: 1000, // ms
};

/** Number of initial frames to load before animation becomes interactive */
export const INITIAL_BATCH_SIZE = 20;

/** Velocity thresholds (frames-per-tick delta) */
export const VELOCITY_THRESHOLDS = {
  /** Below this = slow */
  slow: 3,
  /** Above this = fast */
  fast: 15,
} as const;
