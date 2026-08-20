"use client";

import { useEffect, useState } from "react";
import { API_URL, apiFetch } from "@/lib/api";
import type { Collection } from "@/components/admin-collections";
import { collectionCardSrc, collectionHref } from "@/lib/collection";
import { CollectionMedia } from "@/components/collection-media";
import { useSiteSettings } from "@/components/site-settings";
import { CollectionListSkeleton, Skeleton } from "@/components/skeletons";

export function CollectionsList() {
  const [items, setItems] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const settings = useSiteSettings();

  useEffect(() => {
    apiFetch(`${API_URL}/api/collections`)
      .then((res) => res.json())
      .then((data) => setItems(data.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="flex min-h-0 flex-1 flex-col lg:mx-auto lg:max-w-[1440px] lg:w-full lg:px-8 lg:py-12">
      <div className="flex items-end justify-between px-4 py-3 lg:px-0 lg:pb-8">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.22em] text-sale uppercase">{settings.collections_kicker}</p>
          <h1 className="font-serif mt-0.5 text-[1.75rem] leading-none tracking-[-0.03em] text-mocha-deep lg:text-5xl">
            {settings.collections_heading}
          </h1>
        </div>
        <p className="text-[11px] tracking-[0.16em] text-mocha/45 uppercase">
          {loading ? <Skeleton className="inline-block h-3 w-16 align-middle" /> : `${items.length} collection${items.length === 1 ? "" : "s"}`}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(4.75rem+env(safe-area-inset-bottom))] lg:overflow-visible lg:px-0 lg:pb-0">
        {loading ? (
          <CollectionListSkeleton />
        ) : items.length ? (
          <div className="flex flex-col gap-3 lg:grid lg:grid-cols-12 lg:gap-5">
            {items.map((collection, index) => (
              <CollectionCard key={collection.id} collection={collection} index={index} />
            ))}
          </div>
        ) : (
          <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 py-10 text-center">
            <h2 className="font-serif text-3xl text-mocha-deep">No collections yet.</h2>
            <p className="mt-3 max-w-sm text-sm leading-6 text-mocha/55">
              New collections will appear here as soon as they drop.
            </p>
            <a
              href="/shop"
              className="mt-8 inline-block bg-mocha-deep px-5 py-3 text-[11px] font-semibold tracking-[0.18em] text-ivory uppercase"
            >
              Shop the sale
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

function cardFrame(index: number) {
  const slot = index % 5;
  if (slot === 0) return "lg:col-span-12";
  if (slot === 1) return "lg:col-span-7";
  if (slot === 2) return "lg:col-span-5";
  if (slot === 3) return "lg:col-span-4";
  return "lg:col-span-8";
}

function CollectionCard({ collection, index }: { collection: Collection; index: number }) {
  const href = collectionHref(collection);
  const kicker = collection.is_on_sale
    ? collection.sale_label || collection.subtitle || "On sale"
    : collection.subtitle;
  const featured = index % 5 === 0;
  const srcs = collectionCardSrc(collection);

  return (
    <a
      href={href}
      className={`group relative block aspect-[4/5] w-full overflow-hidden bg-mocha-deep lg:aspect-[21/9] ${cardFrame(index)}`}
    >
      {srcs.mobile || srcs.desktop ? (
        <CollectionMedia
          mobile={srcs.mobile}
          desktop={srcs.desktop}
          alt={collection.name}
          className="absolute inset-0 h-full w-full object-cover transition duration-[900ms] ease-out group-hover:scale-[1.03]"
        />
      ) : (
        <div className="absolute inset-0 bg-sand" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-mocha-deep/90 via-mocha-deep/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5 text-ivory lg:p-7">
        <div className="min-w-0">
          {kicker ? (
            <p className="text-[10px] tracking-[0.22em] text-gold uppercase">{kicker}</p>
          ) : null}
          <h2
            className={`font-serif mt-1.5 leading-none ${
              featured ? "text-[2.15rem] lg:text-6xl" : "text-[2rem] lg:text-4xl"
            }`}
          >
            {collection.name}
          </h2>
        </div>
        <span className="shrink-0 border border-ivory/35 px-3 py-2 text-[10px] font-semibold tracking-[0.16em] uppercase">
          Shop
        </span>
      </div>
    </a>
  );
}
