import { ImageResponse } from "next/og";
import { fetchSharePreview } from "@/lib/share-preview";

export const runtime = "nodejs";
export const alt = "Product";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = {
  params: Promise<{ code: string; slug: string }>;
};

async function loadImageData(url: string) {
  const res = await fetch(url, { cache: "force-cache" });
  if (!res.ok) return null;
  const type = res.headers.get("content-type") || "image/jpeg";
  const buffer = Buffer.from(await res.arrayBuffer());
  return `data:${type};base64,${buffer.toString("base64")}`;
}

export default async function Image({ params }: Props) {
  const { code, slug } = await params;
  const preview = await fetchSharePreview(code, slug);
  const price =
    preview?.price && preview.price > 0
      ? `Rs. ${preview.price.toLocaleString("en-PK")}`
      : "";

  if (preview?.image) {
    const photo = await loadImageData(preview.image);
    if (photo) {
      return new ImageResponse(
        (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              background: "#FAF7F2",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo}
              alt=""
              style={{ width: "100%", height: 470, objectFit: "cover" }}
            />
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                padding: "24px 40px",
                gap: 8,
              }}
            >
              <div style={{ fontSize: 40, fontWeight: 700, color: "#3D2B1F", lineHeight: 1.2 }}>
                {preview.product_name || preview.title}
              </div>
              {price ? (
                <div style={{ fontSize: 34, fontWeight: 700, color: "#B8860B" }}>{price}</div>
              ) : null}
              <div style={{ fontSize: 22, color: "#6B5344", marginTop: 4 }}>Mocha Wear</div>
            </div>
          </div>
        ),
        { ...size },
      );
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#3D2B1F",
          color: "#FAF7F2",
          fontSize: 56,
          fontWeight: 700,
        }}
      >
        Mocha Wear
      </div>
    ),
    { ...size },
  );
}
