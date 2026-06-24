export type SignalItem = { id: string; type: string; severity: string; reason: string; source: string; createdAt: string };
export type CaseItem = { id: string; status: string; priority: string; summary?: string; createdAt?: string };
export type ConversationItem = {
  id: string; youthId: string; youthName: string; channel: string; status: string;
  riskLevel: "low" | "medium" | "high" | "critical"; riskScore: number;
  consentToHandoff: boolean; unresolvedHandoff: boolean; lastMessageAt: string;
  suggestedAction?: string; case: CaseItem | null; handoffId: string | null; signals: SignalItem[];
  messages: Array<{ id: string; senderType: string; content: string; createdAt: string }>;
};
export type Handoff = {
  id: string; conversationId: string; youthId: string; youthName: string; mainConcern: string;
  emotionalState: string; riskLevel: string; riskScore: number; keyQuote?: string;
  whatAiDid?: string; whatNotToRepeat?: string; suggestedWorkerResponse?: string;
  recommendedNextStep?: string; reviewStatus: string; createdAt: string;
};
export const caseStatuses = ["new", "needs_review", "in_progress", "followed_up", "escalated", "closed"];
export const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
export const riskClass = (risk: string) => risk === "critical" || risk === "high" ? "bg-coral/10 text-coral" : risk === "medium" ? "bg-amber/10 text-amber" : "bg-pine/10 text-pine";
