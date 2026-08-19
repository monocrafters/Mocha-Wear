export function collectionCode(item: { code?: string; slug?: string }) {
  return String(item.code || item.slug || "").trim();
}

export function collectionHref(item: { code?: string; slug?: string; link_url?: string }) {
  const code = collectionCode(item);
  return code ? `/collections/${code}` : "/collections";
}

export function collectionCardSrc(item: {
  cover_image?: string;
  cover_image_desktop?: string;
}) {
  return {
    mobile: item.cover_image || item.cover_image_desktop || "",
    desktop: item.cover_image_desktop || item.cover_image || "",
  };
}

export function collectionBannerSrc(item: {
  banner_image?: string;
  banner_image_desktop?: string;
  cover_image?: string;
  cover_image_desktop?: string;
}) {
  const mobile = item.banner_image || item.cover_image || item.banner_image_desktop || item.cover_image_desktop || "";
  const desktop =
    item.banner_image_desktop ||
    item.cover_image_desktop ||
    item.banner_image ||
    item.cover_image ||
    "";
  return { mobile, desktop };
}
