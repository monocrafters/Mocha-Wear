import { AdminShell } from "@/components/admin-shell";
import { AdminMedia } from "@/components/admin-media";

export default function AdminMediaPage() {
  return (
    <AdminShell
      active="media"
      kicker="Content"
      title="Media"
      copy="Upload folders and files for resellers — nested like a file explorer."
    >
      <AdminMedia />
    </AdminShell>
  );
}
