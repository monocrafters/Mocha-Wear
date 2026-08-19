export type HelpTopic = {
  id: string;
  title: string;
  copy: string;
  message: string;
  icon: string;
  is_published: boolean;
  sort_order: number;
};

export type HelpNote = {
  id: string;
  title: string;
  copy: string;
  is_published: boolean;
  sort_order: number;
};

export type HelpContent = {
  hours: string;
  whatsapp_number: string;
  whatsapp_display: string;
  reply_line: string;
  cta_label: string;
  cta_desktop_label: string;
  default_message: string;
  kicker: string;
  title: string;
  desktop_heading: string;
  desktop_copy: string;
  topics_heading: string;
  notes_heading: string;
  topics: HelpTopic[];
  notes: HelpNote[];
  icons?: string[];
};

export const HELP_ICONS = [
  { id: "ruler", label: "Ruler" },
  { id: "package", label: "Package" },
  { id: "map-pin", label: "Map pin" },
  { id: "refresh", label: "Refresh" },
  { id: "headset", label: "Headset" },
  { id: "clock", label: "Clock" },
  { id: "truck", label: "Truck" },
  { id: "message", label: "Message" },
  { id: "shopping-bag", label: "Shopping bag" },
  { id: "tag", label: "Tag" },
] as const;

export const DEFAULT_HELP: HelpContent = {
  hours: "10am–8pm",
  whatsapp_number: "923001234567",
  whatsapp_display: "0300 123 4567",
  reply_line: "Usually replies in minutes",
  cta_label: "Chat on WhatsApp",
  cta_desktop_label: "Open WhatsApp",
  default_message: "Hi Mocha Wear, I need some help.",
  kicker: "Support",
  title: "Help",
  desktop_heading: "We’re here if you need us.",
  desktop_copy:
    "Sizes, orders, delivery, or an exchange — message the atelier on WhatsApp and a person will reply.",
  topics_heading: "What can we help with?",
  notes_heading: "Before you buy",
  topics: [
    {
      id: "size",
      title: "Size & fit",
      copy: "Not sure which size to order? Send a photo or your measurements.",
      message: "Hi Mocha Wear, I need help choosing a size.",
      icon: "ruler",
      is_published: true,
      sort_order: 1,
    },
    {
      id: "order",
      title: "Track an order",
      copy: "Share your order number and we’ll confirm packing and delivery.",
      message: "Hi Mocha Wear, I need help with my order.",
      icon: "package",
      is_published: true,
      sort_order: 2,
    },
    {
      id: "delivery",
      title: "Delivery",
      copy: "Free nationwide delivery, usually 3–5 days after confirmation.",
      message: "Hi Mocha Wear, I have a question about delivery.",
      icon: "map-pin",
      is_published: true,
      sort_order: 3,
    },
    {
      id: "exchange",
      title: "Exchange",
      copy: "7 days on unworn pieces with tags still on.",
      message: "Hi Mocha Wear, I’d like to exchange a piece.",
      icon: "refresh",
      is_published: true,
      sort_order: 4,
    },
  ],
  notes: [
    { id: "n1", title: "Free delivery", copy: "3–5 days, nationwide.", is_published: true, sort_order: 1 },
    { id: "n2", title: "Easy exchange", copy: "7 days, tags on.", is_published: true, sort_order: 2 },
    { id: "n3", title: "Cash on delivery", copy: "Pay at the door.", is_published: true, sort_order: 3 },
    { id: "n4", title: "Sizing help", copy: "We pick with you.", is_published: true, sort_order: 4 },
  ],
};

export function whatsappHref(number: string, message: string) {
  const digits = String(number || "").replace(/\D/g, "");
  if (!digits) return "#";
  return `https://wa.me/${digits}?text=${encodeURIComponent(message || "")}`;
}
