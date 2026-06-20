export const ROLES = ["youth", "worker", "supervisor", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const CASE_STATUSES = ["open", "needs_follow_up", "escalated", "closed"] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

export const RISK_LEVELS = ["low", "medium", "high", "critical"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const CHANNEL_TYPES = ["web_chat", "whatsapp", "instagram_dm", "telegram", "sms"] as const;
export type ChannelType = (typeof CHANNEL_TYPES)[number];

export const ROLE_HOME: Record<Role, string> = {
  youth: "/youth/chat",
  worker: "/worker/cockpit",
  supervisor: "/supervisor",
  admin: "/supervisor"
};

export const DEMO_ACCOUNTS: Array<{ email: string; role: Role; label: string }> = [
  { email: "mira@signalbridge.test", role: "youth", label: "Mira" },
  { email: "worker1@signalbridge.test", role: "worker", label: "Worker" },
  { email: "supervisor@signalbridge.test", role: "supervisor", label: "Supervisor" }
];
