"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { getCroppedImage } from "@/lib/crop-image";
import { getFullHeroCropAspect, getHeroCropAspect } from "@/lib/hero-frame";

export function ImageCropperModal({
  src,
  aspect: fixedAspect,
  frame = "column",
  title = "Crop image",
  hint = "Drag and zoom until the frame is filled.",
  onCancel,
  onCropped,
}: {
  src: string;
  aspect?: number;
  frame?: "column" | "full";
  title?: string;
  hint?: string;
  onCancel: () => void;
  onCropped: (file: File, previewUrl: string) => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pixels, setPixels] = useState<Area | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [aspect, setAspect] = useState(
    fixedAspect ?? (frame === "full" ? getFullHeroCropAspect() : getHeroCropAspect()),
  );

  useEffect(() => {
    if (fixedAspect) {
      setAspect(fixedAspect);
      return;
    }
    function update() {
      setAspect(frame === "full" ? getFullHeroCropAspect() : getHeroCropAspect());
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [fixedAspect, frame]);

  const onCropComplete = useCallback((_area: Area, croppedPixels: Area) => {
    setPixels(croppedPixels);
  }, []);

  async function apply() {
    if (!pixels) return;
    setWorking(true);
    setError("");
    try {
      const file = await getCroppedImage(src, pixels);
      onCropped(file, URL.createObjectURL(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not crop image");
    } finally {
      setWorking(false);
    }
  }

  const wide = aspect > 1.15;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-3 sm:p-6">
      <div
        className={`flex w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ${
          wide ? "max-w-5xl" : "max-w-xl"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div>
            <p className="text-sm text-slate-500">{title}</p>
            <h3 className="text-lg font-semibold text-slate-900">Adjust the frame</h3>
          </div>
          <button type="button" onClick={onCancel} className="text-sm text-slate-500 hover:text-slate-900">
            Cancel
          </button>
        </div>

        <div className="flex justify-center bg-slate-950 px-3 py-3">
          <div
            className="relative w-full overflow-hidden"
            style={{
              aspectRatio: String(aspect),
              maxHeight: wide ? "min(52vh, 460px)" : "min(64vh, 560px)",
            }}
          >
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              minZoom={1}
              maxZoom={3}
              aspect={aspect}
              objectFit="contain"
              showGrid
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
        </div>

        <div className="space-y-4 px-5 py-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-600">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="mt-2 w-full accent-blue-600"
            />
          </label>
          <p className="text-xs text-slate-500">{hint}</p>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="button"
            onClick={apply}
            disabled={working || !pixels}
            className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {working ? "Cropping…" : "Apply crop"}
          </button>
        </div>
      </div>
    </div>
  );
}
