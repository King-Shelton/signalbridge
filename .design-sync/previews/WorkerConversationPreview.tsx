import { WorkerConversationPreview } from '@signalbridge/web';

const highRiskCase = {
  id: 'case-001',
  youthName: 'Mira K.',
  channel: 'WhatsApp' as const,
  riskLevel: 'high' as const,
  riskScore: 87,
  lastActive: '2 hours ago',
  suggestedAction: 'Call within the hour — youth expressed thoughts of self-harm during last session.',
  status: 'Needs immediate follow-up',
  handoffId: 'ho-2024-001',
  conversationSource: 'mock-seed' as const,
  concern: 'Self-harm ideation and family conflict',
  keyQuote: "I don't see the point anymore. My mum doesn't even care.",
  emotionalState: 'Distressed, withdrawn',
  workerResponse: 'Acknowledged the pain, validated feelings, provided crisis line',
  whatAiDid: 'Listened, reflected emotions, created handoff brief',
  whatNotToRepeat: 'Do not ask about the argument again tonight',
  recommendedNextStep: 'Check in on housing options and safety plan',
  background: 'Ongoing family conflict, first SafeNight contact',
  supportStyle: 'Gentle, non-directive',
  conversationPreview: [
    { sender: 'youth' as const, author: 'Mira', message: "I had a huge fight with my mum. I don't know where I'm going to sleep.", timestamp: '11:38 PM' },
    { sender: 'assistant' as const, author: 'SafeNight', message: "I'm really glad you reached out. Let's figure out tonight together.", timestamp: '11:39 PM' },
    { sender: 'youth' as const, author: 'Mira', message: "I just feel like nobody cares about me.", timestamp: '11:41 PM' },
    { sender: 'system' as const, author: 'System', message: 'Risk level elevated — worker handoff created.', timestamp: '11:42 PM' },
  ],
};

const mediumRiskCase = {
  id: 'case-002',
  youthName: 'Jordan T.',
  channel: 'Instagram' as const,
  riskLevel: 'medium' as const,
  riskScore: 54,
  lastActive: '5 hours ago',
  suggestedAction: 'Send a check-in message by noon — youth is stable but isolated.',
  status: 'Monitor — follow up by noon',
  handoffId: 'ho-2024-002',
  conversationSource: 'api-ready' as const,
  concern: 'Social isolation and school stress',
  keyQuote: "I just feel like I don't fit in anywhere.",
  emotionalState: 'Anxious, lonely',
  workerResponse: 'Normalised their experience, explored peer connections',
  whatAiDid: 'Active listening, psychoeducation on anxiety',
  whatNotToRepeat: 'Avoid suggesting group activities right now',
  recommendedNextStep: 'Explore online communities that align with their interests',
  background: 'New to the city, recently started at a new school',
  supportStyle: 'Warm, curious',
  conversationPreview: [
    { sender: 'youth' as const, author: 'Jordan', message: "School is so hard. I don't know anyone.", timestamp: '9:15 PM' },
    { sender: 'assistant' as const, author: 'SafeNight', message: "Starting somewhere new is genuinely hard. What's the hardest part right now?", timestamp: '9:16 PM' },
    { sender: 'youth' as const, author: 'Jordan', message: "Everyone already has their friend groups. I feel invisible.", timestamp: '9:18 PM' },
  ],
};

export const HighRiskCase = () => (
  <div style={{ padding: 16, maxWidth: 700 }}>
    <WorkerConversationPreview youth={highRiskCase} />
  </div>
);

export const MediumRiskCase = () => (
  <div style={{ padding: 16, maxWidth: 700 }}>
    <WorkerConversationPreview youth={mediumRiskCase} />
  </div>
);
