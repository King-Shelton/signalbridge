DashboardCard from @signalbridge/web. Use via `window.SignalBridge.DashboardCard` (bundle loaded from the root `_ds_bundle.js`).

## Examples

### ActiveCasesCard

```jsx
() => (
  <div style={{ padding: 16, maxWidth: 280 }}>
    <DashboardCard
      label="Active Cases"
      value="12"
      detail="3 require follow-up within 24 hours"
      icon={Users}
      tone="pine"
    />
  </div>
)
```

### EscalatedCard

```jsx
() => (
  <div style={{ padding: 16, maxWidth: 280 }}>
    <DashboardCard
      label="Escalated"
      value="2"
      detail="High-risk youth — review immediately"
      icon={AlertTriangle}
      tone="coral"
    />
  </div>
)
```

### PendingHandoffsCard

```jsx
() => (
  <div style={{ padding: 16, maxWidth: 280 }}>
    <DashboardCard
      label="Pending Handoffs"
      value="5"
      detail="From last night's SafeNight sessions"
      icon={Clock}
      tone="amber"
    />
  </div>
)
```

### ResolvedCard

```jsx
() => (
  <div style={{ padding: 16, maxWidth: 280 }}>
    <DashboardCard
      label="Resolved This Week"
      value="34"
      detail="Cases closed with positive outcomes"
      icon={CheckCircle}
      tone="slate"
    />
  </div>
)
```

### CardGrid

```jsx
() => (
  <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 580 }}>
    <DashboardCard label="Active Cases" value="12" detail="3 require follow-up" icon={Users} tone="pine" />
    <DashboardCard label="Escalated" value="2" detail="Review immediately" icon={AlertTriangle} tone="coral" />
    <DashboardCard label="Pending Handoffs" value="5" detail="From last night" icon={Clock} tone="amber" />
    <DashboardCard label="Resolved" value="34" detail="This week" icon={CheckCircle} tone="slate" />
  </div>
)
```
