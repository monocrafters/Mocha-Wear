export function formatPkr(amount: number) {
  return `Rs. ${Number(amount || 0).toLocaleString("en-PK")}`;
}
