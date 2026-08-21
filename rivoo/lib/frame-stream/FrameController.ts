/* ─────────────────────────────────────────────
   Rivo Frame Streaming Engine — Frame Controller
   Central orchestrator: maps scroll progress to
   frame display and coordinates all subsystems.
───────────────────────────────────────────── */

import { FrameCache } from './FrameCache';
import { FrameLoader } from './FrameLoader';
import { FramePredictor } from './FramePredictor';
import { CanvasRenderer } from './CanvasRenderer';
import { MemoryManager } from './MemoryManager';
import { PerformanceMonitor } from './PerformanceMonitor';
import { FRAME_CONFIG, INITIAL_BATCH_SIZE } from './config';
import type { FramePathFn } from './types';

export interface FrameControllerOptions {
  canvas: HTMLCanvasElement;
  totalFrames?: number;
  framePath?: FramePathFn;
  onInitialLoadProgress?: (progress: number) => void;
  onReady?: () => void;
}

export class FrameController {
  private _cache: FrameCache;
  private _loader: FrameLoader;
  private _predictor: FramePredictor;
  private _renderer: CanvasRenderer;
  private _memoryManager: MemoryManager;
  private _monitor: PerformanceMonitor;

  private _totalFrames: number;
  private _framePath: FramePathFn;
  private _currentFrame = 0;
  private _ready = false;
  private _destroyed = false;
  private _onReady?: () => void;
  private _onInitialLoadProgress?: (progress: number) => void;

  /** Exposed for overlay components to read (same interface as original frameRef) */
  public currentFrameRef: { current: number } = { current: 0 };

  constructor(options: FrameControllerOptions) {
    this._totalFrames = options.totalFrames ?? FRAME_CONFIG.totalFrames;
    this._framePath = options.framePath ?? FRAME_CONFIG.framePath;
    this._onReady = options.onReady;
    this._onInitialLoadProgress = options.onInitialLoadProgress;

    // Initialize subsystems
    this._memoryManager = new MemoryManager();
    const cap = this._memoryManager.capability;

    this._cache = new FrameCache(cap.maxCacheSize);
    this._loader = new FrameLoader(this._cache, this._framePath, cap.maxConcurrent);
    this._predictor = new FramePredictor(this._totalFrames);
    this._renderer = new CanvasRenderer(options.canvas, cap.maxDPR);
    this._monitor = new PerformanceMonitor();

    // Start initial batch load
    this.loadInitialBatch();
  }

  /* ── Public API ── */

  /**
   * Set scroll progress (0–1). Called from GSAP ScrollTrigger.onUpdate.
   * This is the hot path — no React setState, no DOM allocation.
   */
  setProgress(progress: number): void {
    if (this._destroyed) return;

    const targetFrame = Math.min(
      Math.floor(progress * (this._totalFrames - 1)),
      this._totalFrames - 1
    );

    if (targetFrame === this._currentFrame) return;

    // Detect large jumps (e.g. 300 → 700) — cancel all in-flight loads
    // so we don't waste bandwidth loading the old neighborhood
    const frameDelta = Math.abs(targetFrame - this._currentFrame);
    const isJump = frameDelta > 50;
    if (isJump) {
      this._loader.cancelAll();
    }

    this._currentFrame = targetFrame;
    this.currentFrameRef.current = targetFrame;

    // Update predictor
    this._predictor.update(targetFrame);

    // Try to draw the requested frame
    const img = this._cache.get(targetFrame);
    if (img) {
      this._renderer.draw(targetFrame, img);
    } else {
      // Frame not cached — show nearest available frame
      const nearest = this._cache.getNearest(targetFrame);
      if (nearest >= 0) {
        const nearImg = this._cache.get(nearest);
        if (nearImg) {
          this._renderer.draw(nearest, nearImg);
        }
      }
    }

    // Schedule predictive loading
    if (this._ready) {
      this.schedulePreload();
    }

    // Update debug monitor
    if (this._monitor.enabled) {
      this._monitor.update({
        currentFrame: targetFrame,
        loadedCount: this._cache.loadedCount,
        loadingCount: this._cache.loadingCount,
        cacheSize: this._cache.loadedCount,
        failedCount: this._cache.failedCount,
        direction: this._predictor.direction,
        velocity: this._predictor.velocity,
        memoryStatus:
          this._cache.loadedCount > this._cache.maxSize * 0.9
            ? 'warning'
            : 'ok',
      });
    }
  }

  /** Handle window resize */
  handleResize(): void {
    this._renderer.updateDimensions();
    // Redraw current frame at new size
    const img = this._cache.get(this._currentFrame);
    this._renderer.redraw(img);
  }

  /** Clean up all resources */
  destroy(): void {
    this._destroyed = true;
    this._loader.destroy();
    this._cache.clear();
    this._renderer.reset();
    this._monitor.destroy();
    this._predictor.reset();
  }

  get ready(): boolean {
    return this._ready;
  }

  get currentFrame(): number {
    return this._currentFrame;
  }

  /* ── Internal ── */

  /**
   * Load the minimum initial batch of frames to make the animation interactive.
   * Much smaller than the old 150-frame gate — typically 20 frames.
   */
  private async loadInitialBatch(): Promise<void> {
    const batchSize = Math.min(INITIAL_BATCH_SIZE, this._totalFrames);
    let loaded = 0;

    // Generate initial frame indices (first N frames)
    const indices = Array.from({ length: batchSize }, (_, i) => i);

    // Load all initial frames concurrently via promises
    const promises = indices.map((index) =>
      this.loadSingleFrame(index).then((success) => {
        if (success) {
          loaded++;
          this._onInitialLoadProgress?.(
            Math.round((loaded / batchSize) * 100)
          );
        }
      })
    );

    await Promise.all(promises);

    if (this._destroyed) return;

    // Draw the first frame
    const firstImg = this._cache.get(0);
    if (firstImg) {
      this._renderer.draw(0, firstImg);
    }

    this._ready = true;
    this._onReady?.();

    // Start predictive loading from frame 0
    this.schedulePreload();
  }

  /** Load a single frame bypassing the queue (for initial batch) */
  private loadSingleFrame(index: number): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const state = this._cache.getState(index);
      if (state === 'loaded') {
        resolve(true);
        return;
      }

      this._cache.setState(index, 'loading');

      const img = new Image();
      img.src = this._framePath(index);

      img.onload = () => {
        if (typeof img.decode === 'function') {
          img.decode().then(
            () => {
              this._cache.set(index, img);
              resolve(true);
            },
            () => {
              // Decode failure non-fatal
              this._cache.set(index, img);
              resolve(true);
            }
          );
        } else {
          this._cache.set(index, img);
          resolve(true);
        }
      };

      img.onerror = () => {
        this._cache.setState(index, 'failed');
        resolve(false);
      };
    });
  }

  /** Schedule predictive frame loading based on current position and scroll state */
  private schedulePreload(): void {
    const priorityList = this._predictor.getPriorityList(this._currentFrame);
    this._loader.loadFrames(priorityList);

    // Evict distant frames to keep memory bounded
    const cap = this._memoryManager.capability;
    const keepRadius = Math.floor(cap.maxCacheSize * 0.7);
    this._cache.evictDistant(this._currentFrame, keepRadius);
  }
}
