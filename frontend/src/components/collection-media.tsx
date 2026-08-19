export function CollectionMedia({
  mobile,
  desktop,
  alt = "",
  className = "",
}: {
  mobile: string;
  desktop: string;
  alt?: string;
  className?: string;
}) {
  const phone = mobile || desktop;
  const wide = desktop || mobile;
  if (!phone) return null;

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={phone} alt={alt} className={`lg:hidden ${className}`} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={wide} alt={alt} className={`hidden lg:block ${className}`} />
    </>
  );
}
