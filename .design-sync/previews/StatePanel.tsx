import { StatePanel } from '@signalbridge/web';

export const Loading = () => (
  <div style={{ padding: 16, maxWidth: 600 }}>
    <StatePanel
      variant="loading"
      title="Checking SignalBridge session"
      description="The app is confirming your role with the backend."
    />
  </div>
);

export const Empty = () => (
  <div style={{ padding: 16, maxWidth: 600 }}>
    <StatePanel
      variant="empty"
      title="No handoffs yet"
      description="SafeNight hasn't created any handoffs for this worker yet. Check back after 9 AM."
    />
  </div>
);

export const Error = () => (
  <div style={{ padding: 16, maxWidth: 600 }}>
    <StatePanel
      variant="error"
      title="Login needed"
      description="Please sign in before opening this SignalBridge workspace."
      actionHref="/login"
      actionLabel="Go to login"
    />
  </div>
);

export const EmptyCompact = () => (
  <div style={{ padding: 16, maxWidth: 400 }}>
    <StatePanel
      compact
      variant="empty"
      title="No cases assigned"
      description="You have no open cases right now."
    />
  </div>
);
