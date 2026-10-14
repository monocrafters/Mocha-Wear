"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCatalog } from "@/components/catalog-provider";
import { StoreImage } from "@/components/store-image";
import { collectionCardSrc, collectionHref } from "@/lib/collection";

export function CollectionHero() {
  const { collections, products, loading, error, revalidate } = useCatalog();
  const rail = useRef<HTMLDivElement>(null);
  const section = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const node = section.current;
    if (!node || loading) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setRevealed(true); observer.disconnect(); }
    }, { threshold: .15 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [loading]);
  const [edges, setEdges] = useState({ start: true, end: true });
  useEffect(() => {
    const node = rail.current;
    if (!node) return;
    const measure = () => setEdges({ start: node.scrollLeft < 2, end: node.scrollLeft + node.clientWidth >= node.scrollWidth - 2 });
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    measure();
    node.addEventListener("scroll", measure, { passive: true });
    return () => { observer.disconnect(); node.removeEventListener("scroll", measure); };
  }, [collections.length, loading]);
  function move(direction: number) {
    const node = rail.current;
    if (!node) return;
    node.scrollBy({ left: direction * node.clientWidth * .8, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }
  return (
    <section ref={section} className={`collection-hero${revealed ? " is-revealed" : ""}`} aria-labelledby="collection-hero-title">
      <div className="collection-hero-intro"><h2 id="collection-hero-title">Find your favourite collection</h2><Link href="/shop">Explore all pieces <span aria-hidden="true">↗</span></Link></div>
      <div className="collection-hero-carousel">
        <button className="collection-hero-prev" disabled={edges.start} onClick={() => move(-1)} aria-label="Previous collections"><ChevronLeft size={18} /></button>
        <div className="collection-hero-rail" ref={rail} aria-label="Shop by collection">
          {loading ? Array.from({ length: 5 }, (_, i) => <div className="collection-hero-skeleton" key={i} />) : collections.map(collection => {
            const src = collectionCardSrc(collection).mobile || products.find(p => p.collection_id === collection.id || p.collection_ids?.includes(collection.id))?.images?.[0]?.url;
            return <Link key={collection.id} href={collectionHref(collection)} className="collection-hero-item"><span className="collection-hero-photo">{src ? <StoreImage src={src} alt="" sizes="190px" cloudWidth={400} className="object-cover" /> : <span className="collection-hero-initial">{collection.name.slice(0,1)}</span>}</span><span>{collection.name}</span></Link>;
          })}
        </div>
        <button className="collection-hero-next" disabled={edges.end} onClick={() => move(1)} aria-label="Next collections"><ChevronRight size={18} /></button>
      </div>
      {!loading && !collections.length && <div className="collection-hero-empty">{error ? <button onClick={() => void revalidate()}>Reload collections</button> : <Link href="/shop">Explore all pieces →</Link>}</div>}
    </section>
  );
}
