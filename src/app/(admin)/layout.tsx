import { AdminShell } from "@/components/AdminShell";
import { BusinessSettingsProvider } from "@/components/BusinessSettingsProvider";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BusinessSettingsProvider>
      <AdminShell>{children}</AdminShell>
    </BusinessSettingsProvider>
  );
}
