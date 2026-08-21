/* ─────────────────────────────────────────────
   Rivo Frame Streaming Engine — Performance Monitor
   Dev-only debug overlay for frame metrics.
   Enabled via ?debug=frames or NEXT_PUBLIC_FRAME_DEBUG=true.
───────────────────────────────────────────── */

import type { DebugInfo } from './types';

export class PerformanceMonitor {
  private _enabled = false;
  private _overlay: HTMLDivElement | null = null;
  private _fpsFrames: number[] = [];
  private _lastTime = 0;
  private _info: DebugInfo = {
    currentFrame: 0,
    loadedCount: 0,
    loadingCount: 0,
    cacheSize: 0,
    failedCount: 0,
    direction: 'idle',
    velocity: 'slow',
    fps: 0,
    memoryStatus: 'ok',
  };

  constructor() {
    if (typeof window === 'undefined') return;

    // Check if debug mode is enabled
    const params = new URLSearchParams(window.location.search);
    const envDebug = process.env.NEXT_PUBLIC_FRAME_DEBUG === 'true';
    this._enabled = params.has('debug') && params.get('debug') === 'frames' || envDebug;

    if (this._enabled) {
      this.createOverlay();
    }
  }

  get enabled(): boolean {
    return this._enabled;
  }

  /** Update debug info — call on each animation frame */
  update(info: Partial<DebugInfo>): void {
    if (!this._enabled) return;

    Object.assign(this._info, info);

    // Calculate FPS
    const now = performance.now();
    if (this._lastTime > 0) {
      const delta = now - this._lastTime;
      this._fpsFrames.push(1000 / delta);
      if (this._fpsFrames.length > 30) this._fpsFrames.shift();
      this._info.fps = Math.round(
        this._fpsFrames.reduce((a, b) => a + b, 0) / this._fpsFrames.length
      );
    }
    this._lastTime = now;

    this.render();
  }

  /** Destroy overlay */
  destroy(): void {
    if (this._overlay && this._overlay.parentNode) {
      this._overlay.parentNode.removeChild(this._overlay);
    }
    this._overlay = null;
    this._enabled = false;
  }

  /* ── Internal ── */

  private createOverlay(): void {
    const el = document.createElement('div');
    el.id = 'rivo-frame-debug';
    el.style.cssText = `
      position: fixed;
      top: 12px;
      left: 12px;
      z-index: 99999;
      padding: 12px 16px;
      background: rgba(0, 0, 0, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
      font-size: 11px;
      line-height: 1.7;
      color: rgba(255, 255, 255, 0.8);
      pointer-events: none;
      backdrop-filter: blur(8px);
      white-space: pre;
    `;
    document.body.appendChild(el);
    this._overlay = el;
  }

  private render(): void {
    if (!this._overlay) return;

    const { currentFrame, loadedCount, loadingCount, cacheSize, failedCount, direction, velocity, fps, memoryStatus } = this._info;

    const fpsColor =
      fps >= 55 ? '#4ade80' : fps >= 30 ? '#facc15' : '#f87171';
    const memColor =
      memoryStatus === 'ok'
        ? '#4ade80'
        : memoryStatus === 'warning'
          ? '#facc15'
          : '#f87171';

    this._overlay.innerHTML = `<span style="color:#a78bfa;font-weight:600">Rivo Frame Debug</span>
<span style="color:${fpsColor}">FPS: ${fps}</span>
Frame: ${currentFrame}
Loaded: ${loadedCount}
Loading: ${loadingCount}
Cache: ${cacheSize}
Failed: ${failedCount}
Direction: ${direction.toUpperCase()}
Velocity: ${velocity.toUpperCase()}
Memory: <span style="color:${memColor}">${memoryStatus.toUpperCase()}</span>`;
  }
}
