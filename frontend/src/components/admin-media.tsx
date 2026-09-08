"use client";

import { MediaExplorer } from "@/components/media-explorer";

export function AdminMedia() {
  return <MediaExplorer mode="admin" apiBase="/api/admin/media" />;
}
