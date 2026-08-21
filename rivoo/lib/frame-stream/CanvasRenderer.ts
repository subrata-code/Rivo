/* ─────────────────────────────────────────────
   Rivo Frame Streaming Engine — Canvas Renderer
   DPR-aware canvas drawing with cover-fit logic.
───────────────────────────────────────────── */

export class CanvasRenderer {
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D | null = null;
  private _maxDPR: number;
  private _lastDrawnFrame = -1;
  /** Cached canvas internal dimensions — only recalculated on resize */
  private _internalWidth = 0;
  private _internalHeight = 0;
  private _cssWidth = 0;
  private _cssHeight = 0;

  constructor(canvas: HTMLCanvasElement, maxDPR: number) {
    this._canvas = canvas;
    this._maxDPR = maxDPR;
    this._ctx = canvas.getContext('2d', { alpha: false });
    this.updateDimensions();
  }

  /** Update internal canvas dimensions. Call on mount and window resize. */
  updateDimensions(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, this._maxDPR);
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;

    // Only update if dimensions actually changed
    if (this._cssWidth === vpW && this._cssHeight === vpH) return;

    this._cssWidth = vpW;
    this._cssHeight = vpH;
    this._internalWidth = Math.round(vpW * dpr);
    this._internalHeight = Math.round(vpH * dpr);

    this._canvas.width = this._internalWidth;
    this._canvas.height = this._internalHeight;

    if (this._ctx) {
      this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  /**
   * Draw a frame to the canvas with object-fit:cover behavior.
   * Returns true if the frame was actually drawn (index changed).
   */
  draw(frameIndex: number, image: HTMLImageElement): boolean {
    if (frameIndex === this._lastDrawnFrame) return false;

    const ctx = this._ctx;
    if (!ctx) return false;

    const vpW = this._cssWidth;
    const vpH = this._cssHeight;

    // Calculate cover-fit dimensions
    const imgAspect = image.width / image.height;
    const vpAspect = vpW / vpH;

    let drawW: number, drawH: number, drawX: number, drawY: number;

    if (imgAspect > vpAspect) {
      // Image is wider — fit height, crop sides
      drawH = vpH;
      drawW = vpH * imgAspect;
      drawX = (vpW - drawW) / 2;
      drawY = 0;
    } else {
      // Image is taller — fit width, crop top/bottom
      drawW = vpW;
      drawH = vpW / imgAspect;
      drawX = 0;
      drawY = (vpH - drawH) / 2;
    }

    ctx.clearRect(0, 0, vpW, vpH);
    ctx.drawImage(image, drawX, drawY, drawW, drawH);

    this._lastDrawnFrame = frameIndex;
    return true;
  }

  /** Force redraw of the last drawn frame (e.g. after resize) */
  redraw(image: HTMLImageElement | null): void {
    if (!image) return;
    const idx = this._lastDrawnFrame;
    this._lastDrawnFrame = -1; // Force draw
    this.draw(idx, image);
  }

  /** Reset state (on destroy) */
  reset(): void {
    this._lastDrawnFrame = -1;
    if (this._ctx) {
      this._ctx.clearRect(0, 0, this._cssWidth, this._cssHeight);
    }
  }

  get lastDrawnFrame(): number {
    return this._lastDrawnFrame;
  }

  set maxDPR(value: number) {
    if (value !== this._maxDPR) {
      this._maxDPR = value;
      // Force dimension recalculation
      this._cssWidth = 0;
      this._cssHeight = 0;
      this.updateDimensions();
    }
  }
}
