import { DashboardShell } from '@signalbridge/web';

const workerNavItems = [
  { href: '/worker/cockpit', label: 'Cockpit', icon: 'cockpit' as const, description: 'Overview and alerts' },
  { href: '/worker/radar', label: 'Radar', icon: 'radar' as const, description: 'Live signal monitoring' },
  { href: '/worker/handoffs', label: 'Handoffs', icon: 'handoffs' as const, description: 'SafeNight handoffs' },
  { href: '/worker/profiles', label: 'Youth Profiles', icon: 'profiles' as const },
];

const supervisorNavItems = [
  { href: '/supervisor/overview', label: 'Overview', icon: 'overview' as const },
  { href: '/supervisor/load', label: 'Workload', icon: 'load' as const, description: 'Team capacity' },
  { href: '/supervisor/audit', label: 'Audit', icon: 'audit' as const, description: 'Compliance log' },
  { href: '/supervisor/reassign', label: 'Reassign', icon: 'reassign' as const },
];

export const WorkerDashboard = () => (
  <DashboardShell
    eyebrow="Worker Dashboard"
    title="SignalBridge Cockpit"
    description="Monitor and respond to youth reaching out through SafeNight. Review handoffs, track active cases, and coordinate with your team."
    sidebarTitle="After-hours handoffs"
    sidebarBody="Start with the handoffs from last night's SafeNight session before checking new signals."
    navItems={workerNavItems}
  >
    <div style={{ padding: 16, background: '#f1f5f9', borderRadius: 16, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 14 }}>
      Main content area
    </div>
  </DashboardShell>
);

export const SupervisorDashboard = () => (
  <DashboardShell
    eyebrow="Supervisor View"
    title="Team Overview"
    description="Review team workload, monitor case distribution, and ensure all youth are receiving timely support."
    sidebarTitle="Weekly review"
    sidebarBody="Three escalated cases need sign-off. Two workers are near capacity — consider redistribution."
    navItems={supervisorNavItems}
  >
    <div style={{ padding: 16, background: '#f1f5f9', borderRadius: 16, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 14 }}>
      Main content area
    </div>
  </DashboardShell>
);
