import { DashboardShell } from "@/components/DashboardShell";
import { RoleGate } from "@/components/RoleGate";

const supervisorNav = [
  {
    href: "/supervisor",
    label: "Overview",
    icon: "overview" as const,
    description: "Load and review summary"
  },
  {
    href: "/worker/cockpit",
    label: "Worker Cockpit",
    icon: "cockpit" as const,
    description: "See the live youth queue"
  },
  {
    href: "/worker/signal-radar",
    label: "Signal Radar",
    icon: "signal" as const,
    description: "Prioritised outreach signals"
  },
  {
    href: "/worker/cases",
    label: "Cases",
    icon: "cases" as const,
    description: "Follow-up and escalation"
  },
  {
    href: "/worker/youth-profiles",
    label: "Youth Profiles",
    icon: "profiles" as const,
    description: "Continuity context"
  },
  {
    href: "/supervisor/audit",
    label: "Safety Audit",
    icon: "audit" as const,
    description: "AI and handoff trace"
  }
];

export default function SupervisorLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate allowedRoles={["supervisor", "admin"]}>
      <DashboardShell
        eyebrow="SignalBridge supervisor workspace"
        title="Supervisor overview"
        description="A matching dashboard frame for reviewing worker load, unresolved handoffs, and safe escalation decisions."
        sidebarTitle="Oversight lanes"
        sidebarBody="Use the same dashboard language as the worker view so supervisors can jump from load management into live case context quickly."
        navItems={supervisorNav}
      >
        {children}
      </DashboardShell>
    </RoleGate>
  );
}
