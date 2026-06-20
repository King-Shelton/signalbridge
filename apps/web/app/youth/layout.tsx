import { RoleGate } from "@/components/RoleGate";
import { YouthDashboardShell } from "@/components/YouthDashboardShell";

export default function YouthLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate allowedRoles={["youth"]}>
      <YouthDashboardShell>{children}</YouthDashboardShell>
    </RoleGate>
  );
}
