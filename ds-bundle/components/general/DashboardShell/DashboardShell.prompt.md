DashboardShell from @signalbridge/web. Use via `window.SignalBridge.DashboardShell` (bundle loaded from the root `_ds_bundle.js`).

## Examples

### WorkerDashboard

```jsx
() => (
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
)
```

### SupervisorDashboard

```jsx
() => (
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
)
```
