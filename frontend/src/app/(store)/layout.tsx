import { StoreTheme } from "@/components/store-theme";
import "./store-refined.css";
import { SiteHeader } from "@/components/site-header";
import { CatalogProvider } from "@/components/catalog-provider";
import { HomeWhatsAppButton } from "@/components/home-whatsapp-button";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <CatalogProvider>
      <StoreTheme>
      <SiteHeader />
      {children}
      <HomeWhatsAppButton />
      </StoreTheme>
    </CatalogProvider>
  );
}
