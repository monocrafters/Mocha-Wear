export type SavedAddress = {
  name: string;
  phone: string;
  whatsapp: string;
  city: string;
  area: string;
  address: string;
  landmark: string;
};

export const CUSTOMER_KEY = "mocha-wear-customer";
export const CUSTOMER_EVENT = "mocha-customer";

function digits(value: string) {
  return String(value || "").replace(/\D/g, "");
}

/** Accept 03…, 3…, 92…, +92… — return canonical 03xxxxxxxxx or "". */
export function normalizePkMobile(value: string) {
  let raw = digits(value);
  if (raw.startsWith("0092")) raw = raw.slice(2);
  if (raw.startsWith("92") && raw.length >= 12) raw = `0${raw.slice(2)}`;
  if (raw.length === 10 && raw.startsWith("3")) raw = `0${raw}`;
  if (raw.length === 11 && raw.startsWith("03")) return raw;
  return "";
}

export function asSavedAddress(row: Partial<SavedAddress> | null | undefined): SavedAddress | null {
  if (!row) return null;
  const phone = normalizePkMobile(row.phone || "") || digits(row.phone || "");
  const name = String(row.name || "").trim();
  const city = String(row.city || "").trim();
  const area = String(row.area || "").trim();
  const address = String(row.address || "").trim();
  if (!name || !phone || !city || !area || !address) return null;
  return {
    name,
    phone,
    whatsapp: normalizePkMobile(row.whatsapp || row.phone || "") || digits(row.whatsapp || row.phone || ""),
    city,
    area,
    address,
    landmark: String(row.landmark || "").trim(),
  };
}

function notify() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CUSTOMER_EVENT));
}

export function readCustomerSession(): SavedAddress | null {
  if (typeof window === "undefined") return null;
  try {
    return asSavedAddress(JSON.parse(localStorage.getItem(CUSTOMER_KEY) || "null"));
  } catch {
    return null;
  }
}

export function saveCustomerSession(profile: Partial<SavedAddress>) {
  if (typeof window === "undefined") return;
  const saved = asSavedAddress(profile);
  if (!saved) return;
  localStorage.setItem(CUSTOMER_KEY, JSON.stringify(saved));
  if (saved.phone) localStorage.setItem("mocha-wear-order-phone", saved.phone);
  notify();
}

export function addressLine(profile: SavedAddress) {
  return [profile.address, profile.area, profile.city, profile.landmark].filter(Boolean).join(", ");
}

export function sameWhatsapp(profile: SavedAddress) {
  return !profile.whatsapp || profile.whatsapp === profile.phone;
}
