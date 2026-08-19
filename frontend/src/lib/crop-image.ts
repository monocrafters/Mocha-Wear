export type CropPixels = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load image for crop"));
    image.src = src;
  });
}

export async function getCroppedImage(
  imageSrc: string,
  pixelCrop: CropPixels,
  fileName = "hero-slide.jpg",
) {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not crop image");

  const aspect = pixelCrop.width / Math.max(pixelCrop.height, 1);
  const outputWidth = 1200;
  const outputHeight = Math.round(outputWidth / aspect);

  canvas.width = outputWidth;
  canvas.height = outputHeight;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (file) => {
        if (!file) {
          reject(new Error("Could not crop image"));
          return;
        }
        resolve(file);
      },
      "image/jpeg",
      0.92,
    );
  });

  return new File([blob], fileName, { type: "image/jpeg" });
}
