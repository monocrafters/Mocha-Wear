import { redirect } from "next/navigation";

export default function ResellerActiveProductsRedirect() {
  redirect("/reseller/products/live");
}
