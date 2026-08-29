import { redirect } from "next/navigation";
import { ResellerProductDetail } from "@/components/reseller-product-detail";

export default async function ResellerProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (id === "active" || id === "live") {
    redirect("/reseller/products/live");
  }
  return <ResellerProductDetail productId={id} />;
}
