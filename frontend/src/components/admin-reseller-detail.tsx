"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { API_URL, apiFetch } from "@/lib/api";
import { formatPkr } from "@/lib/money";
import { payoutMethodLabel } from "@/lib/reseller-payout";
import { AdminFormSkeleton, AdminListSkeleton } from "@/components/skeletons";

type ResellerDetail = {
  id: string;
  name: string;
  username: string;
  email?: string;
  phone?: string;
  social_handle?: string;
  code: string;
  previous_codes?: string[];
  status: string;
  commission_min_percent?: number | null;
  commission_max_percent?: number | null;
  wallet_pending?: number;
  wallet_cleared?: number;
  payout_method?: string;
  payout_account_title?: string;
  payout_account_number?: string;
  payout_bank_name?: string;
  payout_iban?: string;
  custom_domain?: string;
  custom_domain_status?: string;
  created_at?: string;
  updated_at?: string;
};

type ResellerStats = {
  clicks: number;
  orders_total: number;
  orders_by_status: Record<string, number>;
  revenue_sold: number;
  commission_total: number;
  commission_delivered: number;
  wallet_pending: number;
  wallet_cleared: number;
  products_available: number;
  products_priced: number;
  products_live: number;
  products_pending: number;
  payouts_count: number;
  payouts_paid: number;
  payouts_open: number;
  link_requests_pending: number;
  payout_profile_ready: boolean;
};

type ResellerOrder = {
  id: string;
  created_at?: string;
  status: string;
  subtotal?: number;
  total?: number;
  commission_total?: number;
  customer?: { name?: string; phone?: string; city?: string };
  city?: string;
};

type ResellerPrice = {
  id: string;
  product_id: string;
  product_name: string;
  product_slug?: string;
  product_code?: string;
  custom_price: number;
  wholesale_price: number;
  retail_price: number;
  margin: number;
  is_active: boolean;
  cover?: string;
  updated_at?: string;
};

type ResellerPayout = {
  id: string;
  amount: number;
  status: string;
  method?: string;
  requested_at?: string;
  completed_at?: string;
  payment?: { method?: string; account_title?: string; account_number?: string };
};

type WalletTx = {
  id: string;
  type: string;
  status: string;
  amount: number;
  order_id?: string;
  note?: string;
  created_at?: string;
};

type LinkRequest = {
  id: string;
  requested_code?: string;
  current_code?: string;
  status: string;
  note?: string;
  admin_note?: string;
  created_at?: string;
  reviewed_at?: string;
};

type ClickRow = {
  path?: string;
  code?: string;
  at?: string;
};

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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

function statusTone(status: string) {
  if (
    status === "approved" ||
    status === "active" ||
    status === "delivered" ||
    status === "completed" ||
    status === "live" ||
    status === "cleared"
  ) {
    return "bg-emerald-50 text-emerald-800";
  }
  if (status === "suspended" || status === "cancelled" || status === "rejected" || status === "inactive") {
    return "bg-red-50 text-red-700";
  }
  if (status === "shipped" || status === "processing" || status === "packed") {
    return "bg-blue-50 text-blue-700";
  }
  return "bg-amber-50 text-amber-800";
}

function Badge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium capitalize ${statusTone(status)}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border border-slate-200 bg-white px-4 py-3">
      <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400 uppercase">{label}</p>
      <p className="mt-1.5 text-lg font-semibold text-slate-900">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p> : null}
    </div>
  );
}

function Section({
  title,
  count,
  children,
  action,
}: {
  title: string;
  count?: number;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <div className="flex items-center gap-3">
          {action}
          {typeof count === "number" ? (
            <p className="text-[11px] text-slate-500 uppercase">{count} total</p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function EmptyTable({ message }: { message: string }) {
  return (
    <div className="border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

export function AdminResellerDetail() {
  const params = useParams<{ id: string }>();
  const [item, setItem] = useState<ResellerDetail | null>(null);
  const [stats, setStats] = useState<ResellerStats | null>(null);
  const [orders, setOrders] = useState<ResellerOrder[]>([]);
  const [prices, setPrices] = useState<ResellerPrice[]>([]);
  const [payouts, setPayouts] = useState<ResellerPayout[]>([]);
  const [transactions, setTransactions] = useState<WalletTx[]>([]);
  const [linkRequests, setLinkRequests] = useState<LinkRequest[]>([]);
  const [clicks, setClicks] = useState<ClickRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!params.id) return;
    setLoading(true);
    setError("");
    apiFetch(`${API_URL}/api/admin/resellers/${encodeURIComponent(params.id)}`, {
      credentials: "include",
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Reseller not found");
        setItem(data.item || null);
        setStats(data.stats || null);
        setOrders(data.orders || []);
        setPrices(data.prices || []);
        setPayouts(data.payouts || []);
        setTransactions(data.transactions || []);
        setLinkRequests(data.link_requests || []);
        setClicks(data.clicks_recent || []);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Reseller not found");
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div>
        <AdminFormSkeleton />
        <AdminListSkeleton rows={4} />
      </div>
    );
  }

  if (!item || !stats) {
    return (
      <div className="mt-8">
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error || "Reseller not found"}</p>
        <Link href="/admin/resellers" className="mt-4 inline-block text-sm font-medium text-blue-600">
          Back to resellers
        </Link>
      </div>
    );
  }

  const byStatus = stats.orders_by_status || {};

  return (
    <div className="mt-8 space-y-8">
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="border border-slate-200 bg-white px-5 py-5 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-500 uppercase">Reseller</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">{item.name}</h2>
              <p className="mt-1 text-sm text-slate-500">
                @{item.username}
                {item.phone ? ` · ${item.phone}` : ""}
              </p>
            </div>
            <Badge status={item.status} />
          </div>

          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[10px] tracking-[0.14em] text-slate-400 uppercase">Referral code</dt>
              <dd className="mt-1 font-mono text-slate-900">/r/{item.code}</dd>
            </div>
            <div>
              <dt className="text-[10px] tracking-[0.14em] text-slate-400 uppercase">Markup range</dt>
              <dd className="mt-1 text-slate-900">
                {item.commission_min_percent ?? "—"}% / {item.commission_max_percent ?? "—"}%
              </dd>
            </div>
            <div>
              <dt className="text-[10px] tracking-[0.14em] text-slate-400 uppercase">Email</dt>
              <dd className="mt-1 text-slate-900">{item.email || "—"}</dd>
            </div>
            <div>
              <dt className="text-[10px] tracking-[0.14em] text-slate-400 uppercase">Social</dt>
              <dd className="mt-1 text-slate-900">{item.social_handle || "—"}</dd>
            </div>
            <div>
              <dt className="text-[10px] tracking-[0.14em] text-slate-400 uppercase">Joined</dt>
              <dd className="mt-1 text-slate-900">{fmtDate(item.created_at)}</dd>
            </div>
            <div>
              <dt className="text-[10px] tracking-[0.14em] text-slate-400 uppercase">Custom domain</dt>
              <dd className="mt-1 text-slate-900">
                {item.custom_domain
                  ? `${item.custom_domain} (${item.custom_domain_status || "none"})`
                  : "—"}
              </dd>
            </div>
            {item.previous_codes?.length ? (
              <div className="sm:col-span-2">
                <dt className="text-[10px] tracking-[0.14em] text-slate-400 uppercase">Previous codes</dt>
                <dd className="mt-1 font-mono text-slate-700">{item.previous_codes.join(", ")}</dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400 uppercase">Payout profile</p>
            {item.payout_method ? (
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-[10px] text-slate-400 uppercase">Method</dt>
                  <dd className="mt-0.5 text-slate-900">{payoutMethodLabel(item.payout_method)}</dd>
                </div>
                <div>
                  <dt className="text-[10px] text-slate-400 uppercase">Account title</dt>
                  <dd className="mt-0.5 text-slate-900">{item.payout_account_title || "—"}</dd>
                </div>
                <div>
                  <dt className="text-[10px] text-slate-400 uppercase">Account number</dt>
                  <dd className="mt-0.5 font-mono text-slate-900">{item.payout_account_number || "—"}</dd>
                </div>
                {item.payout_bank_name ? (
                  <div>
                    <dt className="text-[10px] text-slate-400 uppercase">Bank</dt>
                    <dd className="mt-0.5 text-slate-900">{item.payout_bank_name}</dd>
                  </div>
                ) : null}
                {item.payout_iban ? (
                  <div className="sm:col-span-2">
                    <dt className="text-[10px] text-slate-400 uppercase">IBAN</dt>
                    <dd className="mt-0.5 font-mono text-slate-900">{item.payout_iban}</dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <p className="mt-2 text-sm text-amber-700">Payout method not set yet</p>
            )}
          </div>
        </article>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <Stat label="Pending wallet" value={formatPkr(stats.wallet_pending)} hint="Awaiting delivery" />
          <Stat label="Cleared wallet" value={formatPkr(stats.wallet_cleared)} hint="Ready to withdraw" />
          <Stat label="Paid out" value={formatPkr(stats.payouts_paid)} hint={`${stats.payouts_count} requests`} />
          <Stat
            label="Profile ready"
            value={stats.payout_profile_ready ? "Yes" : "No"}
            hint={stats.payouts_open ? `${stats.payouts_open} open request` : "No open request"}
          />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Progress overview</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Clicks" value={String(stats.clicks)} />
          <Stat label="Orders" value={String(stats.orders_total)} />
          <Stat label="Sold (subtotal)" value={formatPkr(stats.revenue_sold)} />
          <Stat label="Commission" value={formatPkr(stats.commission_total)} hint={`Delivered ${formatPkr(stats.commission_delivered)}`} />
          <Stat label="Live products" value={`${stats.products_live}/${stats.products_available}`} hint={`${stats.products_pending} need price`} />
          <Stat label="Link requests" value={String(stats.link_requests_pending)} hint="Pending" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {(["processing", "packed", "shipped", "delivered", "cancelled"] as const).map((key) => (
            <Stat key={key} label={key} value={String(byStatus[key] || 0)} />
          ))}
        </div>
      </div>

      <Section title="Orders" count={orders.length}>
        {!orders.length ? (
          <EmptyTable message="No orders through this reseller yet." />
        ) : (
          <div className="overflow-x-auto border border-slate-200 bg-white">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-slate-200 text-[10px] text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Profit</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-900">{order.id}</td>
                    <td className="px-4 py-3">
                      <p className="text-slate-900">{order.customer?.name || "—"}</p>
                      <p className="text-[12px] text-slate-500">
                        {[order.customer?.phone, order.customer?.city || order.city].filter(Boolean).join(" · ")}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge status={order.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-900">{formatPkr(order.total || order.subtotal || 0)}</td>
                    <td className="px-4 py-3 font-medium text-emerald-700">{formatPkr(order.commission_total || 0)}</td>
                    <td className="px-4 py-3 text-slate-500">{fmtDateTime(order.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Product prices" count={prices.length}>
        {!prices.length ? (
          <EmptyTable message="No prices set yet." />
        ) : (
          <div className="overflow-x-auto border border-slate-200 bg-white">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-b border-slate-200 text-[10px] text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Wholesale</th>
                  <th className="px-4 py-3 font-medium">Retail</th>
                  <th className="px-4 py-3 font-medium">Reseller price</th>
                  <th className="px-4 py-3 font-medium">Margin</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {prices.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-8 shrink-0 overflow-hidden bg-slate-100">
                          {row.cover ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={row.cover} alt="" className="h-full w-full object-cover" />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">{row.product_name}</p>
                          <p className="text-[12px] text-slate-500">{row.product_code || row.product_slug || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{formatPkr(row.wholesale_price)}</td>
                    <td className="px-4 py-3 text-slate-700">{formatPkr(row.retail_price)}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{formatPkr(row.custom_price)}</td>
                    <td className="px-4 py-3 text-emerald-700">{formatPkr(row.margin)}</td>
                    <td className="px-4 py-3">
                      <Badge status={row.is_active && row.custom_price > 0 ? "live" : "inactive"} />
                    </td>
                    <td className="px-4 py-3 text-slate-500">{fmtDate(row.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Withdrawals" count={payouts.length}>
        {!payouts.length ? (
          <EmptyTable message="No withdrawal requests yet." />
        ) : (
          <div className="overflow-x-auto border border-slate-200 bg-white">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="border-b border-slate-200 text-[10px] text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Request</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Requested</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      <Link href={`/admin/payouts/${row.id}`} className="font-medium text-blue-600 hover:underline">
                        View
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{formatPkr(row.amount)}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {payoutMethodLabel(row.payment?.method || row.method)}
                      {row.payment?.account_number ? (
                        <span className="mt-0.5 block text-[12px] text-slate-500">{row.payment.account_number}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <Badge status={row.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-500">{fmtDateTime(row.requested_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Wallet transactions" count={transactions.length}>
        {!transactions.length ? (
          <EmptyTable message="No wallet activity yet." />
        ) : (
          <div className="overflow-x-auto border border-slate-200 bg-white">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="border-b border-slate-200 text-[10px] text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Ref</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 capitalize text-slate-900">{row.type}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{formatPkr(row.amount)}</td>
                    <td className="px-4 py-3">
                      <Badge status={row.status} />
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] text-slate-500">{row.order_id || row.note || "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{fmtDateTime(row.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="Link requests" count={linkRequests.length}>
          {!linkRequests.length ? (
            <EmptyTable message="No link change requests." />
          ) : (
            <div className="overflow-x-auto border border-slate-200 bg-white">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead className="border-b border-slate-200 text-[10px] text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium">Change</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {linkRequests.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-mono text-slate-900">
                          /r/{row.current_code || "—"} → /r/{row.requested_code || "—"}
                        </p>
                        {row.note ? <p className="mt-0.5 text-[12px] text-slate-500">{row.note}</p> : null}
                      </td>
                      <td className="px-4 py-3">
                        <Badge status={row.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-500">{fmtDate(row.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="Recent clicks" count={clicks.length}>
          {!clicks.length ? (
            <EmptyTable message="No tracked clicks yet." />
          ) : (
            <div className="overflow-x-auto border border-slate-200 bg-white">
              <table className="w-full min-w-[360px] text-left text-sm">
                <thead className="border-b border-slate-200 text-[10px] text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium">Path</th>
                    <th className="px-4 py-3 font-medium">Code</th>
                    <th className="px-4 py-3 font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {clicks.map((row, index) => (
                    <tr key={`${row.at}-${index}`} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3 font-mono text-[12px] text-slate-700">{row.path || "/"}</td>
                      <td className="px-4 py-3 font-mono text-slate-700">{row.code || item.code}</td>
                      <td className="px-4 py-3 text-slate-500">{fmtDateTime(row.at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
