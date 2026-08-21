/* ─────────────────────────────────────────────
   Rivo Frame Streaming Engine — Frame Cache
   LRU-evicting cache with per-frame state tracking.
───────────────────────────────────────────── */

import type { FrameState } from './types';

interface CacheEntry {
  image: HTMLImageElement;
  /** Timestamp of last access — for LRU eviction */
  lastAccess: number;
}

export class FrameCache {
  private _cache = new Map<number, CacheEntry>();
  private _states = new Map<number, FrameState>();
  private _maxSize: number;

  constructor(maxSize: number) {
    this._maxSize = maxSize;
  }

  /* ── Core API ── */

  get(index: number): HTMLImageElement | null {
    const entry = this._cache.get(index);
    if (!entry) return null;
    // Touch for LRU
    entry.lastAccess = performance.now();
    return entry.image;
  }

  has(index: number): boolean {
    return this._cache.has(index);
  }

  set(index: number, image: HTMLImageElement): void {
    this._cache.set(index, {
      image,
      lastAccess: performance.now(),
    });
    this._states.set(index, 'loaded');

    // Evict if over capacity (deferred to avoid blocking)
    if (this._cache.size > this._maxSize) {
      this.evict();
    }
  }

  delete(index: number): void {
    this._cache.delete(index);
    this._states.delete(index);
  }

  clear(): void {
    this._cache.clear();
    this._states.clear();
  }

  /* ── State tracking ── */

  getState(index: number): FrameState {
    return this._states.get(index) ?? 'idle';
  }

  setState(index: number, state: FrameState): void {
    this._states.set(index, state);
  }

  /** Number of frames currently in loaded state */
  get loadedCount(): number {
    return this._cache.size;
  }

  /** Number of frames currently loading */
  get loadingCount(): number {
    let count = 0;
    for (const state of this._states.values()) {
      if (state === 'loading') count++;
    }
    return count;
  }

  /** Number of frames that failed to load */
  get failedCount(): number {
    let count = 0;
    for (const state of this._states.values()) {
      if (state === 'failed') count++;
    }
    return count;
  }

  /* ── Nearest frame lookup ── */

  /**
   * Find the nearest cached frame to the given index.
   * Returns the closest loaded frame index, or -1 if cache is empty.
   */
  getNearest(index: number): number {
    if (this._cache.size === 0) return -1;
    if (this._cache.has(index)) return index;

    let nearest = -1;
    let minDist = Infinity;

    for (const key of this._cache.keys()) {
      const dist = Math.abs(key - index);
      if (dist < minDist) {
        minDist = dist;
        nearest = key;
      }
    }

    return nearest;
  }

  /* ── Eviction ── */

  /** Update max size (e.g. when MemoryManager refreshes) */
  set maxSize(value: number) {
    this._maxSize = value;
    if (this._cache.size > this._maxSize) {
      this.evict();
    }
  }

  get maxSize(): number {
    return this._maxSize;
  }

  /**
   * Evict least-recently-used entries until cache is within budget.
   * Uses LRU (lastAccess timestamp) as primary eviction criterion.
   */
  private evict(): void {
    const toEvict = this._cache.size - this._maxSize;
    if (toEvict <= 0) return;

    // Build list sorted by lastAccess ascending (oldest first)
    const entries = Array.from(this._cache.entries()).sort(
      (a, b) => a[1].lastAccess - b[1].lastAccess
    );

    for (let i = 0; i < toEvict && i < entries.length; i++) {
      const [key] = entries[i];
      this._cache.delete(key);
      this._states.delete(key);
    }
  }

  /**
   * Distance-based eviction: remove frames far from the current position.
   * More aggressive than LRU — used when memory pressure is high.
   */
  evictDistant(currentFrame: number, keepRadius: number): number {
    let evicted = 0;
    for (const [key] of this._cache) {
      if (Math.abs(key - currentFrame) > keepRadius) {
        this._cache.delete(key);
        this._states.delete(key);
        evicted++;
      }
    }
    return evicted;
  }
}
