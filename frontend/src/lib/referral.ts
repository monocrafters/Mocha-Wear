const REFERRAL_STORAGE_KEY = "mw_r";
export const RESELLER_ACTIVATED_EVENT = "mocha:reseller-activated";

export function readReferralQueryParam(): string {
  if (typeof window === "undefined") return "";
  try {
    return String(new URLSearchParams(window.location.search).get("r") || "")
      .trim()
      .toLowerCase();
  } catch {
    return "";
  }
}

export function getReferralCode(): string {
  if (typeof window === "undefined") return "";
  try {
    const stored = String(sessionStorage.getItem(REFERRAL_STORAGE_KEY) || "")
      .trim()
      .toLowerCase();
    if (stored) return stored;
  } catch {
    /* private mode */
  }
  return readReferralQueryParam();
}

export function setReferralCode(code: string) {
  if (typeof window === "undefined") return;
  const next = String(code || "").trim().toLowerCase();
  try {
    if (next) sessionStorage.setItem(REFERRAL_STORAGE_KEY, next);
    else sessionStorage.removeItem(REFERRAL_STORAGE_KEY);
  } catch {
    /* private mode */
  }
  if (next) {
    window.dispatchEvent(new CustomEvent(RESELLER_ACTIVATED_EVENT, { detail: { code: next } }));
  }
}

export function clearReferralCode() {
  setReferralCode("");
}
