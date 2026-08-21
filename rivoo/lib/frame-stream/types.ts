/* ─────────────────────────────────────────────
   Rivo Frame Streaming Engine — Type Definitions
───────────────────────────────────────────── */

/** State of a single frame in the cache/loader pipeline */
export type FrameState = 'idle' | 'loading' | 'loaded' | 'failed';

/** Device performance tier — drives cache sizes, concurrency, DPR limits */
export type DeviceTier = 'high' | 'medium' | 'low';

/** Scroll direction */
export type ScrollDirection = 'down' | 'up' | 'idle';

/** Scroll velocity bucket */
export type ScrollVelocity = 'slow' | 'medium' | 'fast';

/** Network quality bucket */
export type NetworkQuality = 'fast' | 'medium' | 'slow' | 'unknown';

/** Preload window configuration */
export interface PreloadConfig {
  readonly slowAhead: number;
  readonly slowBehind: number;
  readonly mediumAhead: number;
  readonly mediumBehind: number;
  readonly fastAhead: number;
  readonly fastBehind: number;
}

/** Cache configuration per device tier */
export interface CacheConfig {
  readonly maxSizeHigh: number;
  readonly maxSizeMedium: number;
  readonly maxSizeLow: number;
  readonly maxDPRDesktop: number;
  readonly maxDPRMobile: number;
}

/** Loader configuration */
export interface LoaderConfig {
  readonly maxConcurrentHigh: number;
  readonly maxConcurrentMedium: number;
  readonly maxConcurrentLow: number;
  readonly maxRetries: number;
  readonly retryBaseDelay: number;
}

/** Frame configuration */
export interface FrameConfig {
  readonly totalFrames: number;
  readonly framePath: (index: number) => string;
  readonly sectionHeight: string;
}

/** Device capability snapshot */
export interface DeviceCapability {
  readonly tier: DeviceTier;
  readonly maxCacheSize: number;
  readonly maxConcurrent: number;
  readonly maxDPR: number;
  readonly networkQuality: NetworkQuality;
  readonly isMobile: boolean;
}

/** Performance metrics for debug overlay */
export interface DebugInfo {
  currentFrame: number;
  loadedCount: number;
  loadingCount: number;
  cacheSize: number;
  failedCount: number;
  direction: ScrollDirection;
  velocity: ScrollVelocity;
  fps: number;
  memoryStatus: 'ok' | 'warning' | 'critical';
}

/** Frame URL generator function type */
export type FramePathFn = (index: number) => string;
