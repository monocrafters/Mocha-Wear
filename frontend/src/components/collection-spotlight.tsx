"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useCatalog } from "./catalog-provider";
import { StoreImage } from "./store-image";
import { apiJson } from "@/lib/api-cache";
import { collectionHref } from "@/lib/collection";
import defaults from "@/lib/spotlight-defaults.json";

export type SpotlightConfig = typeof defaults;

function positionInCarousel(index: number, active: number, count: number) {
  let distance = (index - active + count) % count;
  if (distance > count / 2) distance -= count;
  return distance;
}

export function CollectionSpotlight() {
  const { collections, loading } = useCatalog();
  const [config, setConfig] = useState<SpotlightConfig>(defaults);
  const [selection, setSelection] = useState({ id: "", previousId: "", revision: 0 });
  const [paused, setPaused] = useState(false);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    let live = true;
    const apply = (data: { spotlight?: SpotlightConfig }) => {
      if (live && data.spotlight) setConfig(data.spotlight);
    };
    apiJson<{ spotlight: SpotlightConfig }>("/api/spotlight", {
      staleWhileRevalidate: true,
      onUpdate: apply,
    }).then(apply).catch(() => undefined);
    return () => { live = false; };
  }, []);

  const items = useMemo(() => config.items.filter(item =>
    item.enabled && collections.some(collection => collection.id === item.collection_id)
  ), [config.items, collections]);
  // A catalog refresh with the same IDs must not restart the five-second clock.
  const idsKey = JSON.stringify(items.map(item => item.id));
  const index = Math.max(0, items.findIndex(item => item.id === selection.id));
  const previousIndex = Math.max(0, items.findIndex(item => item.id === selection.previousId));
  const active = items[index];
  const interval = config.interval || 5000;
  const autoplay = config.enabled && config.autoplay && !paused && items.length > 1;

  useEffect(() => {
    if (!autoplay) return;
    const ids: string[] = JSON.parse(idsKey);
    let timer: ReturnType<typeof setInterval> | undefined;
    const schedule = () => {
      clearInterval(timer);
      if (document.hidden) return;
      timer = setInterval(() => {
        setSelection(current => {
          const currentIndex = Math.max(0, ids.indexOf(current.id));
          return { id: ids[(currentIndex + 1) % ids.length], previousId: ids[currentIndex], revision: current.revision + 1 };
        });
      }, interval);
    };
    schedule();
    document.addEventListener("visibilitychange", schedule);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [autoplay, idsKey, interval, cycle]);

  function choose(id: string) {
    setSelection(current => ({ id, previousId: active.id, revision: current.revision + 1 }));
    setCycle(value => value + 1);
  }

  if (!config.enabled) return null;
  if (!active) return loading ? <div className="spotlight-loading" aria-label="Loading collections" /> : null;
  const collection = collections.find(item => item.id === active.collection_id)!;

  return (
    <section className="collection-spotlight" aria-label="Collection spotlight" aria-roledescription="carousel">
      <div className="spotlight-atmosphere" aria-hidden="true">
        {items.map(item => {
          const source = item.background || item.image || collections.find(c => c.id === item.collection_id)?.cover_image;
          return <div key={item.id} className={`spotlight-scene${active.id === item.id ? " is-active" : ""}`}>
            {source && <StoreImage src={source} alt="" sizes="100vw" cloudWidth={1000} preserveCrop className="spotlight-scene-image" />}
          </div>;
        })}
      </div>

      <header className="spotlight-heading">
        <p>The Mocha collections</p>
        <h1>Find your kind of <em>everyday.</em></h1>
        <span>{active.description || "A little colour. A little character. Entirely you."}</span>
      </header>

      <div className="spotlight-orbit">
        {items.length > 1 && <button className="spotlight-arrow spotlight-arrow-prev" type="button" aria-label="Previous collection" onClick={() => choose(items[(index - 1 + items.length) % items.length].id)}><ChevronLeft size={19} /></button>}
        <div className="spotlight-rail" aria-label="Choose a collection">
          {items.map((item, itemIndex) => {
            const position = positionInCarousel(itemIndex, index, items.length);
            const previousPosition = positionInCarousel(itemIndex, previousIndex, items.length);
            // The outer card wraps behind the carousel instead of flying through its centre.
            const wrapping = Math.abs(position - previousPosition) > items.length / 2;
            const visible = Math.abs(position) <= 2;
            const image = item.image || collections.find(c => c.id === item.collection_id)?.cover_image || "";
            return <button
              key={item.id}
              type="button"
              className={`spotlight-choice${visible ? "" : " is-outside"}${wrapping ? " is-wrapping" : ""}`}
              style={{ "--position": position, "--distance": Math.abs(position), "--wrap-animation": selection.revision % 2 ? "spotlight-wrap-in" : "spotlight-wrap-in-alternate" } as CSSProperties}
              aria-label={`Show ${item.title} collection`}
              aria-pressed={active.id === item.id}
              tabIndex={visible ? 0 : -1}
              aria-hidden={!visible}
              onClick={() => choose(item.id)}
            >
              <span className="spotlight-circle">
                {image && <StoreImage src={image} alt="" sizes="80px" cloudWidth={100} className="spotlight-collection-surround" />}
                {image ? <StoreImage src={image} alt="" sizes="(min-width: 1600px) 320px, 290px" cloudWidth={700} preserveCrop priority={itemIndex === 0} className="spotlight-collection-image" /> : <span className="spotlight-initial">{item.title.slice(0, 1)}</span>}
              </span>
              <span className="spotlight-choice-label">{item.title}</span>
              <span className="spotlight-active-mark" aria-hidden="true" />
            </button>;
          })}
        </div>
        {items.length > 1 && <button className="spotlight-arrow spotlight-arrow-next" type="button" aria-label="Next collection" onClick={() => choose(items[(index + 1) % items.length].id)}><ChevronRight size={19} /></button>}
      </div>

      <div className="spotlight-copy" aria-live={paused ? "polite" : "off"}>
        <h2 className="sr-only">{active.title}</h2>
        <Link href={collectionHref(collection)}><span key={active.id}>Explore {active.title}</span><ArrowUpRight size={16} aria-hidden="true" /></Link>
      </div>
      <div className="spotlight-bottom">
        <Link href="/collections">View all collections <ArrowUpRight size={13} aria-hidden="true" /></Link>
        <div className="spotlight-pagination" aria-label="Collection navigation">
          {items.map((item, itemIndex) => <button key={item.id} type="button" aria-label={`Go to ${item.title}`} aria-current={itemIndex === index ? "true" : undefined} onClick={() => choose(item.id)}><span /></button>)}
        </div>
        <div className="spotlight-playback">
          <span>{String(index + 1).padStart(2, "0")} <i>/</i> {String(items.length).padStart(2, "0")}</span>
          {config.autoplay && items.length > 1 && <button type="button" aria-label={paused ? "Play collections" : "Pause collections"} onClick={() => setPaused(value => !value)}>{paused ? <Play size={13} /> : <Pause size={13} />}</button>}
        </div>
      </div>
    </section>
  );
}
