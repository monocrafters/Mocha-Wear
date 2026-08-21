"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Headset, Home, LayoutGrid, Package, Search, ShoppingBag, Tag } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { SearchOverlay } from "@/components/search-overlay";
import { StoreNotifications } from "@/components/notification-bell";
import { SaleTimerHeader, SaleTimerStrip } from "@/components/sale-timer";
import { useSiteSettings } from "@/components/site-settings";

const links = [
  { href: "/shop", label: "Shop" },
  { href: "/collections", label: "Collections" },
  { href: "/#sale", label: "Sale", sale: true },
  { href: "/orders", label: "Orders" },
  { href: "/help", label: "Help" },
];

const bottomLinks = [
  { id: "shop", href: "/shop", label: "Shop", icon: LayoutGrid },
  { id: "collections", href: "/collections", label: "Collections", icon: Tag },
  { id: "home", href: "/", label: "Home", icon: Home, home: true },
  { id: "orders", href: "/orders", label: "Orders", icon: Package },
  { id: "cart", href: "/cart", label: "Cart", icon: ShoppingBag, cart: true },
] as const;

type TabId = (typeof bottomLinks)[number]["id"];

function headerActive(pathname: string, href: string, sale?: boolean) {
  if (sale) return pathname === "/";
  if (href === "/shop") return pathname === "/shop" || pathname.startsWith("/products");
  if (href === "/collections") return pathname.startsWith("/collections");
  if (href === "/orders") return pathname.startsWith("/orders");
  if (href === "/help") return pathname.startsWith("/help");
  if (href === "/cart") return pathname.startsWith("/cart") || pathname.startsWith("/checkout");
  return pathname === href;
}

function tabFromLocation(pathname: string, hash: string): TabId | null {
  if (pathname === "/shop" || pathname.startsWith("/products")) return "shop";
  if (pathname.startsWith("/collections") || hash === "#collections") return "collections";
  if (pathname.startsWith("/orders")) return "orders";
  if (pathname.startsWith("/cart") || pathname.startsWith("/checkout")) return "cart";
  if (pathname === "/") return "home";
  return null;
}

const PILL_KEY = "mocha-nav-pill";
let pillMemory = { left: 0, width: 0 };

function readPill() {
  if (pillMemory.width) return pillMemory;
  if (typeof window === "undefined") return pillMemory;
  try {
    const saved = sessionStorage.getItem(PILL_KEY);
    if (saved) pillMemory = JSON.parse(saved);
  } catch {
    /* ignore */
  }
  return pillMemory;
}

function writePill(next: { left: number; width: number }) {
  pillMemory = next;
  try {
    sessionStorage.setItem(PILL_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function SiteHeader() {
  const pathname = usePathname();
  const { count } = useCart();
  const settings = useSiteSettings();
  const [active, setActive] = useState<TabId | null>("home");
  const [searchOpen, setSearchOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const [pill, setPill] = useState({ left: 0, width: 0, ready: false, visible: false });

  useEffect(() => {
    function sync() {
      setActive(tabFromLocation(pathname, window.location.hash));
    }
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [pathname]);

  useEffect(() => {
    setSearchOpen(false);
  }, [pathname]);

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    function measure() {
      const current = navRef.current?.querySelector("[data-nav-active='true']");
      if (!(current instanceof HTMLElement)) return null;
      return { left: current.offsetLeft, width: current.offsetWidth };
    }

    const next = measure();
    const from = readPill();
    if (from.width) {
      setPill({ left: from.left, width: from.width, ready: true, visible: true });
    }

    let skipResize = true;
    const frame = requestAnimationFrame(() => {
      if (!next) {
        setPill((prev) => ({ ...prev, visible: false, ready: true }));
        return;
      }
      writePill(next);
      setPill({ left: next.left, width: next.width, ready: from.width > 0, visible: true });
      if (!from.width) {
        requestAnimationFrame(() => setPill((prev) => ({ ...prev, ready: true })));
      }
    });

    const observer = new ResizeObserver(() => {
      if (skipResize) return;
      const now = measure();
      if (!now) return;
      writePill(now);
      setPill({ ...now, ready: true, visible: true });
    });
    observer.observe(nav);
    const enableResize = requestAnimationFrame(() => {
      skipResize = false;
    });

    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(enableResize);
      observer.disconnect();
    };
  }, [pathname]);

  useEffect(() => {
    if (!searchOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSearchOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [searchOpen]);

  return (
    <>
      <header className="sticky top-0 z-50 w-full min-w-0 overflow-x-clip">
        <div className="flex h-7 w-full min-w-0 items-center justify-center overflow-hidden bg-sale text-white sm:h-8">
          <p className="w-full min-w-0 truncate px-4 text-center text-[10px] font-semibold tracking-[0.16em] uppercase sm:text-[11px] sm:tracking-[0.22em]">
            <SaleTimerHeader />
          </p>
        </div>

        <div className="w-full min-w-0 bg-mocha-deep">
          <div className="mx-auto flex h-14 w-full min-w-0 max-w-[1440px] items-center justify-between gap-2 px-4 sm:h-[72px] sm:px-8">
            <Link href="/" className="group flex min-w-0 items-baseline gap-2">
              <span className="font-serif truncate text-[1.45rem] leading-none tracking-[0.12em] text-ivory transition-colors duration-300 group-hover:text-gold sm:text-[1.7rem]">
                {settings.brand_name}
              </span>
              {settings.brand_suffix ? (
                <span className="shrink-0 text-[10px] font-semibold tracking-[0.38em] text-gold uppercase">{settings.brand_suffix}</span>
              ) : null}
            </Link>

            <nav ref={navRef} className="relative hidden items-center lg:flex">
              <span
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-0 h-8 -translate-y-1/2 rounded-full bg-sale"
                style={{
                  width: pill.width,
                  opacity: pill.visible && pill.width ? 1 : 0,
                  transform: `translateX(${pill.left}px)`,
                  transition: pill.ready
                    ? "transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), width 0.45s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease"
                    : "none",
                }}
              />
              {links.map((link) => {
                const on = headerActive(pathname, link.href, link.sale);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    data-nav-active={on ? "true" : undefined}
                    className={`relative z-10 rounded-full px-3.5 py-1.5 text-[11px] tracking-[0.18em] uppercase transition-colors duration-300 ${
                      on ? "font-semibold text-white" : "font-medium text-ivory/90 hover:text-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex shrink-0 items-center gap-1">
              <StoreNotifications />
              <button
                type="button"
                aria-label="Search"
                onClick={() => {
                  if (pathname.startsWith("/search")) {
                    document.getElementById("site-search")?.focus();
                    return;
                  }
                  setSearchOpen(true);
                }}
                className="grid h-10 w-10 place-items-center rounded-full text-ivory/90 transition-all duration-300 hover:bg-white/10 hover:text-white"
              >
                <Search size={18} strokeWidth={1.6} />
              </button>
              <Link
                href="/help"
                aria-label="Support"
                className={`grid h-10 w-10 place-items-center rounded-full transition-all duration-300 hover:bg-white/10 hover:text-white lg:hidden ${
                  pathname.startsWith("/help") ? "bg-sale text-white" : "text-ivory/90"
                }`}
              >
                <Headset size={18} strokeWidth={1.6} />
              </Link>
              <Link
                href="/cart"
                aria-label="Bag"
                className={`relative hidden h-10 w-10 place-items-center rounded-full transition-all duration-300 hover:bg-white/10 hover:text-white lg:grid ${
                  pathname.startsWith("/cart") || pathname.startsWith("/checkout") ? "bg-sale text-white" : "text-ivory/90"
                }`}
              >
                <ShoppingBag size={18} strokeWidth={1.6} />
                {count ? (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-sale px-1 text-[9px] font-semibold text-white">
                    {count}
                  </span>
                ) : null}
              </Link>
            </div>
          </div>
        </div>
        {pathname !== "/" && !pathname.startsWith("/products") ? <SaleTimerStrip /> : null}
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-[70] border-t border-white/10 bg-mocha-deep pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="grid grid-cols-5">
          {bottomLinks.map((link) => {
            const Icon = link.icon;
            const isOn = active === link.id;
            if (link.id === "home") {
              return (
                <Link
                  key={link.id}
                  href={link.href}
                  onClick={() => setActive("home")}
                  aria-current={isOn ? "page" : undefined}
                  className={`relative flex flex-col items-center justify-center pt-1 ${
                    isOn ? "text-white" : "text-ivory/55"
                  }`}
                >
                  <span
                    className={`-mt-5 grid h-12 w-12 place-items-center rounded-full shadow-lg ${
                      isOn ? "bg-sale" : "bg-mocha"
                    }`}
                  >
                    <Icon size={18} strokeWidth={1.8} className="text-white" />
                  </span>
                  <span className="mt-1 text-[8px] font-semibold tracking-[0.14em] uppercase">{link.label}</span>
                </Link>
              );
            }
            if (link.id === "cart") {
              return (
                <Link
                  key={link.id}
                  href={link.href}
                  onClick={() => setActive("cart")}
                  aria-current={isOn ? "page" : undefined}
                  className={`relative flex flex-col items-center justify-center gap-1 py-2.5 ${
                    isOn ? "text-white" : "text-ivory/55"
                  }`}
                >
                  <span className={`relative grid h-9 w-9 place-items-center rounded-full ${isOn ? "bg-sale" : ""}`}>
                    <Icon size={18} strokeWidth={isOn ? 2 : 1.7} />
                    {count ? (
                      <span className="absolute -right-2 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-sale px-1 text-[8px] font-semibold text-white">
                        {count}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-[8px] font-semibold tracking-[0.14em] uppercase">{link.label}</span>
                </Link>
              );
            }
            return (
              <Link
                key={link.id}
                href={link.href}
                onClick={() => setActive(link.id)}
                aria-current={isOn ? "page" : undefined}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 ${
                  isOn ? "text-white" : "text-ivory/55"
                }`}
              >
                <span className={`grid h-9 w-9 place-items-center rounded-full ${isOn ? "bg-sale" : ""}`}>
                  <Icon size={18} strokeWidth={isOn ? 2 : 1.7} />
                </span>
                <span className="text-[8px] font-semibold tracking-[0.14em] uppercase">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
