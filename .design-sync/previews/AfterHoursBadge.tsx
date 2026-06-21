import { AfterHoursBadge } from '@signalbridge/web';

export const Default = () => (
  <div style={{ padding: 24 }}>
    <AfterHoursBadge />
  </div>
);

export const WithCustomTime = () => (
  <div style={{ padding: 24 }}>
    <AfterHoursBadge timeLabel="2:15 AM" />
  </div>
);

export const InContext = () => (
  <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
    <p style={{ margin: 0, fontSize: 14, color: '#64748b' }}>Current status</p>
    <AfterHoursBadge timeLabel="11:42 PM" />
    <p style={{ margin: 0, fontSize: 13, color: '#64748b', maxWidth: 300, lineHeight: 1.6 }}>
      SafeNight is active. Workers will receive handoffs at 9 AM.
    </p>
  </div>
);
