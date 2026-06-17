import { SendHorizonal } from "lucide-react";

type MessageInputProps = {
  defaultValue?: string;
};

export function MessageInput({ defaultValue }: MessageInputProps) {
  return (
    <form className="flex items-end gap-3 border-t border-slate-200 bg-white p-4">
      <label className="sr-only" htmlFor="message">
        Message SafeNight
      </label>
      <textarea
        id="message"
        name="message"
        rows={2}
        defaultValue={defaultValue}
        placeholder="Type a message..."
        className="min-h-12 flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm leading-6 text-ink outline-none transition placeholder:text-slate-400 focus:border-pine focus:ring-2 focus:ring-pine/15"
      />
      <button
        type="button"
        aria-label="Send message"
        className="grid h-11 w-11 place-items-center rounded-lg bg-pine text-white transition hover:bg-pine/90"
      >
        <SendHorizonal aria-hidden="true" className="h-5 w-5" />
      </button>
    </form>
  );
}
