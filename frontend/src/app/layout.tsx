import type { Metadata } from "next";
import Script from "next/script";
import { Bodoni_Moda, Inter, Manrope } from "next/font/google";
import { CartProvider } from "@/components/cart-provider";
import { SiteSettingsProvider } from "@/components/site-settings";
import { API_URL } from "@/lib/api";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const bodoni = Bodoni_Moda({
  variable: "--font-bodoni",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const DASHBOARD_THEME_BOOT = `(function(){try{var path=location.pathname||"";var k=null;if(path.indexOf("/admin")===0||path.indexOf("/Admin")===0)k="mocha_admin_theme";else if(path.indexOf("/reseller")===0||path.indexOf("/Reseller")===0)k="mocha_reseller_theme";if(!k)return;var p=localStorage.getItem(k)||"system";if(p!=="light"&&p!=="dark"&&p!=="system")p="system";var dark=p==="dark"||(p==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=dark?"dark":"light";var root=document.documentElement;root.setAttribute("data-dashboard-theme",r);root.setAttribute("data-dashboard-theme-pref",p);root.style.colorScheme=r;root.classList.remove("dashboard-theme-dark","dashboard-theme-light");root.classList.add(r==="dark"?"dashboard-theme-dark":"dashboard-theme-light");var vars=r==="dark"?"--dash-bg:#0b1220;--dash-surface:#111827;--dash-surface-2:#0f172a;--dash-text:#e2e8f0;--dash-text-2:#cbd5e1;--dash-muted:#94a3b8;--dash-border:#1f2937;--dash-border-strong:#334155;--dash-chip:#1e293b;--dash-overlay:rgba(0,0,0,.55);--dash-input:#0f172a;--dash-scrollbar-track:#0f172a;--dash-scrollbar-thumb:#334155;--cream:#1e293b;--ivory:#0b1220;--sand:#334155;--mocha-deep:#e2e8f0;--mocha:#cbd5e1;":"--dash-bg:#f3f4f6;--dash-surface:#ffffff;--dash-surface-2:#f8fafc;--dash-text:#0f172a;--dash-text-2:#334155;--dash-muted:#64748b;--dash-border:#e2e8f0;--dash-border-strong:#cbd5e1;--dash-chip:#f1f5f9;--dash-overlay:rgba(15,23,42,.4);--dash-input:#ffffff;--dash-scrollbar-track:#f1f5f9;--dash-scrollbar-thumb:#cbd5e1;--cream:#f1f5f9;--ivory:#f3f4f6;--sand:#e2e8f0;--mocha-deep:#0f172a;--mocha:#334155;";var s=document.getElementById("mocha-dashboard-theme-style");if(!s){s=document.createElement("style");s.id="mocha-dashboard-theme-style";document.head.appendChild(s);}s.textContent=".admin-root{"+vars+"color-scheme:"+r+";}";}catch(e){}})();`;

export async function generateMetadata(): Promise<Metadata> {
  try {
    const res = await fetch(`${API_URL}/api/settings`, {
      next: { revalidate: 300 },
    });
    const data = await res.json();
    const settings = data.settings || DEFAULT_SETTINGS;
    return {
      title: settings.site_title || DEFAULT_SETTINGS.site_title,
      description: settings.site_description || DEFAULT_SETTINGS.site_description,
    };
  } catch {
    return {
      title: DEFAULT_SETTINGS.site_title,
      description: DEFAULT_SETTINGS.site_description,
    };
  }
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${bodoni.variable} ${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <Script id="dashboard-theme-boot" strategy="beforeInteractive">
          {DASHBOARD_THEME_BOOT}
        </Script>
      </head>
      <body className="flex min-h-full min-w-0 max-w-full flex-col bg-ivory text-mocha-deep">
        <CartProvider>
          <SiteSettingsProvider>{children}</SiteSettingsProvider>
        </CartProvider>
      </body>
    </html>
  );
}
