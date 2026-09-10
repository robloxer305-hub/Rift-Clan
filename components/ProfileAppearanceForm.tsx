"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ChangeEvent,
  type MouseEvent,
  type WheelEvent,
} from "react";
import { updateProfileAppearance } from "@/app/actions/profile";

type Props = {
  profileBackground: string | null;
  profileBanner: string | null;
};

/* ─── Constants ─────────────────────────────────────────────────── */
const CROP_ASPECT_W = 16;
const CROP_ASPECT_H = 3;
const CANVAS_W = 800;
const CANVAS_H = Math.round((CANVAS_W / CROP_ASPECT_W) * CROP_ASPECT_H); // 150

/* ─── BannerCropper ─────────────────────────────────────────────── */
function BannerCropper({
  name,
  currentValue,
}: {
  name: string;
  currentValue: string | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);

  const [croppedDataUrl, setCroppedDataUrl] = useState<string | null>(null);
  const [imagePicked, setImagePicked] = useState(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scale = scaleRef.current;
    const srcW = CANVAS_W * scale;
    const srcH = CANVAS_H * scale;
    const clampedX = Math.max(0, Math.min(offsetRef.current.x, img.naturalWidth - srcW));
    const clampedY = Math.max(0, Math.min(offsetRef.current.y, img.naturalHeight - srcH));
    offsetRef.current = { x: clampedX, y: clampedY };

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.drawImage(img, clampedX, clampedY, srcW, srcH, 0, 0, CANVAS_W, CANVAS_H);

    // Rule-of-thirds guide lines
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo((CANVAS_W / 3) * i, 0);
      ctx.lineTo((CANVAS_W / 3) * i, CANVAS_H);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, (CANVAS_H / 3) * i);
      ctx.lineTo(CANVAS_W, (CANVAS_H / 3) * i);
      ctx.stroke();
    }
    ctx.restore();
  }, []);

  const commitCrop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return;
    setCroppedDataUrl(canvas.toDataURL("image/jpeg", 0.92));
  }, []);

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const src = ev.target?.result as string;
        const img = new Image();
        img.onload = () => {
          imgRef.current = img;
          const minScale = img.naturalWidth / CANVAS_W;
          scaleRef.current = minScale;
          offsetRef.current = {
            x: 0,
            y: Math.max(0, (img.naturalHeight - CANVAS_H * minScale) / 2),
          };
          setImagePicked(true);
          requestAnimationFrame(() => { draw(); commitCrop(); });
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
    },
    [draw, commitCrop]
  );

  useEffect(() => { if (imagePicked) draw(); }, [imagePicked, draw]);

  const handleMouseDown = useCallback((e: MouseEvent<HTMLCanvasElement>) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: offsetRef.current.x, oy: offsetRef.current.y };
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent<HTMLCanvasElement>) => {
    if (!dragRef.current || !imgRef.current) return;
    const scale = scaleRef.current;
    offsetRef.current = {
      x: dragRef.current.ox - (e.clientX - dragRef.current.startX) * scale,
      y: dragRef.current.oy - (e.clientY - dragRef.current.startY) * scale,
    };
    draw();
  }, [draw]);

  const handleMouseUp = useCallback(() => {
    if (!dragRef.current) return;
    dragRef.current = null;
    commitCrop();
  }, [commitCrop]);

  const handleWheel = useCallback((e: WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseCanvasX = ((e.clientX - rect.left) / rect.width) * CANVAS_W;
    const mouseCanvasY = ((e.clientY - rect.top) / rect.height) * CANVAS_H;
    const oldScale = scaleRef.current;
    const minScale = img.naturalWidth / CANVAS_W;
    const maxScale = Math.max(minScale, img.naturalWidth / 80);
    const newScale = Math.min(maxScale, Math.max(minScale, oldScale * (e.deltaY > 0 ? 1.08 : 0.93)));
    const mouseImgX = offsetRef.current.x + mouseCanvasX * oldScale;
    const mouseImgY = offsetRef.current.y + mouseCanvasY * oldScale;
    scaleRef.current = newScale;
    offsetRef.current = { x: mouseImgX - mouseCanvasX * newScale, y: mouseImgY - mouseCanvasY * newScale };
    draw();
    commitCrop();
  }, [draw, commitCrop]);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    const t = e.touches[0];
    if (!t) return;
    lastTouchRef.current = { x: t.clientX, y: t.clientY };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!lastTouchRef.current || !imgRef.current) return;
    const t = e.touches[0];
    if (!t) return;
    const scale = scaleRef.current;
    offsetRef.current = {
      x: offsetRef.current.x - (t.clientX - lastTouchRef.current.x) * scale,
      y: offsetRef.current.y - (t.clientY - lastTouchRef.current.y) * scale,
    };
    lastTouchRef.current = { x: t.clientX, y: t.clientY };
    draw();
  }, [draw]);

  const handleTouchEnd = useCallback(() => {
    lastTouchRef.current = null;
    commitCrop();
  }, [commitCrop]);

  const handleReset = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const minScale = img.naturalWidth / CANVAS_W;
    scaleRef.current = minScale;
    offsetRef.current = { x: 0, y: Math.max(0, (img.naturalHeight - CANVAS_H * minScale) / 2) };
    draw();
    commitCrop();
  }, [draw, commitCrop]);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-muted-foreground">Profile banner</span>

      <label
        className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-secondary/70 px-3 py-2 text-xs text-foreground transition-colors hover:border-rift-red"
        htmlFor="banner-file-input"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 0L8 8m4-4l4 4" />
        </svg>
        {imagePicked ? "Change image…" : "Choose image…"}
        <input
          id="banner-file-input"
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleFileChange}
        />
      </label>

      {imagePicked && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] text-muted-foreground">
            Drag to pan · Scroll to zoom · The visible area will be saved as your banner.
          </p>

          {/* 16:3 aspect-ratio wrapper */}
          <div
            className="relative w-full overflow-hidden rounded-lg border border-border shadow-inner"
            style={{ paddingBottom: `${(CROP_ASPECT_H / CROP_ASPECT_W) * 100}%` }}
          >
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              className="absolute inset-0 h-full w-full cursor-grab active:cursor-grabbing select-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              aria-label="Banner crop area — drag to pan, scroll to zoom"
            />
            {/* Corner brackets */}
            {(["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"] as const).map((pos) => (
              <span key={pos} className={`pointer-events-none absolute ${pos} m-1.5 h-3 w-3 rounded-sm border-2 border-white/60`} />
            ))}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground/70">Mouse wheel / pinch to zoom</span>
            <button type="button" className="text-[10px] text-rift-red hover:underline" onClick={handleReset}>
              Reset view
            </button>
          </div>
        </div>
      )}

      {currentValue && !imagePicked && (
        <span className="text-[10px] text-emerald-400">Current image saved</span>
      )}

      {/* Hidden input carries the cropped JPEG base64 */}
      <input type="hidden" name={name} value={croppedDataUrl ?? ""} />
    </div>
  );
}

/* ─── Plain image field (background) ───────────────────────────── */
function ImageField({ name, label, value }: { name: string; label: string; value: string | null }) {
  return (
    <label className="block text-xs font-medium text-muted-foreground">
      {label}
      <input
        name={name}
        type="file"
        accept="image/*"
        className="mt-2 w-full rounded-md border border-border bg-secondary/70 px-3 py-2 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-rift-red"
      />
      {value && <span className="mt-1 block text-[10px] text-emerald-400">Current image saved</span>}
    </label>
  );
}

/* ─── Main form ─────────────────────────────────────────────────── */
export default function ProfileAppearanceForm({
  profileBackground,
  profileBanner,
}: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-ghost text-xs">
        Customize profile
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
          role="presentation"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-appearance-title"
            className="glass-panel w-full max-w-lg rounded-xl p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="profile-appearance-title" className="font-display text-xl font-bold uppercase">
                  Customize profile
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Upload an image for your profile background or banner.
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost px-2 py-1" aria-label="Close customization dialog">
                Close
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setSaving(true);
                try {
                  await updateProfileAppearance(new FormData(e.currentTarget));
                  setOpen(false);
                } finally {
                  setSaving(false);
                }
              }}
              className="grid gap-4"
            >
              <ImageField name="profileBackground" label="Profile background" value={profileBackground} />
              <BannerCropper name="profileBanner" currentValue={profileBanner} />

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-ghost text-xs" disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs" disabled={saving}>
                  {saving ? "Saving…" : "Upload and save"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
