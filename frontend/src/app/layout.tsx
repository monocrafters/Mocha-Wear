import type { Metadata } from "next";
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
    <html lang="en" className={`${manrope.variable} ${bodoni.variable} ${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full min-w-0 max-w-full flex-col bg-ivory text-mocha-deep">
        <CartProvider>
          <SiteSettingsProvider>{children}</SiteSettingsProvider>
        </CartProvider>
      </body>
    </html>
  );
}
