export type RiskLevel = "high" | "medium" | "low";

export type ChannelLabel = "WhatsApp" | "Instagram" | "GatherTown" | "Discord" | "Web Chat";
export type ConversationSource = "mock-seed" | "api-ready";

export const channelLabels: Record<ChannelLabel, string> = {
  WhatsApp: "WhatsApp",
  Instagram: "Instagram",
  GatherTown: "GatherTown",
  Discord: "Discord",
  "Web Chat": "Web Chat"
};

export type ConversationTurn = {
  sender: "youth" | "worker" | "system";
  author: string;
  message: string;
  timestamp: string;
};

export type WorkerYouthCase = {
  id: string;
  youthName: string;
  channel: ChannelLabel;
  riskLevel: RiskLevel;
  riskScore: number;
  lastActive: string;
  suggestedAction: string;
  status: string;
  handoffId: string;
  conversationSource: ConversationSource;
  concern: string;
  keyQuote: string;
  emotionalState: string;
  workerResponse: string;
  whatAiDid: string;
  whatNotToRepeat: string;
  recommendedNextStep: string;
  background: string;
  supportStyle: string;
  helpfulApproaches: string[];
  signalNotes: string[];
  conversationPreview: ConversationTurn[];
};

export const workerYouthCases: WorkerYouthCase[] = [
  {
    id: "mira",
    youthName: "Mira Tan",
    channel: "Web Chat",
    riskLevel: "high",
    riskScore: 92,
    lastActive: "11:42 PM yesterday",
    suggestedAction: "Open handoff brief and check school safety",
    status: "Needs follow-up",
    handoffId: "handoff-mira-001",
    conversationSource: "mock-seed",
    concern: "Cyberbullying involving edited photos in a class group chat",
    keyQuote: "I'm so tired of explaining this.",
    emotionalState: "Tired, embarrassed, and reluctant to repeat the story",
    workerResponse:
      "Hi Mira, I read the note you allowed SignalBridge to prepare. You don't have to repeat everything unless you want to. I'm here now. Can I first check whether you feel safe going to school today?",
    whatAiDid:
      "Validated the distress, identified cyberbullying and school avoidance as the core signals, and prepared the handoff only after consent.",
    whatNotToRepeat:
      "Do not make Mira retell the edited-photo incident unless she chooses to add more.",
    recommendedNextStep:
      "Review the handoff first thing, open with a safety check, and plan a same-day follow-up.",
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
    ],
    conversationPreview: [
      {
        sender: "system",
        author: "SignalBridge",
        message: "Approved after-hours support is active. Mira chose to share a handoff note.",
        timestamp: "11:41 PM"
      },
      {
        sender: "youth",
        author: "Mira",
        message:
          "People in my class group chat keep editing my photos. I don't want to go school tomorrow.",
        timestamp: "11:42 PM"
      },
      {
        sender: "worker",
        author: "SafeNight",
        message:
          "You do not need to repeat everything. We can start with whether school feels safe tomorrow.",
        timestamp: "11:42 PM"
      }
    ]
  },
  {
    id: "jay",
    youthName: "Jay Lim",
    channel: "WhatsApp",
    riskLevel: "medium",
    riskScore: 67,
    lastActive: "Yesterday, 9:10 PM",
    suggestedAction: "Review escalation note and confirm next contact window",
    status: "Awaiting worker reply",
    handoffId: "handoff-jay-001",
    conversationSource: "mock-seed",
    concern: "Peer conflict and stress from repeated late-night messages",
    keyQuote: "I don't know if I should reply anymore.",
    emotionalState: "Uneasy, guarded, and unsure what to do next",
    workerResponse:
      "Thanks for letting SignalBridge hold this for you. Let's work out the safest next step together when you're ready.",
    whatAiDid:
      "Captured the stress from repeated late-night messages, kept the tone calm, and queued a worker follow-up instead of escalating early.",
    whatNotToRepeat:
      "Do not push Jay for an immediate reply decision or force a long explanation twice.",
    recommendedNextStep:
      "Confirm the best contact window and decide whether the concern is conflict, pressure, or overwhelm.",
    background:
      "Jay has been getting pressured by friends in a group chat and is worried about making things worse.",
    supportStyle: "Calm, practical, and reassuring",
    helpfulApproaches: [
      "Clarify whether the concern is safety, conflict, or overwhelm",
      "Offer a simple follow-up plan with one next action",
      "Avoid asking for the full story twice"
    ],
    signalNotes: ["Repeated messages", "Peer pressure", "No immediate self-harm indicators"],
    conversationPreview: [
      {
        sender: "youth",
        author: "Jay",
        message: "I don't know if I should reply anymore.",
        timestamp: "9:10 PM"
      },
      {
        sender: "worker",
        author: "SafeNight",
        message:
          "Thanks for sending that through. We can look at the safest next step together when you're ready.",
        timestamp: "9:11 PM"
      },
      {
        sender: "system",
        author: "SignalBridge",
        message: "Conversation tagged for worker follow-up during the next contact window.",
        timestamp: "9:11 PM"
      }
    ]
  },
  {
    id: "dan",
    youthName: "Dan Ng",
    channel: "Instagram",
    riskLevel: "medium",
    riskScore: 58,
    lastActive: "Today, 7:15 AM",
    suggestedAction: "Check on morning mood and whether school support is needed",
    status: "In queue",
    handoffId: "handoff-dan-001",
    conversationSource: "mock-seed",
    concern: "Sleep disruption and rising anxiety after online teasing",
    keyQuote: "I barely slept and now I can't focus.",
    emotionalState: "Tense, tired, and mentally overloaded",
    workerResponse:
      "I saw the note you agreed to share. We can keep this simple and focus on what you need this morning.",
    whatAiDid:
      "Noted the sleep disruption and anxiety, flagged the morning timing, and kept the handoff short so the worker can act quickly.",
    whatNotToRepeat: "Do not turn the morning check-in into a long questionnaire.",
    recommendedNextStep:
      "Check on school readiness, offer a brief grounding step, and document whether support is needed before class.",
    background:
      "Dan woke up still stuck on a message thread that spiraled late into the night.",
    supportStyle: "Short check-ins and concrete next steps",
    helpfulApproaches: [
      "Use short questions rather than long forms",
      "Offer a brief grounding check before planning",
      "Track whether school attendance needs support"
    ],
    signalNotes: ["Morning escalation", "Poor sleep", "Anxiety"],
    conversationPreview: [
      {
        sender: "youth",
        author: "Dan",
        message: "I barely slept and now I can't focus.",
        timestamp: "7:15 AM"
      },
      {
        sender: "worker",
        author: "SafeNight",
        message: "Let's keep this simple this morning. Are you safe to get ready for school?",
        timestamp: "7:16 AM"
      },
      {
        sender: "system",
        author: "SignalBridge",
        message: "Instagram conversation surfaced as a morning follow-up case.",
        timestamp: "7:16 AM"
      }
    ]
  },
  {
    id: "afiq",
    youthName: "Afiq Rahman",
    channel: "GatherTown",
    riskLevel: "low",
    riskScore: 24,
    lastActive: "Today, 8:40 AM",
    suggestedAction: "Send a warm check-in and monitor for changes",
    status: "Stable",
    handoffId: "handoff-afiq-001",
    conversationSource: "mock-seed",
    concern: "Routine check-in after a quiet evening",
    keyQuote: "I'm okay, just busy with school stuff.",
    emotionalState: "Settled and responsive",
    workerResponse:
      "Thanks for the update, Afiq. I'll keep this light unless anything changes, and you can tell me if you want more support.",
    whatAiDid:
      "Tagged the conversation as stable, captured the low-risk tone, and preserved a light-touch follow-up path.",
    whatNotToRepeat: "Do not over-interpret a routine check-in as an escalation.",
    recommendedNextStep: "Send a warm check-in and keep monitoring for changes.",
    background:
      "Afiq has been consistent in messaging and is not showing current escalation signs.",
    supportStyle: "Light-touch and responsive",
    helpfulApproaches: [
      "Keep contact brief unless he asks for more",
      "Watch for subtle tone changes over time",
      "Respect his current stability"
    ],
    signalNotes: ["Low urgency", "Consistent activity", "No current handoff pressure"],
    conversationPreview: [
      {
        sender: "system",
        author: "SignalBridge",
        message: "GatherTown check-in captured from the approved support space.",
        timestamp: "8:39 AM"
      },
      {
        sender: "youth",
        author: "Afiq",
        message: "I'm okay, just busy with school stuff.",
        timestamp: "8:40 AM"
      },
      {
        sender: "worker",
        author: "Worker",
        message: "Sounds steady. I will keep the follow-up light unless you need more support.",
        timestamp: "8:40 AM"
      }
    ]
  },
  {
    id: "leanne",
    youthName: "Leanne Tan",
    channel: "Discord",
    riskLevel: "low",
    riskScore: 18,
    lastActive: "Yesterday, 6:55 PM",
    suggestedAction: "Close the loop with a supportive follow-up note",
    status: "Logged",
    handoffId: "handoff-leanne-001",
    conversationSource: "api-ready",
    concern: "Quiet check-in after a support session",
    keyQuote: "Thanks for checking in.",
    emotionalState: "Calm and settled",
    workerResponse:
      "I got your update, Leanne. I am noting that things are steady for now and I will check back in as agreed.",
    whatAiDid:
      "Logged the routine follow-up, captured the calm tone, and kept the path ready for an API-backed sync.",
    whatNotToRepeat:
      "Do not reopen the session with unnecessary detail once things are stable.",
    recommendedNextStep:
      "Close the loop, confirm the next follow-up time, and keep the note concise.",
    background:
      "Leanne recently completed a support touchpoint and is currently stable.",
    supportStyle: "Respectful, tidy follow-through",
    helpfulApproaches: [
      "Keep the record simple and current",
      "Confirm the next agreed follow-up",
      "Leave space for her to reach out first"
    ],
    signalNotes: ["Low risk", "No escalation", "Routine follow-up"],
    conversationPreview: [
      {
        sender: "system",
        author: "SignalBridge",
        message: "Discord thread is tagged as API-ready for Day 5 live conversation sync.",
        timestamp: "6:54 PM"
      },
      {
        sender: "youth",
        author: "Leanne",
        message: "Thanks for checking in.",
        timestamp: "6:55 PM"
      },
      {
        sender: "worker",
        author: "Worker",
        message: "Noted. I will log that things are steady and follow up as agreed.",
        timestamp: "6:55 PM"
      }
    ]
  }
];

export function getWorkerCaseById(id: string) {
  return workerYouthCases.find((item) => item.id === id);
}

export function countByRisk(risk: RiskLevel) {
  return workerYouthCases.filter((item) => item.riskLevel === risk).length;
}
