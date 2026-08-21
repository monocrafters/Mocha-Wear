import type { CSSProperties } from "react";
import { productGridClass } from "@/components/product-card";

type Tone = "store" | "admin";

export function Skeleton({
  className = "",
  tone = "store",
  delay = 0,
}: {
  className?: string;
  tone?: Tone;
  delay?: number;
}) {
  return (
    <div
      className={`skeleton ${tone === "admin" ? "skeleton-admin" : ""} ${className}`}
      style={delay ? ({ "--skeleton-delay": `${delay}ms` } as CSSProperties) : undefined}
    />
  );
}

export function ProductCardSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <article>
      <Skeleton className="aspect-[3/4]" delay={delay} />
      <Skeleton className="mt-3 h-5 w-2/3" delay={delay} />
      <Skeleton className="mt-2 h-3.5 w-1/3" delay={delay} />
    </article>
  );
}

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className={productGridClass} aria-hidden>
      {Array.from({ length: count }, (_, index) => (
        <ProductCardSkeleton key={index} delay={index * 90} />
      ))}
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <section
      className="grid h-[30svh] min-h-[210px] grid-cols-[minmax(0,6fr)_minmax(0,4fr)] bg-ivory lg:h-auto lg:min-h-[calc(100dvh-var(--header-h))]"
      aria-hidden
    >
      <Skeleton className="order-2 h-full min-h-0 lg:min-h-[calc(100dvh-var(--header-h))]" />
      <div className="flex flex-col justify-center gap-3 px-4 py-6 sm:px-8 lg:px-14">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-9 w-56 sm:h-12 sm:w-80" />
        <Skeleton className="h-3.5 w-full max-w-sm" />
        <Skeleton className="h-3.5 w-2/3 max-w-xs" />
        <Skeleton className="mt-2 h-10 w-32" />
      </div>
    </section>
  );
}

export function CollectionRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex w-full gap-3 overflow-hidden lg:mx-auto lg:grid lg:max-w-[1440px] lg:grid-cols-4 lg:gap-5 lg:px-8" aria-hidden>
      <div className="w-5 shrink-0 sm:w-8 lg:hidden" />
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className="aspect-[4/5] w-[min(72vw,280px)] shrink-0 sm:w-[260px] lg:w-full" delay={index * 90} />
      ))}
    </div>
  );
}

export function CollectionListSkeleton() {
  return (
    <div className="flex flex-col gap-3 lg:grid lg:grid-cols-12 lg:gap-5" aria-hidden>
      <Skeleton className="aspect-[4/5] lg:col-span-12 lg:aspect-[21/9]" />
      <Skeleton className="aspect-[4/5] lg:col-span-7 lg:aspect-[21/9]" delay={90} />
      <Skeleton className="aspect-[4/5] lg:col-span-5 lg:aspect-[21/9]" delay={180} />
    </div>
  );
}

export function CollectionPageSkeleton() {
  return (
    <section className="flex min-h-0 flex-1 flex-col" aria-hidden>
      <Skeleton className="aspect-[2/1] w-full lg:aspect-[3/1]" />
      <div className="px-4 pt-4 lg:mx-auto lg:w-full lg:max-w-[1440px] lg:px-8">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="mt-3 h-10 w-64" />
        <Skeleton className="mt-3 h-4 w-full max-w-xl" />
        <div className="mt-6">
          <ProductGridSkeleton />
        </div>
      </div>
    </section>
  );
}

export function ProductPageSkeleton() {
  return (
    <section
      className="mx-auto grid max-w-[1440px] gap-5 px-4 py-4 sm:px-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)] lg:gap-12 lg:py-10"
      aria-hidden
    >
      <Skeleton className="min-h-[280px] lg:min-h-[520px]" />
      <div className="px-1">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="mt-5 h-10 w-3/4" />
        <Skeleton className="mt-4 h-8 w-32" />
        <Skeleton className="mt-6 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-5/6" />
        <Skeleton className="mt-2 h-4 w-2/3" />
        <Skeleton className="mt-8 h-12 w-full" />
        <Skeleton className="mt-3 h-12 w-full" />
      </div>
    </section>
  );
}

export function ReviewRowSkeleton() {
  return (
    <div className="hide-scrollbar flex w-full gap-3 overflow-hidden" aria-hidden>
      <div className="w-5 shrink-0 sm:w-8" />
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="w-[min(78vw,320px)] shrink-0 bg-ivory px-5 py-6">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="mt-4 h-3.5 w-full" />
          <Skeleton className="mt-2 h-3.5 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function HelpSkeleton() {
  return (
    <section className="px-4 py-6 lg:mx-auto lg:max-w-[1440px] lg:w-full lg:px-8 lg:py-16" aria-hidden>
      <Skeleton className="h-3.5 w-20" />
      <Skeleton className="mt-2 h-8 w-40" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-14 w-full" delay={index * 70} />
        ))}
      </div>
    </section>
  );
}

export function OrderListSkeleton() {
  return (
    <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0" aria-hidden>
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="bg-white px-4 py-4">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="mt-3 h-6 w-40" />
          <Skeleton className="mt-3 h-3.5 w-2/3" />
          <Skeleton className="mt-4 h-10 w-full" />
        </div>
      ))}
    </div>
  );
}

export function NotificationListSkeleton() {
  return (
    <div className="space-y-3 lg:mx-auto lg:max-w-2xl" aria-hidden>
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index}>
          <Skeleton className="h-5 w-3/5" />
          <Skeleton className="mt-2 h-3.5 w-1/3" />
        </div>
      ))}
    </div>
  );
}

export function CheckoutSkeleton() {
  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 py-10 sm:px-8 sm:py-14" aria-hidden>
      <Skeleton className="h-3.5 w-32" />
      <Skeleton className="mt-4 h-10 w-48" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <div className="space-y-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-12 w-full" delay={index * 60} />
          ))}
        </div>
        <Skeleton className="h-56 w-full" />
      </div>
    </section>
  );
}

export function CartSkeleton() {
  return (
    <section className="flex min-h-0 flex-1 flex-col lg:mx-auto lg:max-w-[1440px] lg:w-full lg:px-8 lg:py-12" aria-hidden>
      <div className="px-4 py-3 lg:px-0">
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="mt-2 h-8 w-32" />
      </div>
      <div className="space-y-3 px-4 lg:px-0">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="flex gap-3">
            <Skeleton className="h-20 w-16 shrink-0" />
            <div className="flex-1">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="mt-2 h-3.5 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AdminProductGridSkeleton() {
  return (
    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6" aria-hidden>
      {Array.from({ length: 12 }, (_, index) => (
        <div key={index}>
          <Skeleton tone="admin" className="aspect-[3/4]" delay={index * 80} />
          <Skeleton tone="admin" className="mt-2 h-3.5 w-2/3" delay={index * 80} />
        </div>
      ))}
    </div>
  );
}

export function AdminListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="mt-8 space-y-4" aria-hidden>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex gap-3">
          <Skeleton tone="admin" className="h-16 w-14 shrink-0" />
          <div className="min-w-0 flex-1 py-1">
            <Skeleton tone="admin" className="h-4 w-1/3" />
            <Skeleton tone="admin" className="mt-2 h-3.5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminStatsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-hidden>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="px-1 py-2">
          <Skeleton tone="admin" className="h-3.5 w-20" />
          <Skeleton tone="admin" className="mt-2 h-7 w-14" />
        </div>
      ))}
    </div>
  );
}

export function AdminFormSkeleton() {
  return (
    <div className="mt-8 space-y-4" aria-hidden>
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index}>
          <Skeleton tone="admin" className="h-3.5 w-24" delay={index * 40} />
          <Skeleton tone="admin" className="mt-2 h-11 w-full" delay={index * 40} />
        </div>
      ))}
    </div>
  );
}
