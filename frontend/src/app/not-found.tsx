import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found — Mocha Wear",
};

export default function NotFound() {
  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-mocha-deep px-6 text-center text-ivory">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-sale" />
      <p className="text-[11px] font-semibold tracking-[0.35em] text-gold uppercase">Mocha Wear</p>
      <p className="font-serif mt-6 text-[clamp(6rem,18vw,11rem)] leading-none text-ivory/15">404</p>
      <h1 className="font-serif -mt-8 text-4xl tracking-[-0.03em] sm:text-5xl">
        This page walked off the rack.
      </h1>
      <p className="mt-4 max-w-md text-[15px] leading-7 text-ivory/70">
        The suit you’re looking for isn’t here — it may be on sale, moved, or never existed.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/"
          className="bg-sale px-8 py-3.5 text-[12px] font-semibold tracking-[0.2em] text-white uppercase transition-colors hover:bg-sale-deep"
        >
          Back to home
        </Link>
        <Link
          href="/shop"
          className="text-[12px] font-semibold tracking-[0.18em] text-ivory uppercase underline decoration-gold underline-offset-8"
        >
          Shop the sale
        </Link>
      </div>
    </main>
  );
}
