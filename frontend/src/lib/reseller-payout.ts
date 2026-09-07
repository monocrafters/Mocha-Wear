export const PAYOUT_METHODS = ["bank", "jazzcash", "easypaisa", "nayapay", "sadapay"] as const;

export type PayoutMethod = (typeof PAYOUT_METHODS)[number] | "";

export type PayoutProfile = {
  payout_method: PayoutMethod;
  payout_account_title: string;
  payout_account_number: string;
  payout_bank_name: string;
  payout_iban: string;
};

export const PAYOUT_METHOD_OPTIONS: { id: PayoutMethod; labelKey: string }[] = [
  { id: "jazzcash", labelKey: "withdraw.methodJazzcash" },
  { id: "easypaisa", labelKey: "withdraw.methodEasypaisa" },
  { id: "nayapay", labelKey: "withdraw.methodNayapay" },
  { id: "sadapay", labelKey: "withdraw.methodSadapay" },
  { id: "bank", labelKey: "withdraw.methodBank" },
];

export function isWalletMethod(method: string) {
  return ["jazzcash", "easypaisa", "nayapay", "sadapay"].includes(method);
}

export function payoutMethodLabel(method?: string) {
  if (method === "bank") return "Bank account";
  if (method === "jazzcash") return "JazzCash";
  if (method === "easypaisa") return "Easypaisa";
  if (method === "nayapay") return "NayaPay";
  if (method === "sadapay") return "SadaPay";
  return method || "—";
}

export function emptyPayoutProfile(): PayoutProfile {
  return {
    payout_method: "",
    payout_account_title: "",
    payout_account_number: "",
    payout_bank_name: "",
    payout_iban: "",
  };
}

export function profileFromApi(item: Partial<PayoutProfile> | null | undefined): PayoutProfile {
  const method = String(item?.payout_method || "").trim().toLowerCase();
  return {
    payout_method: PAYOUT_METHODS.includes(method as (typeof PAYOUT_METHODS)[number])
      ? (method as PayoutMethod)
      : "",
    payout_account_title: String(item?.payout_account_title || ""),
    payout_account_number: String(item?.payout_account_number || ""),
    payout_bank_name: String(item?.payout_bank_name || ""),
    payout_iban: String(item?.payout_iban || ""),
  };
}
