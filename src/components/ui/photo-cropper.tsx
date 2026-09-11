"use client";

import { useEffect, useRef, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { createPortal } from "react-dom";

/**
 * Square crop step between choosing a file and uploading it.
 *
 * The canvas is the crop: it is exactly the size the avatar is stored at, and
 * dragging or zooming redraws it, so what the learner lines up in the circle is
 * the file that gets sent — no second transform between preview and upload.
 */
const SIDE = 256;
const MAX_ZOOM = 4;
/** Display size of the crop square: the stored square stays 256px either way. */
const PREVIEW = "clamp(11rem, min(68vw, 38vh), 16rem)";

export function PhotoCropper({
  file,
  onCancel,
  onConfirm,
  busy = false,
}: {
  file: File;
  onCancel: () => void;
  /** Receives the cropped square as a JPEG data URL. */
  onConfirm: (dataUrl: string) => void;
  /** True while the upload the confirm started is still in flight. */
  busy?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const bitmap = useRef<ImageBitmap | null>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  /** Portals wait for the client: the body is not there during the render. */
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // The scale at which the shorter side just fills the square: zoom multiplies
  // it, so zoom 1 is always a full frame rather than a fixed pixel size.
  const coverScale = bitmap.current
    ? SIDE / Math.min(bitmap.current.width, bitmap.current.height)
    : 1;

  useEffect(() => {
    let active = true;

    createImageBitmap(file)
      .then((loaded) => {
        if (!active) {
          loaded.close();
          return;
        }
        bitmap.current = loaded;
        setZoom(1);
        setOffset({ x: 0, y: 0 });
        setReady(true);
      })
      .catch(() => active && setError("Could not read that image file."));

    return () => {
      active = false;
      bitmap.current?.close();
      bitmap.current = null;
    };
  }, [file]);

  /** Keeps the picture covering the square, whatever the drag asked for. */
  function clamp(next: { x: number; y: number }, atZoom: number) {
    const image = bitmap.current;
    if (!image) return { x: 0, y: 0 };

    const width = image.width * coverScale * atZoom;
    const height = image.height * coverScale * atZoom;
    const limitX = Math.max(0, (width - SIDE) / 2);
    const limitY = Math.max(0, (height - SIDE) / 2);

    return {
      x: Math.min(limitX, Math.max(-limitX, next.x)),
      y: Math.min(limitY, Math.max(-limitY, next.y)),
    };
  }

  // Redraw on every change: the canvas is small, and a frame that always
  // matches the state is worth more here than a render loop.
  useEffect(() => {
    const node = canvas.current;
    const image = bitmap.current;
    if (!node || !image || !ready) return;

    const context = node.getContext("2d");
    if (!context) return;

    const width = image.width * coverScale * zoom;
    const height = image.height * coverScale * zoom;

    context.clearRect(0, 0, SIDE, SIDE);
    context.drawImage(
      image,
      (SIDE - width) / 2 + offset.x,
      (SIDE - height) / 2 + offset.y,
      width,
      height,
    );
  }, [zoom, offset, ready, coverScale]);

  /**
   * Canvas pixels per screen pixel. The square is drawn at the size the avatar
   * is stored at but displayed at whatever the viewport allows, so a drag has
   * to be converted before it moves the picture.
   */
  function pixelRatio(node: HTMLCanvasElement) {
    const width = node.getBoundingClientRect().width;
    return width ? SIDE / width : 1;
  }

  function onPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const ratio = pixelRatio(event.currentTarget);
    drag.current = {
      x: event.clientX * ratio - offset.x,
      y: event.clientY * ratio - offset.y,
    };
  }

  function onPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const from = drag.current;
    if (!from) return;

    const ratio = pixelRatio(event.currentTarget);
    setOffset(
      clamp(
        {
          x: event.clientX * ratio - from.x,
          y: event.clientY * ratio - from.y,
        },
        zoom,
      ),
    );
  }

  function endDrag() {
    drag.current = null;
  }

  function changeZoom(next: number) {
    const value = Math.min(MAX_ZOOM, Math.max(1, next));
    setZoom(value);
    setOffset((current) => clamp(current, value));
  }

  if (!mounted) return null;

  // Straight onto the body: the nav bar this is opened from carries a
  // backdrop-blur, which makes it the containing block for anything fixed
  // inside it — the dialog would hang off the header instead of the viewport
  // and lose its top edge on a short screen.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Crop your photo"
      className="fixed inset-0 z-[60] overflow-y-auto overscroll-contain bg-[#0B2340]/50 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      {/* The grid centres the card while letting it scroll rather than clip
          when the viewport is shorter than the crop square plus its chrome. */}
      <div className="flex min-h-full items-center justify-center">
        <div className="rv-pop-in w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-[clamp(0.875rem,3.5vw,1.25rem)] text-center shadow-xl">
          <h2 className="text-lg font-extrabold">Crop your photo</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Drag to move, zoom to fill the circle.
          </p>

          {error ? (
            <p className="mt-4 text-sm font-semibold text-destructive">
              {error}
            </p>
          ) : (
            <>
              {/* The mask is drawn over the canvas rather than into it: the
                stored square keeps its corners, and only the preview is a
                circle, so the avatar reads the same wherever it is shown. */}
              <div
                className="relative mx-auto mt-4 overflow-hidden rounded-xl bg-muted"
                style={{ width: PREVIEW, height: PREVIEW }}
              >
                <canvas
                  ref={canvas}
                  width={SIDE}
                  height={SIDE}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  onWheel={(event) =>
                    changeZoom(zoom + (event.deltaY < 0 ? 0.15 : -0.15))
                  }
                  className="size-full cursor-grab touch-none active:cursor-grabbing"
                />
                {/* Everything outside the circle is dimmed: the mask cuts the
                  circle out of the shade rather than painting over it. */}
                <div className="pointer-events-none absolute inset-0 bg-[#0B2340]/45 [mask-image:radial-gradient(circle_at_center,transparent_calc(50%_-_1px),black_50%)] [-webkit-mask-image:radial-gradient(circle_at_center,transparent_calc(50%_-_1px),black_50%)]" />
                <div className="pointer-events-none absolute inset-2 rounded-full border-2 border-white/80" />
              </div>

              <label className="mt-4 flex items-center gap-3 text-xs font-semibold text-muted-foreground">
                Zoom
                <input
                  type="range"
                  min={1}
                  max={MAX_ZOOM}
                  step={0.01}
                  value={zoom}
                  onChange={(event) => changeZoom(Number(event.target.value))}
                  className="h-1 w-full cursor-pointer appearance-none rounded-full bg-muted accent-[#0B2340]"
                />
              </label>
            </>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="rounded-lg border border-border px-4 py-2 text-sm font-bold transition hover:border-[#C9A227] disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || !ready || Boolean(error)}
              onClick={() => {
                const node = canvas.current;
                if (node) onConfirm(node.toDataURL("image/jpeg", 0.85));
              }}
              aria-busy={busy}
              className="flex items-center gap-2 rounded-lg bg-[#FFD400] px-4 py-2 text-sm font-bold text-[#0B2340] transition hover:bg-[#E8C200] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy && <Spinner />}
              {busy ? "Saving…" : "Confirm"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
