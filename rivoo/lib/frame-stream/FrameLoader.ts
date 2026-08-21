/* ─────────────────────────────────────────────
   Rivo Frame Streaming Engine — Frame Loader
   Concurrent image loader with async decode,
   priority support, and retry with backoff.
───────────────────────────────────────────── */

import type { FramePathFn } from './types';
import type { FrameCache } from './FrameCache';
import { LOADER_CONFIG } from './config';

interface LoadTask {
  index: number;
  priority: number; // lower = higher priority
  retryCount: number;
}

export class FrameLoader {
  private _cache: FrameCache;
  private _framePath: FramePathFn;
  private _maxConcurrent: number;
  private _activeCount = 0;
  private _queue: LoadTask[] = [];
  private _abortControllers = new Map<number, AbortController>();
  private _destroyed = false;

  constructor(cache: FrameCache, framePath: FramePathFn, maxConcurrent: number) {
    this._cache = cache;
    this._framePath = framePath;
    this._maxConcurrent = maxConcurrent;
  }

  /* ── Public API ── */

  /**
   * Request a batch of frames to load, ordered by priority.
   * Frames that are already loaded/loading are skipped.
   * Replaces any existing queue — new priorities take effect immediately.
   */
  loadFrames(indices: number[]): void {
    if (this._destroyed) return;

    // Build new queue, skipping already loaded/loading frames
    const newQueue: LoadTask[] = [];
    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      const state = this._cache.getState(idx);
      if (state === 'loaded' || state === 'loading') continue;
      newQueue.push({ index: idx, priority: i, retryCount: 0 });
    }

    this._queue = newQueue;
    this.flush();
  }

  /** Cancel all pending and active loads */
  cancelAll(): void {
    this._queue = [];
    for (const [, controller] of this._abortControllers) {
      controller.abort();
    }
    this._abortControllers.clear();
  }

  /** Update concurrency limit (e.g. after MemoryManager refresh) */
  set maxConcurrent(value: number) {
    this._maxConcurrent = value;
    this.flush();
  }

  /** Destroy the loader — cancel everything, prevent further loads */
  destroy(): void {
    this._destroyed = true;
    this.cancelAll();
  }

  /* ── Internal ── */

  /** Start loading tasks up to the concurrency limit */
  private flush(): void {
    while (this._activeCount < this._maxConcurrent && this._queue.length > 0) {
      const task = this._queue.shift()!;

      // Re-check state — may have been loaded since queueing
      const state = this._cache.getState(task.index);
      if (state === 'loaded' || state === 'loading') continue;

      this.loadOne(task);
    }
  }

  private async loadOne(task: LoadTask): Promise<void> {
    if (this._destroyed) return;

    const { index } = task;
    this._activeCount++;
    this._cache.setState(index, 'loading');

    const controller = new AbortController();
    this._abortControllers.set(index, controller);

    try {
      const img = await this.fetchAndDecode(index, controller.signal);

      if (this._destroyed) return;

      // Successfully loaded and decoded
      this._cache.set(index, img);
    } catch (err: unknown) {
      if (this._destroyed) return;

      // Aborted — not a real failure
      if (err instanceof DOMException && err.name === 'AbortError') {
        this._cache.setState(index, 'idle');
      } else {
        // Real failure — retry or mark failed
        if (task.retryCount < LOADER_CONFIG.maxRetries) {
          const delay =
            LOADER_CONFIG.retryBaseDelay * Math.pow(2, task.retryCount);
          task.retryCount++;
          // Reset state so it can be re-queued
          this._cache.setState(index, 'idle');
          // Re-queue with delay
          setTimeout(() => {
            if (!this._destroyed) {
              this._queue.push(task);
              this.flush();
            }
          }, delay);
        } else {
          this._cache.setState(index, 'failed');
        }
      }
    } finally {
      this._activeCount--;
      this._abortControllers.delete(index);
      if (!this._destroyed) {
        this.flush();
      }
    }
  }

  /**
   * Fetch image and decode it asynchronously.
   * Uses img.decode() to avoid blocking the main thread during scroll.
   */
  private fetchAndDecode(
    index: number,
    signal: AbortSignal
  ): Promise<HTMLImageElement> {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      if (signal.aborted) {
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }

      const img = new Image();
      const url = this._framePath(index);

      const onAbort = () => {
        img.src = ''; // Cancel network request
        reject(new DOMException('Aborted', 'AbortError'));
      };

      signal.addEventListener('abort', onAbort, { once: true });

      img.onload = () => {
        signal.removeEventListener('abort', onAbort);

        if (signal.aborted) {
          reject(new DOMException('Aborted', 'AbortError'));
          return;
        }

        // Use async decode if available
        if (typeof img.decode === 'function') {
          img.decode().then(
            () => resolve(img),
            () => resolve(img) // Decode failure is non-fatal — image still usable
          );
        } else {
          resolve(img);
        }
      };

      img.onerror = () => {
        signal.removeEventListener('abort', onAbort);
        reject(new Error(`Failed to load frame ${index}: ${url}`));
      };

      img.src = url;
    });
  }
}
