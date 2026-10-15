import { API_URL } from "@/lib/api";

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  if (process.env.NEXT_PUBLIC_LAN_PREVIEW !== "1") return new Response(null, { status: 404 });
  const { path } = await context.params;
  const endpoint = path.join("/");
  const allowed = ["products", "collections", "hero", "spotlight", "settings", "reviews", "help", "sales/active", "store-contact"];
  if (!allowed.includes(endpoint)) return new Response(null, { status: 404 });
  const headers = new Headers();
  const reseller = request.headers.get("X-Reseller-Code");
  if (reseller) headers.set("X-Reseller-Code", reseller);
  const upstream = await fetch(`${API_URL}/api/${endpoint}${new URL(request.url).search}`, { headers, cache: "no-store", signal: AbortSignal.timeout(15000) });
  return new Response(await upstream.text(), { status: upstream.status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
