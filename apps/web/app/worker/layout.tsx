import { DashboardShell } from "@/components/DashboardShell";
import { RoleGate } from "@/components/RoleGate";

const workerNav = [
  {
    href: "/worker/cockpit",
    label: "Cockpit",
    icon: "cockpit" as const,
    description: "Live queue and action list"
  },
  {
    href: "/worker/signal-radar",
    label: "Signal Radar",
    icon: "signal" as const,
    description: "Priority and risk signals"
  },
  {
    href: "/worker/handoffs",
    label: "Handoffs",
    icon: "handoffs" as const,
    description: "Structured handoff briefs"
  },
  {
    href: "/worker/youth-profiles",
    label: "Youth Profiles",
    icon: "profiles" as const,
    description: "Memory cards and context"
  },
  {
    href: "/worker/cases",
    label: "Cases",
    icon: "cases" as const,
    description: "Follow-up tracker"
  }
];

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate allowedRoles={["worker", "supervisor", "admin"]}>
      <DashboardShell
        eyebrow="SignalBridge worker workspace"
        title="Worker cockpit"
        description="A consistent command centre for prioritising youth conversations, reviewing handoffs, and keeping follow-up work visible."
        sidebarTitle="Worker lanes"
        sidebarBody="Use the sidebar to move between the live cockpit, signal radar, handoff briefs, youth memory cards, and cases."
        navItems={workerNav}
      >
        {children}
      </DashboardShell>
    </RoleGate>
  );
}
