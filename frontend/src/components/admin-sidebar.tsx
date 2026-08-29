"use client";

import Link from "next/link";
import {
  Banknote,
  GalleryHorizontal,
  Handshake,
  Headset,
  LayoutDashboard,
  Link2,
  LogOut,
  Menu,
  Package,
  Percent,
  Settings,
  ShoppingBag,
  Star,
  Tag,
  Users,
  X,
} from "lucide-react";

const nav = [
  {
    title: "Overview",
    items: [
      { href: "/admin", id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/hero", id: "hero", label: "Hero", icon: GalleryHorizontal },
    ],
  },
  {
    title: "Catalog",
    items: [
      { href: "/admin/product", id: "products", label: "Products", icon: Package },
      { href: "/admin/collection", id: "collections", label: "Collections", icon: Tag },
    ],
  },
  {
    title: "Commerce",
    items: [
      { href: "/admin/orders", id: "orders", label: "Orders", icon: ShoppingBag },
      { href: "/admin/sale", id: "sale", label: "Sale", icon: Percent },
      { href: "/admin/review", id: "reviews", label: "Reviews", icon: Star },
      { href: "/admin/help", id: "help", label: "Help", icon: Headset },
      { href: "/admin/customers", id: "customers", label: "Customers", icon: Users },
      { href: "/admin/resellers", id: "resellers", label: "Resellers", icon: Handshake },
      { href: "/admin/link-requests", id: "link-requests", label: "Link requests", icon: Link2 },
      { href: "/admin/payouts", id: "payouts", label: "Payouts", icon: Banknote },
    ],
  },
  {
    title: "System",
    items: [{ href: "/admin/settings", id: "settings", label: "Settings", icon: Settings }],
  },
];

type AdminSidebarProps = {
  username: string;
  active: string;
  onLogout: () => void;
  open: boolean;
  onClose: () => void;
};

export function AdminSidebar({ username, active, onLogout, open, onClose }: AdminSidebarProps) {
  return (
    <>
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          aria-label="Close sidebar"
          onClick={onClose}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-slate-800 bg-slate-950 text-slate-300 transition-transform duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b border-slate-800 px-4">
          <Link href="/admin" className="flex items-center gap-2" onClick={onClose}>
            <span className="grid h-7 w-7 place-items-center rounded-md bg-slate-800 text-[11px] font-semibold text-white">
              M
            </span>
            <span className="text-sm font-semibold text-white">Mocha Admin</span>
          </Link>
          <button
            type="button"
            className="grid h-8 w-8 place-items-center text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {nav.map((group) => (
            <div key={group.title} className="mb-5">
              <p className="px-2 pb-1.5 text-xs font-medium text-slate-500">{group.title}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = active === item.id;
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={onClose}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition ${
                        isActive
                          ? "bg-slate-800 font-medium text-white"
                          : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-100"
                      }`}
                    >
                      <Icon size={16} strokeWidth={1.75} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-800 p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-1 py-1">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-800 text-xs font-semibold text-white">
              {username.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{username}</p>
              <p className="text-xs text-slate-500">Administrator</p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              aria-label="Sign out"
              className="grid h-8 w-8 place-items-center text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export function AdminMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 lg:hidden"
      aria-label="Open sidebar"
    >
      <Menu size={16} />
    </button>
  );
}
