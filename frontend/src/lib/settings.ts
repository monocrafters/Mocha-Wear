export type SiteNote = {
  id: string;
  title: string;
  copy: string;
  sort_order: number;
};

export type SiteSettings = {
  brand_name: string;
  brand_suffix: string;
  tagline: string;
  site_title: string;
  site_description: string;
  email: string;
  phone: string;
  cities: string;
  delivery_line: string;
  mobile_line: string;
  instagram: string;
  instagram_url: string;
  floating_whatsapp_enabled: boolean;
  floating_whatsapp_number: string;
  floating_whatsapp_message: string;
  marquee: string[];
  visit_heading: string;
  atelier_heading: string;
  copyright: string;
  collections_kicker: string;
  collections_heading: string;
  collections_all_label: string;
  products_kicker: string;
  products_heading: string;
  products_copy: string;
  shop_kicker: string;
  shop_heading: string;
  reviews_kicker: string;
  reviews_heading: string;
  reviews_aside: string;
  notes_kicker: string;
  notes_heading: string;
  notes_cta: string;
  notes: SiteNote[];
  newsletter_enabled: boolean;
  newsletter_kicker: string;
  newsletter_heading: string;
  newsletter_placeholder: string;
  newsletter_button: string;
  reseller_min_percent: number;
  reseller_max_percent: number;
  reseller_return_window_days: number;
  reseller_min_payout: number;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  brand_name: "Mocha",
  brand_suffix: "Wear",
  tagline:
    "A ladies-suit atelier for the modern wardrobe — warm palettes, considered embroidery, and sale drops worth dressing for.",
  site_title: "Mocha Wear — Ladies Suits Sale",
  site_description: "Mocha Wear mid-season sale. Lawn, pret, and formal ladies suits up to 50% off.",
  email: "hello@mochawear.com",
  phone: "",
  cities: "Karachi · Lahore · Islamabad",
  delivery_line: "Free nationwide delivery",
  mobile_line: "Free nationwide delivery · Cash on delivery",
  instagram: "@mochawear",
  instagram_url: "",
  floating_whatsapp_enabled: true,
  floating_whatsapp_number: "",
  floating_whatsapp_message: "Hi Mocha Wear, I have a question.",
  marquee: ["Sale", "Lawn", "Formals", "Pret", "Mocha Wear"],
  visit_heading: "Visit",
  atelier_heading: "Atelier",
  copyright: "© {year} Mocha Wear · All rights reserved",
  collections_kicker: "Shop by collection",
  collections_heading: "Collections",
  collections_all_label: "All collections",
  products_kicker: "Selected for her",
  products_heading: "Sale suits",
  products_copy: "2 & 3 piece lawn, pret, and formals — marked down for a limited season.",
  shop_kicker: "On sale",
  shop_heading: "Shop suits",
  reviews_kicker: "Loved by her",
  reviews_heading: "Real notes from the sale.",
  reviews_aside: "Pakistan",
  notes_kicker: "Before you buy",
  notes_heading: "Delivery, exchange, and a little help.",
  notes_cta: "Open support",
  notes: [
    { id: "1", title: "Free delivery", copy: "On every order. 3–5 days, nationwide.", sort_order: 1 },
    { id: "2", title: "Easy exchange", copy: "7 days on unworn pieces, tags still on.", sort_order: 2 },
    { id: "3", title: "Cash on delivery", copy: "Pay at the door. Simple, no extra steps.", sort_order: 3 },
    { id: "4", title: "Need a size?", copy: "Message us on WhatsApp — we help you pick.", sort_order: 4 },
  ],
  newsletter_enabled: true,
  newsletter_kicker: "Join the list",
  newsletter_heading: "First look at the next drop.",
  newsletter_placeholder: "Email address",
  newsletter_button: "Subscribe",
  reseller_min_percent: 10,
  reseller_max_percent: 40,
  reseller_return_window_days: 7,
  reseller_min_payout: 2000,
};

export function brandLabel(settings: SiteSettings) {
  return [settings.brand_name, settings.brand_suffix].filter(Boolean).join(" ").trim() || "Mocha Wear";
}

export function copyrightLine(settings: SiteSettings) {
  return settings.copyright.replaceAll("{year}", String(new Date().getFullYear()));
}

export function instagramHref(settings: SiteSettings) {
  if (settings.instagram_url) return settings.instagram_url;
  const handle = settings.instagram.replace(/^@/, "").trim();
  return handle ? `https://instagram.com/${handle}` : "";
}

export function whatsappChatHref(number: string, message = "") {
  let digits = String(number || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0") && digits.length === 11) digits = `92${digits.slice(1)}`;
  const text = message.trim() ? `?text=${encodeURIComponent(message.trim())}` : "";
  return `https://wa.me/${digits}${text}`;
}
