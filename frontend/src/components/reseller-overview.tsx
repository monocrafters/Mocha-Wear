"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  Banknote,
  Check,
  Copy,
  Link2,
  MousePointerClick,
  Package,
  PackageCheck,
  Settings,
  ShoppingBag,
  Sparkles,
  Tag,
} from "lucide-react";
import { API_URL, apiFetch } from "@/lib/api";
import { formatPkr } from "@/lib/money";
import { hasResellerPrice, isLiveProduct, type ResellerProduct } from "@/lib/reseller-products";
import {
  fetchResellerNotifications,
  notificationTime,
  type ResellerNotification,
} from "@/lib/reseller-notifications";
import { ResellerPrProgress } from "@/components/reseller-pr-progress";
import { ResellerShell } from "@/components/reseller-shell";
import { resellerErrorMessage, useResellerLocale } from "@/components/reseller-locale-provider";

type ResellerOrder = {
  id: string;
  created_at?: string;
  status: string;
  total: number;
  commission_total: number;
  customer_name?: string;
};

type Transaction = {
  id: string;
  type: string;
  amount: number;
  order_id?: string;
  created_at?: string;
};

type DashboardData = {
  name: string;
  code: string;
  pending: number;
  cleared: number;
  minPayout: number;
  clicks: number;
  linkPath: string;
  liveProducts: number;
  pendingProducts: number;
  unseenPendingProducts: number;
  ordersCount: number;
  recentOrders: ResellerOrder[];
  recentTransactions: Transaction[];
  recentNotifications: ResellerNotification[];
  openWithdrawal: boolean;
  payoutReady: boolean;
};

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PK", { day: "numeric", month: "short" });
}

function shortOrderId(id: string) {
  const raw = String(id || "").trim();
  if (raw.length <= 10) return raw;
  return raw.slice(-8).toUpperCase();
}

function orderStatusTone(status: string) {
  if (status === "delivered") return "bg-emerald-50 text-emerald-800";
  if (status === "cancelled") return "bg-red-50 text-red-700";
  if (status === "shipped") return "bg-blue-50 text-blue-700";
  return "bg-amber-50 text-amber-800";
}

function txTone(type: string) {
  if (type === "credit" || type === "commission") return "text-emerald-700";
  if (type === "debit" || type === "payout") return "text-red-700";
  return "text-slate-700";
}

function txLabel(tx: Transaction) {
  if (tx.type === "credit" && tx.order_id) return `Order #${shortOrderId(tx.order_id)}`;
  if (tx.type === "payout") return "Withdrawal";
  return tx.type;
}

const QUICK_ACTIONS = [
  { href: "/reseller/products", labelKey: "nav.productsPending", icon: Package, badgeKey: "pendingProducts" as const },
  { href: "/reseller/products/live", labelKey: "nav.productsActive", icon: PackageCheck },
  { href: "/reseller/link", labelKey: "nav.link", icon: Link2 },
  { href: "/reseller/orders", labelKey: "nav.orders", icon: ShoppingBag },
  { href: "/reseller/earnings", labelKey: "nav.earnings", icon: Banknote },
  { href: "/reseller/withdraw", labelKey: "nav.withdraw", icon: ArrowDownToLine },
] as const;

function Panel({
  title,
  href,
  linkLabel,
  children,
  className = "",
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-slate-200/80 bg-white ${className}`}>
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5 lg:px-4 lg:py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{title}</p>
        {href && linkLabel ? (
          <Link href={href} className="text-[11px] font-medium text-emerald-700 hover:text-emerald-800">
            {linkLabel}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="space-y-2.5 lg:hidden">
        <div className="h-[168px] animate-pulse rounded-2xl bg-slate-200/80" />
        <div className="grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-white" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-[68px] animate-pulse rounded-xl bg-white" />
          ))}
        </div>
        <div className="h-28 animate-pulse rounded-2xl bg-white" />
      </div>
      <div className="hidden space-y-4 lg:block">
        <div className="h-36 animate-pulse rounded-2xl bg-slate-200/80" />
        <div className="grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-7 h-72 animate-pulse rounded-2xl bg-white" />
          <div className="col-span-5 space-y-4">
            <div className="h-24 animate-pulse rounded-2xl bg-white" />
            <div className="h-40 animate-pulse rounded-2xl bg-white" />
            <div className="h-40 animate-pulse rounded-2xl bg-white" />
          </div>
        </div>
      </div>
    </>
  );
}

export function ResellerOverview() {
  const { t } = useResellerLocale();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    Promise.all([
      apiFetch(`${API_URL}/api/reseller/me`, { credentials: "include" }),
      apiFetch(`${API_URL}/api/reseller/earnings`, { credentials: "include" }),
      apiFetch(`${API_URL}/api/reseller/link`, { credentials: "include" }),
      apiFetch(`${API_URL}/api/reseller/orders`, { credentials: "include" }),
      apiFetch(`${API_URL}/api/reseller/products`, { credentials: "include" }),
      apiFetch(`${API_URL}/api/reseller/payouts`, { credentials: "include" }),
      apiFetch(`${API_URL}/api/reseller/payout-method`, { credentials: "include" }),
      apiFetch(`${API_URL}/api/reseller/notifications`, { credentials: "include" }),
      apiFetch(`${API_URL}/api/reseller/badges`, { credentials: "include" }),
    ])
      .then(async ([meRes, earningsRes, linkRes, ordersRes, productsRes, payoutsRes, methodRes, notifRes, badgesRes]) => {
        const [meJson, earningsJson, linkJson, ordersJson, productsJson, payoutsJson, methodJson, notifJson, badgesJson] =
          await Promise.all([
            meRes.json(),
            earningsRes.json(),
            linkRes.json(),
            ordersRes.json(),
            productsRes.json(),
            payoutsRes.json(),
            methodRes.json(),
            notifRes.json(),
            badgesRes.json(),
          ]);

        if (!meRes.ok) throw new Error(meJson.message || "Could not load profile");
        if (!earningsRes.ok) throw new Error(earningsJson.message || "Could not load earnings");
        if (!linkRes.ok) throw new Error(linkJson.message || "Could not load link");
        if (!ordersRes.ok) throw new Error(ordersJson.message || "Could not load orders");
        if (!productsRes.ok) throw new Error(productsJson.message || "Could not load products");
        if (!payoutsRes.ok) throw new Error(payoutsJson.message || "Could not load payouts");
        if (!methodRes.ok) throw new Error(methodJson.message || "Could not load payout method");
        if (!notifRes.ok) throw new Error(notifJson.message || "Could not load notifications");
        if (!badgesRes.ok) throw new Error(badgesJson.message || "Could not load badges");

        const products = (productsJson.items || []) as ResellerProduct[];
        const orders = (ordersJson.items || []) as ResellerOrder[];
        const payouts = payoutsJson.items || [];
        const transactions = (earningsJson.transactions || []) as Transaction[];
        const notifications = (notifJson.items || []) as ResellerNotification[];

        const sortedOrders = [...orders].sort(
          (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
        );

        setData({
          name: meJson.reseller?.name || meJson.reseller?.username || "Reseller",
          code: String(meJson.reseller?.code || linkJson.code || "").trim(),
          pending: Number(earningsJson.wallet_pending ?? earningsJson.pending) || 0,
          cleared: Number(earningsJson.wallet_cleared ?? earningsJson.cleared) || 0,
          minPayout: Number(earningsJson.min_payout) || 2000,
          clicks: Number(linkJson.clicks ?? earningsJson.clicks) || 0,
          linkPath: String(linkJson.path || ""),
          liveProducts: products.filter(isLiveProduct).length,
          pendingProducts: products.filter((item) => !hasResellerPrice(item)).length,
          unseenPendingProducts: Number(badgesJson.pending_products) || 0,
          ordersCount: orders.length,
          recentOrders: sortedOrders.slice(0, 5),
          recentTransactions: transactions.slice(0, 5),
          recentNotifications: notifications.filter((item) => !item.read).slice(0, 3),
          openWithdrawal: payouts.some(
            (row: { status: string }) => row.status === "requested" || row.status === "processing",
          ),
          payoutReady: Boolean(methodJson.ready),
        });
      })
      .catch((err) => setError(resellerErrorMessage(err, "Could not load dashboard")))
      .finally(() => setLoading(false));
  }, []);

  const alerts = useMemo(() => {
    if (!data) return [];
    const items: { text: string; href: string }[] = [];
    if (data.unseenPendingProducts > 0) {
      items.push({
        text: t("overview.alertSetPrices", { count: String(data.unseenPendingProducts) }),
        href: "/reseller/products",
      });
    }
    if (!data.payoutReady) {
      items.push({ text: t("overview.alertPayoutMethod"), href: "/reseller/withdraw" });
    }
    if (data.openWithdrawal) {
      items.push({ text: t("overview.alertOpenWithdrawal"), href: "/reseller/withdraw" });
    }
    if (data.liveProducts === 0 && data.pendingProducts === 0) {
      items.push({ text: t("overview.alertNoProducts"), href: "/reseller/products" });
    }
    return items;
  }, [data, t]);

  function copyLink() {
    if (!data?.linkPath || !origin) return;
    navigator.clipboard.writeText(`${origin}${data.linkPath}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const canWithdraw = data ? data.cleared >= data.minPayout && !data.openWithdrawal : false;
  const linkUrl = data?.linkPath ? (origin ? `${origin}${data.linkPath}` : data.linkPath) : "";

  const stats = data
    ? [
        { label: t("overview.clicks"), value: String(data.clicks), icon: MousePointerClick },
        { label: t("overview.liveProducts"), value: String(data.liveProducts), icon: PackageCheck },
        { label: t("overview.orders"), value: String(data.ordersCount), icon: ShoppingBag },
        { label: t("overview.needPricing"), value: String(data.pendingProducts), icon: Tag },
      ]
    : [];

  function QuickActionGrid({ dense }: { dense?: boolean }) {
    if (!data) return null;
    return (
      <div className={`grid gap-2 ${dense ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-3"}`}>
        {QUICK_ACTIONS.map((item) => {
          const Icon = item.icon;
          const badge =
            "badgeKey" in item && item.badgeKey === "pendingProducts" ? data.unseenPendingProducts : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99] ${
                dense ? "flex-col px-2 py-2.5 text-center" : "px-3 py-3"
              }`}
            >
              <span
                className={`relative grid shrink-0 place-items-center rounded-lg bg-slate-900 text-white ${
                  dense ? "h-8 w-8" : "h-9 w-9"
                }`}
              >
                <Icon size={dense ? 14 : 16} />
                {badge > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white">
                    {badge > 9 ? "9+" : badge}
                  </span>
                ) : null}
              </span>
              <span className={`font-medium text-slate-800 ${dense ? "text-[10px] leading-tight" : "text-xs"}`}>
                {t(item.labelKey)}
              </span>
            </Link>
          );
        })}
      </div>
    );
  }

  function AlertsList() {
    if (!alerts.length) return null;
    return (
      <div className="space-y-2">
        {alerts.map((alert) => (
          <Link
            key={alert.text}
            href={alert.href}
            className="flex items-center justify-between gap-2 rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2.5 text-xs text-amber-950 transition hover:bg-amber-50"
          >
            <span className="leading-snug">{alert.text}</span>
            <ArrowRight size={14} className="shrink-0 opacity-60" />
          </Link>
        ))}
      </div>
    );
  }

  function ReferralLinkCard({ className = "" }: { className?: string }) {
    if (!data?.linkPath) return null;
    return (
      <Panel title={t("overview.yourReferralLink")} className={className}>
        <div className="flex items-center gap-2 p-3 lg:p-4">
          <code className="min-w-0 flex-1 truncate rounded-xl bg-slate-50 px-3 py-2.5 text-[11px] text-slate-700 lg:text-xs">
            {linkUrl}
          </code>
          <button
            type="button"
            onClick={copyLink}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
            aria-label={t("overview.copyLink")}
          >
            {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
          </button>
        </div>
      </Panel>
    );
  }

  function RecentOrdersCard({ limit = 3 }: { limit?: number }) {
    if (!data) return null;
    const rows = data.recentOrders.slice(0, limit);
    return (
      <Panel title={t("overview.recentOrders")} href="/reseller/orders" linkLabel={t("overview.viewAll")}>
        {rows.length ? (
          <div className="divide-y divide-slate-100">
            {rows.map((order) => (
              <Link
                key={order.id}
                href={`/reseller/orders/${encodeURIComponent(order.id)}`}
                className="flex items-center justify-between gap-3 px-3 py-2.5 transition hover:bg-slate-50 lg:px-4 lg:py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-slate-900 lg:text-sm">#{shortOrderId(order.id)}</p>
                  <p className="text-[10px] text-slate-500 lg:text-xs">{fmtDate(order.created_at)}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-semibold text-slate-900 lg:text-sm">{formatPkr(order.commission_total)}</p>
                  <span
                    className={`mt-0.5 inline-flex rounded px-1.5 py-px text-[9px] font-semibold uppercase ${orderStatusTone(order.status)}`}
                  >
                    {order.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="px-3 py-8 text-center text-xs text-slate-500 lg:px-4">{t("overview.noOrders")}</p>
        )}
      </Panel>
    );
  }

  function RecentEarningsCard({ limit = 3 }: { limit?: number }) {
    if (!data) return null;
    const rows = data.recentTransactions.slice(0, limit);
    return (
      <Panel title={t("overview.recentEarnings")} href="/reseller/earnings" linkLabel={t("overview.viewAll")}>
        {rows.length ? (
          <div className="divide-y divide-slate-100">
            {rows.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5 lg:px-4 lg:py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-slate-900 lg:text-sm">{txLabel(tx)}</p>
                  <p className="text-[10px] text-slate-500 lg:text-xs">{fmtDate(tx.created_at)}</p>
                </div>
                <p className={`shrink-0 text-xs font-semibold lg:text-sm ${txTone(tx.type)}`}>
                  {tx.type === "debit" || tx.type === "payout" ? "−" : "+"}
                  {formatPkr(Math.abs(tx.amount))}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-3 py-8 text-center text-xs text-slate-500 lg:px-4">{t("overview.noEarnings")}</p>
        )}
      </Panel>
    );
  }

  function RecentNotificationsCard() {
    if (!data) return null;
    const rows = data.recentNotifications;
    return (
      <Panel title={t("overview.recentNotifications")}>
        {rows.length ? (
          <div className="divide-y divide-slate-100">
            {rows.map((item) => (
              <Link
                key={item.id}
                href={item.href || "/reseller"}
                className="block px-3 py-2.5 transition hover:bg-slate-50 lg:px-4 lg:py-3"
              >
                <p className="text-xs font-medium text-slate-900 lg:text-sm">{item.title}</p>
                {item.message ? (
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-500">{item.message}</p>
                ) : null}
                <p className="mt-1 text-[10px] text-slate-400">{notificationTime(item.created_at)}</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="px-3 py-6 text-center text-xs text-slate-500 lg:px-4">{t("notifications.empty")}</p>
        )}
      </Panel>
    );
  }

  function BalanceHero({ layout }: { layout: "mobile" | "desktop" }) {
    if (!data) return null;
    const withdrawBtn = (
      <Link
        href="/reseller/withdraw"
        className={`inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition ${
          canWithdraw
            ? "bg-emerald-500 text-white hover:bg-emerald-600"
            : "bg-white/10 text-white/75"
        } ${
          layout === "mobile"
            ? "mt-3 w-full py-2.5 text-sm"
            : "px-5 py-2.5 text-sm"
        }`}
      >
        <ArrowDownToLine size={15} />
        {t("nav.withdraw")}
      </Link>
    );

    if (layout === "mobile") {
      return (
        <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-3.5 text-white shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-white/55">
                <Sparkles size={11} />
                {t("overview.kicker")}
              </p>
              <h2 className="mt-1 truncate text-base font-semibold">{data.name}</h2>
              {data.code ? <p className="text-[11px] text-white/50">/r/{data.code}</p> : null}
            </div>
            <Link
              href="/reseller/settings"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-white"
              aria-label={t("nav.settings")}
            >
              <Settings size={15} />
            </Link>
          </div>
          <div className="mt-3 rounded-xl bg-white/8 px-3 py-2.5 ring-1 ring-white/10">
            <p className="text-[9px] uppercase tracking-[0.14em] text-white/50">{t("overview.availableBalance")}</p>
            <p className="mt-0.5 text-[1.65rem] font-semibold leading-none tracking-tight">{formatPkr(data.cleared)}</p>
            <p className="mt-1.5 text-[10px] leading-relaxed text-white/45">
              {t("overview.pending")} {formatPkr(data.pending)} · {t("overview.minWithdraw")}{" "}
              {formatPkr(data.minPayout)}
            </p>
          </div>
          {withdrawBtn}
        </section>
      );
    }

    return (
      <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 p-5 text-white shadow-sm lg:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch lg:justify-between">
          <div className="min-w-0 lg:flex lg:flex-col lg:justify-center">
            <p className="flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-white/55">
              <Sparkles size={12} />
              {t("overview.kicker")}
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">{data.name}</h2>
            {data.code ? (
              <p className="mt-1 text-sm text-white/50">
                {t("overview.title")} · /r/{data.code}
              </p>
            ) : null}
          </div>
          <div className="rounded-2xl bg-white/8 px-5 py-4 ring-1 ring-white/10 lg:w-[min(100%,320px)] lg:shrink-0">
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">{t("overview.availableBalance")}</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">{formatPkr(data.cleared)}</p>
            <p className="mt-2 text-xs text-white/45">
              {t("overview.pending")} {formatPkr(data.pending)} · {t("overview.minWithdraw")}{" "}
              {formatPkr(data.minPayout)}
            </p>
            <Link
              href="/reseller/withdraw"
              className={`mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition ${
                canWithdraw
                  ? "bg-emerald-500 text-white hover:bg-emerald-600"
                  : "bg-white/10 text-white/75"
              }`}
            >
              <ArrowDownToLine size={15} />
              {t("nav.withdraw")}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <ResellerShell active="overview" kicker={t("overview.kicker")} title={t("overview.title")} compact wide>
      <div className="w-full">
        {error ? (
          <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        {loading || !data ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* Mobile layout */}
            <div className="space-y-2.5 lg:hidden">
              <BalanceHero layout="mobile" />

              <div className="grid grid-cols-2 gap-2">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl border border-slate-200/80 bg-white px-3 py-2.5"
                  >
                    <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">{stat.label}</p>
                    <p className="mt-0.5 text-lg font-semibold text-slate-900">{stat.value}</p>
                  </div>
                ))}
              </div>

              <ResellerPrProgress compact />

              <div>
                <p className="mb-2 px-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  {t("overview.quickActions")}
                </p>
                <QuickActionGrid dense />
              </div>

              <AlertsList />
              <ReferralLinkCard />
              <RecentOrdersCard limit={3} />
              <RecentEarningsCard limit={3} />
            </div>

            {/* Desktop layout — full width, no side gutters */}
            <div className="hidden space-y-4 lg:block">
              <BalanceHero layout="desktop" />

              <div className="grid grid-cols-4 gap-3">
                {stats.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={stat.label}
                      className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-4"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700">
                        <Icon size={18} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{stat.label}</p>
                        <p className="mt-0.5 text-xl font-semibold text-slate-900">{stat.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <ResellerPrProgress />

              <div className="grid grid-cols-12 items-start gap-4">
                <div className="col-span-7 space-y-4">
                  <Panel title={t("overview.quickActions")}>
                    <div className="p-4">
                      <QuickActionGrid />
                    </div>
                  </Panel>
                  <AlertsList />
                </div>

                <div className="col-span-5 space-y-4">
                  <RecentNotificationsCard />
                  <ReferralLinkCard />
                  <RecentOrdersCard limit={5} />
                  <RecentEarningsCard limit={5} />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </ResellerShell>
  );
}
