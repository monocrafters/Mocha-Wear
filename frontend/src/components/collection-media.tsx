import { StoreImage } from "@/components/store-image";

export function CollectionMedia({
  mobile,
  desktop,
  alt = "",
  className = "",
  priority = false,
}: {
  mobile: string;
  desktop: string;
  alt?: string;
  className?: string;
  priority?: boolean;
}) {
  const phone = mobile || desktop;
  const wide = desktop || mobile;
  if (!phone) return null;

  const objectClass = className || "object-cover";

  return (
    <>
      <StoreImage
        src={phone}
        alt={alt}
        className={`lg:hidden ${objectClass}`}
        sizes="(max-width: 1024px) 100vw, 0px"
        cloudWidth={900}
        priority={priority}
      />
      <StoreImage
        src={wide}
        alt={alt}
        className={`hidden lg:block ${objectClass}`}
        sizes="(max-width: 1023px) 0px, 100vw"
        cloudWidth={1600}
        priority={priority}
      />
    </>
  );
}
