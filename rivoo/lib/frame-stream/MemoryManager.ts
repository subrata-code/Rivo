/* ─────────────────────────────────────────────
   Rivo Frame Streaming Engine — Memory Manager
   Detects device capability and sets budgets.
───────────────────────────────────────────── */

import type { DeviceTier, DeviceCapability, NetworkQuality } from './types';
import { CACHE_CONFIG, LOADER_CONFIG } from './config';

/** Detect device performance tier */
function detectTier(): DeviceTier {
  if (typeof navigator === 'undefined') return 'medium';

  const memory = (navigator as { deviceMemory?: number }).deviceMemory;
  const cores = navigator.hardwareConcurrency ?? 4;

  // Low-end: ≤2 GB RAM or ≤2 cores
  if ((memory !== undefined && memory <= 2) || cores <= 2) return 'low';
  // High-end: ≥8 GB RAM and ≥6 cores
  if ((memory === undefined || memory >= 8) && cores >= 6) return 'high';

  return 'medium';
}

/** Detect if device is mobile based on viewport and pointer */
function detectMobile(): boolean {
  if (typeof window === 'undefined') return false;
  const narrow = window.innerWidth < 768;
  const touch = !window.matchMedia('(pointer: fine)').matches;
  return narrow || touch;
}

/** Detect network quality from Network Information API */
function detectNetworkQuality(): NetworkQuality {
  if (typeof navigator === 'undefined') return 'unknown';

  const conn = (navigator as {
    connection?: {
      effectiveType?: string;
      downlink?: number;
      saveData?: boolean;
    };
  }).connection;

  if (!conn) return 'unknown';
  if (conn.saveData) return 'slow';

  const etype = conn.effectiveType;
  if (etype === '4g') return 'fast';
  if (etype === '3g') return 'medium';
  if (etype === '2g' || etype === 'slow-2g') return 'slow';

  // Fallback to downlink estimation
  const dl = conn.downlink;
  if (dl !== undefined) {
    if (dl >= 5) return 'fast';
    if (dl >= 1) return 'medium';
    return 'slow';
  }

  return 'unknown';
}

export class MemoryManager {
  private _capability: DeviceCapability;

  constructor() {
    const tier = detectTier();
    const isMobile = detectMobile();
    const networkQuality = detectNetworkQuality();

    this._capability = {
      tier,
      isMobile,
      networkQuality,
      maxCacheSize: this.cacheForTier(tier, networkQuality),
      maxConcurrent: this.concurrencyForTier(tier, networkQuality),
      maxDPR: isMobile ? CACHE_CONFIG.maxDPRMobile : CACHE_CONFIG.maxDPRDesktop,
    };
  }

  get capability(): DeviceCapability {
    return this._capability;
  }

  /** Refresh network detection (call periodically if desired) */
  refreshNetwork(): void {
    const nq = detectNetworkQuality();
    if (nq !== this._capability.networkQuality) {
      this._capability = {
        ...this._capability,
        networkQuality: nq,
        maxCacheSize: this.cacheForTier(this._capability.tier, nq),
        maxConcurrent: this.concurrencyForTier(this._capability.tier, nq),
      };
    }
  }

  private cacheForTier(tier: DeviceTier, nq: NetworkQuality): number {
    const base =
      tier === 'high'
        ? CACHE_CONFIG.maxSizeHigh
        : tier === 'medium'
          ? CACHE_CONFIG.maxSizeMedium
          : CACHE_CONFIG.maxSizeLow;

    // On slow networks, reduce cache slightly (fewer concurrent loads anyway)
    if (nq === 'slow') return Math.max(30, Math.floor(base * 0.7));
    return base;
  }

  private concurrencyForTier(tier: DeviceTier, nq: NetworkQuality): number {
    let base: number;
    if (tier === 'high') base = LOADER_CONFIG.maxConcurrentHigh;
    else if (tier === 'medium') base = LOADER_CONFIG.maxConcurrentMedium;
    else base = LOADER_CONFIG.maxConcurrentLow;

    // On slow networks, reduce concurrency to avoid saturation
    if (nq === 'slow') return Math.max(1, Math.floor(base / 2));
    return base;
  }
}
