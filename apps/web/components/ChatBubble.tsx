import { cn } from "@/components/cn";

type Sender = "youth" | "assistant" | "system";

type ChatBubbleProps = {
  sender: Sender;
  author: string;
  children: React.ReactNode;
  timestamp?: string;
};

const senderStyles: Record<Sender, string> = {
  youth: "ml-auto bg-pine text-white",
  assistant: "mr-auto border border-slate-200 bg-white text-ink",
  system: "mx-auto border border-coral/20 bg-coral/10 text-coral"
};

export function ChatBubble({ sender, author, children, timestamp }: ChatBubbleProps) {
  const isYouth = sender === "youth";

  return (
    <article className={cn("flex max-w-[82%] flex-col gap-1", isYouth && "items-end")}>
      <div className="flex items-center gap-2 px-1 text-xs font-medium text-slate-500">
        <span>{author}</span>
        {timestamp ? <span>{timestamp}</span> : null}
      </div>
      <div
        className={cn(
          "rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm",
          senderStyles[sender],
          isYouth ? "rounded-br-md" : "rounded-bl-md"
        )}
      >
        {children}
      </div>
    </article>
  );
}
