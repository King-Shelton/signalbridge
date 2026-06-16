import { AfterHoursBadge } from "@/components/AfterHoursBadge";
import { ChatBubble } from "@/components/ChatBubble";
import { HandoffConsentCard } from "@/components/HandoffConsentCard";
import { MessageInput } from "@/components/MessageInput";

const miraMessage =
  "People in my class group chat keep editing my photos. I don't want to go school tomorrow. I'm so tired of explaining this.";

export default function YouthChatPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <p className="text-sm font-semibold text-pine">SafeNight Companion</p>
          <h1 className="text-2xl font-semibold text-ink">Mira&apos;s chat</h1>
        </div>
        <AfterHoursBadge />
      </header>

      <section className="mt-5 grid flex-1 overflow-hidden rounded-lg border border-slate-200 bg-mist/50 shadow-panel lg:grid-cols-[1fr_340px]">
        <div className="flex min-h-[680px] flex-col bg-white">
          <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
            <ChatBubble sender="system" author="SignalBridge" timestamp="11:41 PM">
              A youth worker will see approved handoff notes in the morning.
              SafeNight can stay with you after-hours.
            </ChatBubble>
            <ChatBubble sender="youth" author="Mira" timestamp="11:42 PM">
              {miraMessage}
            </ChatBubble>
            <ChatBubble sender="assistant" author="SafeNight" timestamp="11:42 PM">
              I&apos;m sorry this is happening. I can stay with you for a bit and
              help prepare a short note for your worker so you do not have to
              repeat everything tomorrow.
            </ChatBubble>
            <ChatBubble sender="assistant" author="SafeNight" timestamp="11:43 PM">
              Would you like me to create that handoff note now? You can review
              what gets shared first.
            </ChatBubble>
            <HandoffConsentCard compact />
          </div>
          <MessageInput defaultValue="Can you help me tell my worker without making me explain it again?" />
        </div>

        <aside className="border-t border-slate-200 bg-mist/60 p-5 lg:border-l lg:border-t-0">
          <h2 className="text-sm font-semibold text-ink">Detected support signals</h2>
          <div className="mt-4 grid gap-3">
            {[
              ["Cyberbullying", "Edited photos in class group chat", "High"],
              ["School worry", "Does not want to go tomorrow", "Medium"],
              ["After-hours", "Message sent outside worker hours", "High"]
            ].map(([label, detail, level]) => (
              <article key={label} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-ink">{label}</h3>
                  <span className="rounded-full bg-coral/10 px-2 py-0.5 text-xs font-semibold text-coral">
                    {level}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-600">{detail}</p>
              </article>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}
