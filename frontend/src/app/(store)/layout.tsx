import { SiteHeader } from "@/components/site-header";
import { CatalogProvider } from "@/components/catalog-provider";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <CatalogProvider>
      <SiteHeader />
      {children}
    </CatalogProvider>
  );
}
