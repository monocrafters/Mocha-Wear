import Image from "next/image";
export function BrandLogo({ size = 48 }: { size?: number }) {
  return <Image src="/brand/mocha-wear-logo.png" alt="Mocha Wear" width={size} height={size} sizes={`${size}px`} style={{ width: size, height: size, objectFit: "contain", flexShrink: 0, borderRadius: 6 }} />;
}
