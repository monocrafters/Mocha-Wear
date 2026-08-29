import type { Metadata } from "next";
import { fetchSharePreview, shareOgImage, sharePageUrl, siteOrigin } from "@/lib/share-preview";
import { ReferralProductClient } from "./referral-product-client";

type PageProps = {
  params: Promise<{ code: string; slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code, slug } = await params;
  const origin = siteOrigin();
  const preview = await fetchSharePreview(code, slug);

  if (!preview) {
    return {
      metadataBase: new URL(origin),
      title: "Mocha Wear",
    };
  }

  const pageUrl = sharePageUrl(origin, code, slug);
  const image = shareOgImage(preview.image) || preview.image;

  return {
    metadataBase: new URL(origin),
    title: preview.title,
    description: preview.description,
    alternates: { canonical: pageUrl },
    openGraph: {
      title: preview.title,
      description: preview.description,
      url: pageUrl,
      type: "website",
      siteName: "Mocha Wear",
      locale: "en_PK",
      ...(image
        ? {
            images: [
              {
                url: image,
                secureUrl: image,
                width: 1200,
                height: 630,
                type: "image/jpeg",
                alt: preview.product_name || preview.title,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: preview.title,
      description: preview.description,
      ...(image ? { images: [image] } : {}),
    },
    other: image
      ? {
          "og:image:secure_url": image,
          "og:image:width": "1200",
          "og:image:height": "630",
          "og:image:type": "image/jpeg",
        }
      : undefined,
  };
}

export default async function ReferralProductPage({ params }: PageProps) {
  const { code, slug } = await params;
  const preview = await fetchSharePreview(code, slug);

  const jsonLd = preview?.image
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: preview.product_name || preview.title,
        description: preview.description,
        image: [preview.image],
        offers: preview.price
          ? {
              "@type": "Offer",
              price: preview.price,
              priceCurrency: "PKR",
              availability: "https://schema.org/InStock",
            }
          : undefined,
      }
    : null;

  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
      {preview?.image ? (
        <div className="sr-only" aria-hidden>
          {/* Helps some link preview crawlers discover the product image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview.image} alt={preview.product_name} width={1200} height={630} />
          <h1>{preview.title}</h1>
          <p>{preview.description}</p>
        </div>
      ) : null}
      <ReferralProductClient code={code} slug={slug} />
    </>
  );
}
