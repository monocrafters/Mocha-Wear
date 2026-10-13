"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Package,
  Truck,
  HeartHandshake,
} from "lucide-react";
import { useCatalog } from "@/components/catalog-provider";
import { useSiteSettings } from "@/components/site-settings";
import { StoreImage } from "@/components/store-image";
import { ProductCard } from "@/components/product-card";
import { collectionCardSrc, collectionHref } from "@/lib/collection";
import { productInCollection } from "@/lib/product";
import { copyrightLine, instagramHref } from "@/lib/settings";

export function EditionCollections() {
  const { collections, loading } = useCatalog();
  const settings = useSiteSettings();
  if (!loading && !collections.length) return null;
  return (
    <section id="collections" className="edition-section">
      <div className="edition-section-heading">
        <div>
          <p className="edition-eyebrow">{settings.collections_kicker}</p>
          <h2>{settings.collections_heading}</h2>
        </div>
        <Link className="edition-text-link" href="/collections">
          {settings.collections_all_label}
          <ArrowUpRight size={17} />
        </Link>
      </div>
      <div className="edition-collections">
        {loading
          ? [0, 1, 2, 3].map((i) => (
              <div key={i} className="edition-collection-skeleton" />
            ))
          : collections.slice(0, 4).map((collection) => (
              <Link
                key={collection.id}
                href={collectionHref(collection)}
                className="edition-collection"
              >
                <div className="edition-collection-photo">
                  <StoreImage
                    src={collectionCardSrc(collection).mobile}
                    alt={collection.name}
                    sizes="(max-width: 700px) 44vw, 23vw"
                    cloudWidth={700}
                    className="object-cover"
                  />
                  <span className="edition-collection-arrow">
                    <ArrowUpRight size={22} />
                  </span>
                </div>
                <div className="edition-collection-title">
                  <h3>{collection.name}</h3>
                  <span>
                    {collection.subtitle ||
                      (collection.is_on_sale
                        ? collection.sale_label
                        : "Explore the edit")}
                  </span>
                </div>
              </Link>
            ))}
      </div>
    </section>
  );
}

export function EditionProducts() {
  const { products, collections, loading, error, revalidate } = useCatalog();
  const settings = useSiteSettings();
  const [filter, setFilter] = useState("");
  const available = collections.filter((collection) =>
    products.some((product) => productInCollection(product, collection.id)),
  );
  const selectedCollection = available.find(
    (collection) => collection.id === filter,
  );
  const active = selectedCollection?.id || "";
  const selection = products
    .filter((product) => !active || productInCollection(product, active))
    .slice(0, 8);
  if (!loading && !products.length && !error) return null;
  return (
    <section id="shop" className="edition-products-section">
      <div className="edition-section">
        <div className="edition-section-heading">
          <div>
            <p className="edition-eyebrow">{settings.products_kicker}</p>
            <h2>{settings.products_heading}</h2>
          </div>
          <p className="edition-section-description">
            {settings.products_copy}
          </p>
        </div>
        <div className="edition-filters" aria-label="Filter featured products">
          <button aria-pressed={!active} onClick={() => setFilter("")}>
            The full edit
          </button>
          {available.map((collection) => (
            <button
              key={collection.id}
              aria-pressed={active === collection.id}
              onClick={() => setFilter(collection.id)}
            >
              {collection.name}
            </button>
          ))}
        </div>
        {error && !products.length ? (
          <div className="edition-empty">
            <p>We couldn’t load the collection.</p>
            <button
              className="edition-text-link"
              onClick={() => void revalidate()}
            >
              Try again <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <div className="edition-product-grid">
            {loading
              ? [0, 1, 2, 3].map((i) => (
                  <div key={i} className="edition-product-skeleton" />
                ))
              : selection.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    imageSizes="(max-width: 700px) 46vw, 23vw"
                  />
                ))}
          </div>
        )}
        <div className="edition-shop-all">
          <Link
            href={
              selectedCollection ? collectionHref(selectedCollection) : "/shop"
            }
            className="edition-button edition-button-outline"
          >
            Explore all pieces <ArrowUpRight size={18} />
          </Link>
          <span>{settings.delivery_line}</span>
        </div>
      </div>
    </section>
  );
}

export function EditionStory() {
  const settings = useSiteSettings();
  const { products } = useCatalog();
  const image =
    products.find((product) => product.images?.[1]?.url)?.images[1]?.url ||
    products[0]?.images?.[0]?.url;
  return (
    <section className="edition-story">
      <div className="edition-story-photo">
        {image ? (
          <StoreImage
            src={image}
            alt={`${settings.brand_name} fabric and silhouette`}
            sizes="(max-width: 700px) 100vw, 45vw"
            cloudWidth={900}
            className="object-cover"
          />
        ) : (
          <span className="edition-story-monogram">m.</span>
        )}
        <span className="edition-story-photo-label">
          The details make the difference.
        </span>
      </div>
      <div className="edition-story-copy">
        <p className="edition-eyebrow">The world of {settings.brand_name}</p>
        <h2>
          {settings.atelier_heading}
          <em>by {settings.brand_name}.</em>
        </h2>
        <p>{settings.tagline}</p>
        <Link href="/about" className="edition-text-link">
          Our story <ArrowUpRight size={18} />
        </Link>
      </div>
    </section>
  );
}

export function EditionServices() {
  const settings = useSiteSettings();
  const icons = [Truck, HeartHandshake, Package, Check];
  const notes = settings.notes.filter((note) => note.title || note.copy);
  if (!notes.length) return null;
  return (
    <section id="help" className="edition-section edition-services">
      <div className="edition-section-heading">
        <div>
          <p className="edition-eyebrow">{settings.notes_kicker}</p>
          <h2>{settings.notes_heading}</h2>
        </div>
        {settings.notes_cta ? (
          <Link className="edition-text-link" href="/help">
            {settings.notes_cta}
            <ArrowUpRight size={17} />
          </Link>
        ) : null}
      </div>
      <div className="edition-service-grid">
        {notes.map((note, i) => {
          const Icon = icons[i % icons.length];
          return (
            <article key={note.id}>
              <Icon size={24} strokeWidth={1.2} />
              <h3>{note.title}</h3>
              <p>{note.copy}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function EditionFooter() {
  const settings = useSiteSettings();
  const ig = instagramHref(settings);
  return (
    <footer className="edition-footer">
      <div className="edition-footer-top">
        <div>
          <p className="edition-eyebrow">
            {settings.brand_suffix || "The atelier"}
          </p>
          <Link href="/" className="edition-footer-brand">
            {settings.brand_name}
          </Link>
          <p>{settings.mobile_line}</p>
        </div>
        <div>
          <p className="edition-eyebrow">{settings.visit_heading}</p>
          <Link href="/shop">All pieces</Link>
          <Link href="/collections">Collections</Link>
          <Link href="/about">Our story</Link>
        </div>
        <div>
          <p className="edition-eyebrow">Here for you</p>
          <Link href="/orders">Track your order</Link>
          <Link href="/help">Care & support</Link>
          {settings.email ? (
            <a href={`mailto:${settings.email}`}>{settings.email}</a>
          ) : null}
          {ig ? (
            <a href={ig} target="_blank" rel="noreferrer">
              Instagram <ArrowUpRight size={12} />
            </a>
          ) : null}
        </div>
      </div>
      <div className="edition-footer-bottom">
        <span>{copyrightLine(settings)}</span>
        <a href="#top">Back to top ↑</a>
      </div>
    </footer>
  );
}
