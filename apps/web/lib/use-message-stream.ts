"use client";

import { useEffect } from "react";
import { API_BASE_URL } from "@/lib/api-client";

export type StreamedMessage = {
  id: string;
  conversationId: string;
  senderType: "youth" | "ai" | "system" | "worker";
  content: string;
  safetyStatus?: string | null;
  createdAt: string;
};

/**
 * Subscribes to the server's SSE stream for a conversation and calls `onMessage`
 * for each new message (e.g. a worker's reply) the instant it lands — so the
 * youth doesn't wait for the next poll. Auth rides on the httpOnly cookie, which
 * the browser attaches to the same-origin EventSource automatically.
 *
 * This is purely additive: if the stream can't connect (older API, proxy limits)
 * the caller's existing polling still keeps the chat up to date.
 */
export function useMessageStream(
  conversationId: string | null | undefined,
  onMessage: (message: StreamedMessage) => void,
) {
  useEffect(() => {
    if (!conversationId || typeof window === "undefined" || typeof EventSource === "undefined") {
      return;
    }

    let source: EventSource | null = null;
    let closed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (closed) return;
      source = new EventSource(`${API_BASE_URL}/youth/conversations/${conversationId}/stream`, {
        withCredentials: true,
      });

      source.onmessage = (event) => {
        if (!event.data) return;
        try {
          onMessage(JSON.parse(event.data) as StreamedMessage);
        } catch {
          /* ignore malformed frames */
        }
      };

      // The server closes each connection after ~45s; reconnect after a short delay.
      source.onerror = () => {
        source?.close();
        if (closed) return;
        reconnectTimer = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      source?.close();
    };
  }, [conversationId, onMessage]);
}
