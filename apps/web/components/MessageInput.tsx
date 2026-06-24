"use client";

import { SendHorizonal } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

type MessageInputProps = {
  defaultValue?: string;
  disabled?: boolean;
  helperText?: string;
  onSend?: (message: string) => void;
};

export function MessageInput({
  defaultValue = "",
  disabled = false,
  helperText,
  onSend
}: MessageInputProps) {
  const [message, setMessage] = useState(defaultValue);

  useEffect(() => {
    setMessage(defaultValue);
  }, [defaultValue]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedMessage = message.trim();
    if (!trimmedMessage || disabled) {
      return;
    }

    onSend?.(trimmedMessage);
    setMessage("");
  }

  return (
    <form
      className="border-t border-slate-200 bg-white p-3 sm:p-4"
      onSubmit={handleSubmit}
    >
      <div className="flex items-end gap-3">
        <label className="sr-only" htmlFor="message">
          Message SafeNight
        </label>
        <textarea
          id="message"
          name="message"
          rows={2}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          disabled={disabled}
          placeholder="Write one sentence, or share only what feels okay..."
          className="min-h-12 flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm leading-6 text-ink outline-none transition placeholder:text-slate-400 focus:border-pine focus:ring-2 focus:ring-pine/15 disabled:cursor-not-allowed disabled:bg-slate-50"
        />
        <button
          type="submit"
          disabled={disabled || !message.trim()}
          aria-label="Send message"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-pine text-white transition hover:bg-pine/90 focus:outline-none focus:ring-2 focus:ring-pine/20 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <SendHorizonal aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
      {helperText ? <p className="mt-2 text-xs leading-5 text-slate-500">{helperText}</p> : null}
    </form>
  );
}
