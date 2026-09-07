"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ArrowDownToLine,
  Banknote,
  LayoutDashboard,
  Link2,
  LogOut,
  Menu,
  Package,
  PackageCheck,
  Settings,
  ShoppingBag,
  X,
} from "lucide-react";
import { fetchResellerBadges, type ResellerBadges, RESELLER_BADGES_REFRESH } from "@/lib/reseller-notifications";
import { useResellerLocale } from "@/components/reseller-locale-provider";

const navItems = [
  { href: "/reseller", id: "overview", labelKey: "nav.overview", icon: LayoutDashboard, badgeKey: null },
  { href: "/reseller/products", id: "products", labelKey: "nav.productsPending", icon: Package, badgeKey: "pending_products" as const },
  { href: "/reseller/products/live", id: "products-active", labelKey: "nav.productsActive", icon: PackageCheck, badgeKey: null },
  { href: "/reseller/link", id: "link", labelKey: "nav.link", icon: Link2, badgeKey: null },
  { href: "/reseller/orders", id: "orders", labelKey: "nav.orders", icon: ShoppingBag, badgeKey: "unread_orders" as const },
  { href: "/reseller/earnings", id: "earnings", labelKey: "nav.earnings", icon: Banknote, badgeKey: null },
  { href: "/reseller/withdraw", id: "withdraw", labelKey: "nav.withdraw", icon: ArrowDownToLine, badgeKey: "withdraw_ready" as const },
  { href: "/reseller/settings", id: "settings", labelKey: "nav.settings", icon: Settings, badgeKey: null },
];

const emptyBadges: ResellerBadges = {
  pending_products: 0,
  unread_notifications: 0,
  unread_orders: 0,
  open_withdrawal: false,
  withdraw_ready: false,
};

function navBadgeCount(badges: ResellerBadges, key: (typeof navItems)[number]["badgeKey"]) {
  if (!key) return 0;
  if (key === "withdraw_ready") return badges.withdraw_ready ? 1 : 0;
  return Number(badges[key]) || 0;
}

export function ResellerMenuButton({ onClick }: { onClick: () => void }) {
  const { t } = useResellerLocale();
  return (
    <button
      type="button"
      className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-700 lg:hidden"
      onClick={onClick}
      aria-label={t("nav.openMenu")}
    >
      <Menu size={16} />
    </button>
  );
}

export function ResellerSidebar({
  name,
  active,
  onLogout,
  open,
  onClose,
}: {
  name: string;
  active: string;
  onLogout: () => void;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useResellerLocale();
  const pathname = usePathname();
  const [badges, setBadges] = useState<ResellerBadges>(emptyBadges);

  useEffect(() => {
    function load() {
      fetchResellerBadges()
        .then(setBadges)
        .catch(() => setBadges(emptyBadges));
    }
    load();
    window.addEventListener(RESELLER_BADGES_REFRESH, load);
    return () => window.removeEventListener(RESELLER_BADGES_REFRESH, load);
  }, []);

  function isItemActive(item: (typeof navItems)[number]) {
    if (item.href === "/reseller") return pathname === "/reseller";
    if (item.id === "products-active") {
      return pathname.startsWith("/reseller/products/live") || pathname.startsWith("/reseller/products/active");
    }
    if (item.id === "products") {
      if (pathname.startsWith("/reseller/products/live") || pathname.startsWith("/reseller/products/active")) {
        return false;
      }
      return pathname === "/reseller/products" || pathname.startsWith("/reseller/products/");
    }
    if (item.id === "orders") {
      return pathname === "/reseller/orders" || pathname.startsWith("/reseller/orders/");
    }
    if (item.id === "withdraw") {
      return pathname === "/reseller/withdraw" || pathname.startsWith("/reseller/withdraw/");
    }
    return pathname === item.href || active === item.id;
  }

  return (
    <>
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          aria-label={t("nav.closeMenu")}
          onClick={onClose}
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-slate-800 bg-slate-950 text-slate-300 transition-transform duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b border-slate-800 px-4">
          <Link href="/reseller" className="flex items-center gap-2" onClick={onClose} prefetch>
            <span className="grid h-7 w-7 place-items-center rounded-md bg-slate-800 text-[11px] font-semibold text-white">
              R
            </span>
            <span className="text-sm font-semibold text-white">{t("nav.reseller")}</span>
          </Link>
          <button
            type="button"
            className="grid h-8 w-8 place-items-center text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            onClick={onClose}
            aria-label={t("nav.closeMenu")}
          >
            <X size={16} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = isItemActive(item);
              const count = navBadgeCount(badges, item.badgeKey);
              const isDot = item.badgeKey === "withdraw_ready";
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  prefetch
                  onClick={onClose}
                  className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm ${
                    isActive ? "bg-slate-800 font-medium text-white" : "text-slate-400 hover:bg-slate-900 hover:text-white"
                  }`}
                >
                  <Icon size={16} />
                  <span className="min-w-0 flex-1 truncate">{t(item.labelKey)}</span>
                  {count > 0 ? (
                    <span
                      className={`shrink-0 rounded-full px-1.5 py-px text-[10px] font-semibold ${
                        isDot
                          ? "bg-emerald-500 text-white"
                          : "bg-amber-500 text-white"
                      }`}
                    >
                      {isDot ? "•" : count > 9 ? "9+" : count}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </nav>
        <div className="border-t border-slate-800 p-3">
          <p className="truncate px-2 text-xs text-slate-500">{name}</p>
          <button
            type="button"
            onClick={onLogout}
            className="mt-2 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-slate-400 hover:bg-slate-900 hover:text-white"
          >
            <LogOut size={16} />
            {t("nav.signOut")}
          </button>
        </div>
      </aside>
    </>
  );
}
