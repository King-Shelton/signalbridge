export type RiskLevel = "high" | "medium" | "low";

export type WorkerYouthCase = {
  id: string;
  youthName: string;
  channel: string;
  riskLevel: RiskLevel;
  lastActive: string;
  suggestedAction: string;
  status: string;
  handoffId: string;
  concern: string;
  keyQuote: string;
  emotionalState: string;
  workerResponse: string;
  background: string;
  supportStyle: string;
  helpfulApproaches: string[];
  signalNotes: string[];
};

export const workerYouthCases: WorkerYouthCase[] = [
  {
    id: "mira",
    youthName: "Mira Tan",
    channel: "Web Chat",
    riskLevel: "high",
    lastActive: "11:42 PM yesterday",
    suggestedAction: "Open handoff brief and check school safety",
    status: "Needs follow-up",
    handoffId: "handoff-mira-001",
    concern: "Cyberbullying involving edited photos in a class group chat",
    keyQuote: "I'm so tired of explaining this.",
    emotionalState: "Tired, embarrassed, and reluctant to repeat the story",
    workerResponse:
      "Hi Mira, I read the note you allowed SignalBridge to prepare. You don't have to repeat everything unless you want to. I'm here now. Can I first check whether you feel safe going to school today?",
    background:
      "Mira reached out after-hours after seeing her photos edited and shared in a class group chat.",
    supportStyle: "Gentle, direct, and low-pressure",
    helpfulApproaches: [
      "Acknowledge the edited-photo bullying plainly",
      "Check immediate school safety before going into details",
      "Offer choices so she keeps control of the pace"
    ],
    signalNotes: [
      "After-hours message",
      "Cyberbullying",
      "School avoidance",
      "Unresolved handoff"
    ]
  },
  {
    id: "jay",
    youthName: "Jay Lim",
    channel: "WhatsApp",
    riskLevel: "medium",
    lastActive: "Yesterday, 9:10 PM",
    suggestedAction: "Review escalation note and confirm next contact window",
    status: "Awaiting worker reply",
    handoffId: "handoff-jay-001",
    concern: "Peer conflict and stress from repeated late-night messages",
    keyQuote: "I don't know if I should reply anymore.",
    emotionalState: "Uneasy, guarded, and unsure what to do next",
    workerResponse:
      "Thanks for letting SignalBridge hold this for you. Let's work out the safest next step together when you're ready.",
    background:
      "Jay has been getting pressured by friends in a group chat and is worried about making things worse.",
    supportStyle: "Calm, practical, and reassuring",
    helpfulApproaches: [
      "Clarify whether the concern is safety, conflict, or overwhelm",
      "Offer a simple follow-up plan with one next action",
      "Avoid asking for the full story twice"
    ],
    signalNotes: ["Repeated messages", "Peer pressure", "No immediate self-harm indicators"]
  },
  {
    id: "dan",
    youthName: "Dan Ng",
    channel: "Instagram DM",
    riskLevel: "medium",
    lastActive: "Today, 7:15 AM",
    suggestedAction: "Check on morning mood and whether school support is needed",
    status: "In queue",
    handoffId: "handoff-dan-001",
    concern: "Sleep disruption and rising anxiety after online teasing",
    keyQuote: "I barely slept and now I can't focus.",
    emotionalState: "Tense, tired, and mentally overloaded",
    workerResponse:
      "I saw the note you agreed to share. We can keep this simple and focus on what you need this morning.",
    background:
      "Dan woke up still stuck on a message thread that spiraled late into the night.",
    supportStyle: "Short check-ins and concrete next steps",
    helpfulApproaches: [
      "Use short questions rather than long forms",
      "Offer a brief grounding check before planning",
      "Track whether school attendance needs support"
    ],
    signalNotes: ["Morning escalation", "Poor sleep", "Anxiety"]
  },
  {
    id: "afiq",
    youthName: "Afiq Rahman",
    channel: "Telegram",
    riskLevel: "low",
    lastActive: "Today, 8:40 AM",
    suggestedAction: "Send a warm check-in and monitor for changes",
    status: "Stable",
    handoffId: "handoff-afiq-001",
    concern: "Routine check-in after a quiet evening",
    keyQuote: "I'm okay, just busy with school stuff.",
    emotionalState: "Settled and responsive",
    workerResponse:
      "Thanks for the update, Afiq. I'll keep this light unless anything changes, and you can tell me if you want more support.",
    background:
      "Afiq has been consistent in messaging and is not showing current escalation signs.",
    supportStyle: "Light-touch and responsive",
    helpfulApproaches: [
      "Keep contact brief unless he asks for more",
      "Watch for subtle tone changes over time",
      "Respect his current stability"
    ],
    signalNotes: ["Low urgency", "Consistent activity", "No current handoff pressure"]
  },
  {
    id: "leanne",
    youthName: "Leanne Tan",
    channel: "SMS",
    riskLevel: "low",
    lastActive: "Yesterday, 6:55 PM",
    suggestedAction: "Close the loop with a supportive follow-up note",
    status: "Logged",
    handoffId: "handoff-leanne-001",
    concern: "Quiet check-in after a support session",
    keyQuote: "Thanks for checking in.",
    emotionalState: "Calm and settled",
    workerResponse:
      "I got your update, Leanne. I am noting that things are steady for now and I will check back in as agreed.",
    background:
      "Leanne recently completed a support touchpoint and is currently stable.",
    supportStyle: "Respectful, tidy follow-through",
    helpfulApproaches: [
      "Keep the record simple and current",
      "Confirm the next agreed follow-up",
      "Leave space for her to reach out first"
    ],
    signalNotes: ["Low risk", "No escalation", "Routine follow-up"]
  }
];

export function getWorkerCaseById(id: string) {
  return workerYouthCases.find((item) => item.id === id);
}

export function countByRisk(risk: RiskLevel) {
  return workerYouthCases.filter((item) => item.riskLevel === risk).length;
}
