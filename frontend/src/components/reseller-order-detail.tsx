"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, MessageCircle } from "lucide-react";
import { API_URL, apiFetch } from "@/lib/api";
import { formatPkr } from "@/lib/money";
import { ui } from "@/lib/admin-ui";
import type { Order } from "@/lib/orders";
import { ResellerShell } from "@/components/reseller-shell";
import { resellerErrorMessage, useResellerLocale } from "@/components/reseller-locale-provider";

function statusTone(status: string) {
  if (status === "delivered") return "bg-emerald-50 text-emerald-800";
  if (status === "cancelled") return "bg-red-50 text-red-700";
  if (status === "shipped") return "bg-blue-50 text-blue-700";
  if (status === "packed") return "bg-violet-50 text-violet-800";
  return "bg-amber-50 text-amber-800";
}

function fmtDateTime(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function whatsappHref(phone?: string) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  const normalized = digits.startsWith("92") ? digits : `92${digits.replace(/^0/, "")}`;
  return `https://wa.me/${normalized}`;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  if (!value || value === "—") return null;
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <p className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="min-w-0 text-right text-sm text-slate-900">{value}</p>
    </div>
  );
}

export function ResellerOrderDetail({ orderId }: { orderId: string }) {
  const { t } = useResellerLocale();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch(`${API_URL}/api/reseller/orders/${encodeURIComponent(orderId)}`, { credentials: "include" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || t("orderDetail.notFound"));
        setOrder(data.item || null);
      })
      .catch((err) => setError(resellerErrorMessage(err, "Order not found")))
      .finally(() => setLoading(false));
  }, [orderId]);

  const customer = order?.customer;
  const address = [
    customer?.address,
    customer?.area,
    order?.city || customer?.city,
    customer?.landmark,
  ]
    .filter(Boolean)
    .join(", ");
  const waLink = whatsappHref(customer?.whatsapp || customer?.phone);
  const subtotal =
    order?.subtotal ??
    (order?.items || []).reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 1), 0);
  const total = order?.total ?? subtotal + (Number(order?.delivery) || 0);

  return (
    <ResellerShell active="orders" kicker={t("orders.kicker")} title={order?.id || t("orders.title")} compact>
      <div className="mx-auto w-full max-w-lg lg:max-w-2xl">
        <Link
          href="/reseller/orders"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft size={15} />
          {t("orderDetail.back")}
        </Link>

        {error ? <p className={`mb-3 ${ui.error}`}>{error}</p> : null}

        {loading ? (
          <div className="grid place-items-center py-16 text-sm text-slate-500">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : !order ? (
          <p className="py-8 text-center text-xs text-slate-500">{t("orderDetail.notFound")}</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-base font-semibold text-slate-900">{order.id}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {t("orderDetail.placed")} · {fmtDateTime(order.created_at)}
                </p>
              </div>
              <span
                className={`inline-flex shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusTone(order.status)}`}
              >
                {order.status}
              </span>
            </div>

            <section>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {t("orderDetail.delivery")}
              </p>
              <div className="divide-y divide-slate-200 rounded-lg bg-white px-3">
                <DetailRow label={t("orderDetail.customer")} value={customer?.name || "—"} />
                <DetailRow label={t("orderDetail.phone")} value={customer?.phone || "—"} />
                {customer?.whatsapp && customer.whatsapp !== customer.phone ? (
                  <DetailRow label={t("orderDetail.whatsapp")} value={customer.whatsapp} />
                ) : null}
                <DetailRow label={t("orderDetail.address")} value={address || "—"} />
              </div>
              {waLink ? (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#128C7E]"
                >
                  <MessageCircle size={14} />
                  {t("orderDetail.contactWhatsApp")}
                </a>
              ) : null}
            </section>

            <section>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {t("orderDetail.items")}
              </p>
              <div className="divide-y divide-slate-200 rounded-lg bg-white">
                {(order.items || []).map((item, index) => (
                  <div
                    key={`${order.id}-${item.product_id || item.slug || item.name}-${index}`}
                    className="flex gap-2.5 px-3 py-2.5"
                  >
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt="" className="h-14 w-11 shrink-0 rounded object-cover" />
                    ) : (
                      <div className="grid h-14 w-11 shrink-0 place-items-center rounded bg-slate-100 text-[9px] text-slate-400">
                        —
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{item.name}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {[item.size ? `Size ${item.size}` : "", item.spec, `Qty ${item.qty}`]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-slate-900">
                      {formatPkr((Number(item.price) || 0) * (Number(item.qty) || 1))}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {t("orderDetail.payment")}
              </p>
              <div className="divide-y divide-slate-200 rounded-lg bg-white px-3 text-sm">
                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-500">{t("orderDetail.subtotal")}</span>
                  <span className="font-medium text-slate-900">{formatPkr(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-500">{t("orderDetail.deliveryFee")}</span>
                  <span className="font-medium text-slate-900">
                    {order.delivery > 0 ? formatPkr(order.delivery) : "Free"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="font-semibold text-slate-900">{t("orderDetail.total")}</span>
                  <span className="font-semibold text-slate-900">{formatPkr(total)}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-emerald-700">{t("orderDetail.commission")}</span>
                  <span className="font-semibold text-emerald-700">
                    {formatPkr(order.commission_total || 0)}
                  </span>
                </div>
                <div className="py-2 text-[11px] text-slate-500">{order.payment}</div>
              </div>
            </section>

            {order.note ? (
              <section>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {t("orderDetail.note")}
                </p>
                <p className="rounded-lg bg-white px-3 py-2.5 text-sm text-slate-700">{order.note}</p>
              </section>
            ) : null}

            {order.status === "cancelled" ? (
              <section className="rounded-lg border border-red-100 bg-red-50 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-red-700">
                  {t("orderDetail.cancelled")}
                </p>
                {order.cancel_reason ? (
                  <p className="mt-1 text-sm text-red-800">
                    {t("orderDetail.cancelReason")}: {order.cancel_reason}
                    {order.cancel_detail ? ` — ${order.cancel_detail}` : ""}
                  </p>
                ) : null}
              </section>
            ) : null}
          </div>
        )}
      </div>
    </ResellerShell>
  );
}
