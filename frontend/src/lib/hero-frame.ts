/** Homepage hero image column is 40% of the desktop layout. */
export const HERO_IMAGE_SHARE = 0.4;
export const HERO_HEADER_PX = 104;

/** Fallback close to 40% × remaining viewport on a typical laptop. */
export const HERO_CROP_ASPECT = 4 / 5;

/** Fallback for a full-bleed hero image. */
export const FULL_HERO_CROP_ASPECT = 16 / 9;

export function getHeroCropAspect() {
  if (typeof window === "undefined") return HERO_CROP_ASPECT;
  const height = Math.max(window.innerHeight - HERO_HEADER_PX, 1);
  return (window.innerWidth * HERO_IMAGE_SHARE) / height;
}

export function getFullHeroCropAspect() {
  if (typeof window === "undefined") return FULL_HERO_CROP_ASPECT;
  const height = Math.max(window.innerHeight - HERO_HEADER_PX, 1);
  return window.innerWidth / height;
}

export function getHeroOutputSize(aspect: number) {
  const outputWidth = 1200;
  return {
    outputWidth,
    outputHeight: Math.round(outputWidth / aspect),
  };
}
