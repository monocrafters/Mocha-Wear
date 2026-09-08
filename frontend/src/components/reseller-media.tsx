"use client";

import { MediaExplorer } from "@/components/media-explorer";
import { ResellerShell } from "@/components/reseller-shell";
import { useResellerLocale } from "@/components/reseller-locale-provider";

export function ResellerMedia() {
  const { t } = useResellerLocale();
  return (
    <ResellerShell active="media" kicker={t("media.kicker")} title={t("media.title")} copy={t("media.copy")}>
      <MediaExplorer mode="reseller" apiBase="/api/reseller/media" />
    </ResellerShell>
  );
}
