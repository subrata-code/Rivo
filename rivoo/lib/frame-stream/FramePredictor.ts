/* ─────────────────────────────────────────────
   Rivo Frame Streaming Engine — Frame Predictor
   Scroll-aware predictive preload scheduling.
───────────────────────────────────────────── */

import type { ScrollDirection, ScrollVelocity } from './types';
import { PRELOAD_CONFIG, VELOCITY_THRESHOLDS } from './config';

export class FramePredictor {
  private _direction: ScrollDirection = 'idle';
  private _velocity: ScrollVelocity = 'slow';
  private _prevFrame = 0;
  private _totalFrames: number;
  private _history: number[] = [];

  constructor(totalFrames: number) {
    this._totalFrames = totalFrames;
  }

  get direction(): ScrollDirection {
    return this._direction;
  }

  get velocity(): ScrollVelocity {
    return this._velocity;
  }

  /**
   * Update the predictor with a new frame index.
   * Call this on every scroll tick.
   */
  update(currentFrame: number): void {
    const delta = currentFrame - this._prevFrame;

    // Direction
    if (delta > 0) {
      this._direction = 'down';
    } else if (delta < 0) {
      this._direction = 'up';
    }
    // If delta === 0, keep last direction

    // Velocity — use a short history for smoothing
    this._history.push(Math.abs(delta));
    if (this._history.length > 5) {
      this._history.shift();
    }
    const avgDelta =
      this._history.reduce((a, b) => a + b, 0) / this._history.length;

    if (avgDelta >= VELOCITY_THRESHOLDS.fast) {
      this._velocity = 'fast';
    } else if (avgDelta >= VELOCITY_THRESHOLDS.slow) {
      this._velocity = 'medium';
    } else {
      this._velocity = 'slow';
    }

    this._prevFrame = currentFrame;
  }

  /**
   * Generate a prioritized list of frame indices to preload.
   * Frames are ordered by loading priority (most important first).
   */
  getPriorityList(currentFrame: number): number[] {
    const result: number[] = [];
    let ahead: number;
    let behind: number;

    switch (this._velocity) {
      case 'fast':
        ahead = PRELOAD_CONFIG.fastAhead;
        behind = PRELOAD_CONFIG.fastBehind;
        break;
      case 'medium':
        ahead = PRELOAD_CONFIG.mediumAhead;
        behind = PRELOAD_CONFIG.mediumBehind;
        break;
      default:
        ahead = PRELOAD_CONFIG.slowAhead;
        behind = PRELOAD_CONFIG.slowBehind;
        break;
    }

    // Always include the current frame first
    result.push(currentFrame);

    if (this._direction === 'up') {
      // Scrolling up: prioritize frames before current
      for (let i = 1; i <= ahead; i++) {
        const idx = currentFrame - i;
        if (idx >= 0) result.push(idx);
      }
      // Then add some frames after
      for (let i = 1; i <= behind; i++) {
        const idx = currentFrame + i;
        if (idx < this._totalFrames) result.push(idx);
      }
    } else {
      // Scrolling down (default): prioritize frames after current
      for (let i = 1; i <= ahead; i++) {
        const idx = currentFrame + i;
        if (idx < this._totalFrames) result.push(idx);
      }
      // Then add some frames before
      for (let i = 1; i <= behind; i++) {
        const idx = currentFrame - i;
        if (idx >= 0) result.push(idx);
      }
    }

    return result;
  }

  /** Reset predictor state */
  reset(): void {
    this._direction = 'idle';
    this._velocity = 'slow';
    this._prevFrame = 0;
    this._history = [];
  }
}
