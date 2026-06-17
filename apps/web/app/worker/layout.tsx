import { RoleGate } from "@/components/RoleGate";

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  return <RoleGate allowedRoles={["worker", "supervisor", "admin"]}>{children}</RoleGate>;
}
