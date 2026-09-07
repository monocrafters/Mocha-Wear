import { ResellerOrderDetail } from "@/components/reseller-order-detail";

export default async function ResellerOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ResellerOrderDetail orderId={id} />;
}
