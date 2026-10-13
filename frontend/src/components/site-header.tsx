"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Headset, Home, LayoutGrid, Package, Search, ShoppingBag, Tag } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { SearchOverlay } from "@/components/search-overlay";
import { StoreNotifications } from "@/components/notification-bell";
import { SaleTimerHeader } from "@/components/sale-timer";
import { useSiteSettings } from "@/components/site-settings";
import { useOpenOrderCount } from "@/lib/use-open-orders";
import styles from "./mobile-navigation.module.css";

const links = [
  { href: "/shop", label: "Shop" },
  { href: "/collections", label: "Collections" },
  { href: "/#sale", label: "Sale", sale: true },
  { href: "/about", label: "About" },
  { href: "/orders", label: "Orders" },
  { href: "/help", label: "Help" },
];

const bottomLinks = [
  { id: "home", href: "/", label: "Home", icon: Home },
  { id: "shop", href: "/shop", label: "Shop", icon: LayoutGrid },
  { id: "collections", href: "/collections", label: "Collections", icon: Tag },
  { id: "orders", href: "/orders", label: "Orders", icon: Package },
  { id: "cart", href: "/cart", label: "Bag", icon: ShoppingBag },
] as const;

type TabId = (typeof bottomLinks)[number]["id"];

function headerActive(pathname: string, href: string, sale?: boolean) {
  if (sale) return pathname === "/";
  if (href === "/shop") return pathname === "/shop" || pathname.startsWith("/products");
  if (href === "/collections") return pathname.startsWith("/collections");
  if (href === "/orders") return pathname.startsWith("/orders");
  if (href === "/about") return pathname.startsWith("/about");
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
  const openOrders = useOpenOrderCount();
  const settings = useSiteSettings();
  const [active, setActive] = useState<TabId | null>(() => tabFromLocation(pathname, ""));
  const [searchOpen, setSearchOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const settleRef = useRef(0);
  const [pill, setPill] = useState({
    x: 0,
    w: 0,
    sx: 1,
    sy: 1,
    origin: "center",
    ready: false,
    visible: false,
  });

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

    function settle() {
      window.clearTimeout(settleRef.current);
      settleRef.current = window.setTimeout(() => {
        setPill((prev) => (prev.sx === 1 && prev.sy === 1 ? prev : { ...prev, sx: 1, sy: 1, origin: "center" }));
      }, 160);
    }

    function place(next: { left: number; width: number }, animate: boolean) {
      const from = readPill();
      const dx = next.left - from.left;
      const moved = animate && from.width > 0 && (dx !== 0 || from.width !== next.width);
      writePill(next);
      setPill({
        x: next.left,
        w: next.width,
        sx: moved ? Math.min(1.18, 1 + Math.abs(dx) / 420) : 1,
        sy: moved ? 0.92 : 1,
        origin: dx < 0 ? "right" : "left",
        ready: animate && from.width > 0,
        visible: true,
      });
      if (moved) settle();
      else if (!from.width && animate) {
        requestAnimationFrame(() => setPill((prev) => ({ ...prev, ready: true })));
      }
    }

    const next = measure();
    const from = readPill();
    if (from.width) {
      setPill((prev) => ({
        ...prev,
        x: from.left,
        w: from.width,
        ready: true,
        visible: true,
        sx: 1,
        sy: 1,
      }));
    }

    let skipResize = true;
    const frame = requestAnimationFrame(() => {
      if (!next) {
        setPill((prev) => ({ ...prev, visible: false, ready: true, sx: 1, sy: 1 }));
        return;
      }
      place(next, true);
    });

    const observer = new ResizeObserver(() => {
      if (skipResize) return;
      const now = measure();
      if (!now) return;
      writePill(now);
      setPill((prev) => ({
        ...prev,
        x: now.left,
        w: now.width,
        sx: 1,
        sy: 1,
        ready: true,
        visible: true,
      }));
    });
    observer.observe(nav);
    const enableResize = requestAnimationFrame(() => {
      skipResize = false;
    });

    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(enableResize);
      window.clearTimeout(settleRef.current);
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
      <header className={`sticky top-0 z-50 w-full min-w-0 overflow-x-clip ${pathname === "/" ? "edition-site-header" : ""}`}>
        <div className="flex h-7 w-full min-w-0 items-center justify-center overflow-hidden bg-sale text-white sm:h-8">
          <p className="w-full min-w-0 truncate px-4 text-center text-[11px] font-semibold tracking-[0.16em] uppercase sm:tracking-[0.22em]">
            <SaleTimerHeader />
          </p>
        </div>

        <div className="w-full min-w-0 bg-mocha-deep">
          <div className="mx-auto flex h-14 w-full min-w-0 max-w-[1440px] items-center justify-between gap-2 px-4 sm:h-[72px] sm:px-8">
            <Link href="/" className="header-brand flex min-w-0 items-baseline gap-2">
              <span className="header-brand-mark font-serif truncate text-[1.45rem] leading-none tracking-[0.12em] text-ivory sm:text-[1.7rem]">
                {settings.brand_name}
              </span>
              {settings.brand_suffix ? (
                <span className="shrink-0 text-[10px] font-semibold tracking-[0.38em] text-gold uppercase">{settings.brand_suffix}</span>
              ) : null}
            </Link>

            <nav ref={navRef} className="relative hidden items-center lg:flex">
              <span
                aria-hidden
                className={`header-pill${pill.ready ? "" : " is-instant"}`}
                style={
                  {
                    "--pill-x": `${pill.x}px`,
                    "--pill-w": `${pill.w}px`,
                    "--pill-opacity": pill.visible && pill.w ? 1 : 0,
                    "--pill-sx": pill.sx,
                    "--pill-sy": pill.sy,
                    "--pill-origin": pill.origin,
                  } as CSSProperties
                }
              >
                <span className="header-pill-fill" />
              </span>
              {links.map((link) => {
                const on = headerActive(pathname, link.href, link.sale);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    data-nav-active={on ? "true" : undefined}
                    className={`header-link relative z-10 inline-flex items-center rounded-full px-3.5 py-1.5 text-[11px] tracking-[0.18em] uppercase transition-colors duration-200 ${
                      on ? "font-semibold text-mocha-deep" : "font-medium text-ivory/80"
                    }`}
                    prefetch
                  >
                    {link.label}
                    {link.href === "/orders" && openOrders ? (
                      <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-sale px-1 text-[9px] font-semibold text-white">
                        {openOrders > 9 ? "9+" : openOrders}
                      </span>
                    ) : null}
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
                className="header-icon-btn grid h-10 w-10 place-items-center rounded-full"
              >
                <Search size={18} strokeWidth={1.6} />
              </button>
              <Link
                href="/help"
                aria-label="Support"
                className={`header-icon-btn grid h-10 w-10 place-items-center rounded-full lg:hidden ${
                  pathname.startsWith("/help") ? "is-on" : ""
                }`}
              >
                <Headset size={18} strokeWidth={1.6} />
              </Link>
              <Link
                href="/cart"
                aria-label="Bag"
                className={`header-icon-btn relative hidden h-10 w-10 place-items-center rounded-full lg:grid ${
                  pathname.startsWith("/cart") || pathname.startsWith("/checkout") ? "is-on" : ""
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
      </header>

      <nav aria-label="Mobile navigation" className={styles.navigation}>
        <div className={styles.links}>
          {bottomLinks.map((link) => {
            const Icon = link.icon;
            const isOn = active === link.id;
            const badge = link.id === "cart" ? count : link.id === "orders" ? openOrders : 0;
            return (
              <Link
                key={link.id}
                href={link.href}
                prefetch
                aria-current={isOn ? "page" : undefined}
                aria-label={badge ? `${link.label}, ${badge} ${link.id === "cart" ? "items" : "open orders"}` : undefined}
                className={styles.link}
              >
                <span className={styles.icon}>
                  <Icon size={20} strokeWidth={isOn ? 1.9 : 1.55} aria-hidden="true" />
                  {badge ? (
                    <span className={styles.badge} aria-hidden="true">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  ) : null}
                </span>
                <span className={styles.label}>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
