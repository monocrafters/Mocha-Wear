"use client";

import Image from "next/image";
import { optimizeMediaUrl } from "@/lib/media";

type StoreImageProps = {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  fill?: boolean;
  width?: number;
  height?: number;
  /** Hint for Cloudinary transform before next/image fetch. */
  cloudWidth?: number;
  cloudHeight?: number;
};

export function StoreImage({
  src,
  alt,
  className = "",
  sizes = "100vw",
  priority = false,
  fill = true,
  width,
  height,
  cloudWidth,
  cloudHeight,
}: StoreImageProps) {
  const optimized = optimizeMediaUrl(src, {
    width: cloudWidth,
    height: cloudHeight,
    crop: cloudWidth || cloudHeight ? "fill" : undefined,
  });
  if (!optimized) return null;

  if (fill) {
    return (
      <Image
        src={optimized}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={className}
      />
    );
  }

  return (
    <Image
      src={optimized}
      alt={alt}
      width={width || cloudWidth || 800}
      height={height || cloudHeight || 1000}
      sizes={sizes}
      priority={priority}
      className={className}
    />
  );
}
