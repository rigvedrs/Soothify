"use client";

import { useCallback, useEffect, useState } from "react";

type TavusConversation = {
  conversation_id: string;
  conversation_name?: string;
  conversation_url: string;
  status: "active" | "ended" | string;
  created_at?: string;
};

type TavusApiResponse = {
  success: boolean;
  data?: TavusConversation;
  error?: string;
};

type CompanionSessionResponse = {
  success: boolean;
  data?: {
    session: { sessionId: string };
    recallContext: string[];
  };
  error?: string;
};

export default function TavusVideoCompanion() {
  const [conversation, setConversation] = useState<TavusConversation | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startConversation() {
    setLoading(true);
    setError(null);

    try {
      const sessionResponse = await fetch("/api/companion/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "tavus", mode: "video" }),
      });
      const sessionPayload = (await sessionResponse.json()) as CompanionSessionResponse;
      if (!sessionResponse.ok || !sessionPayload.success || !sessionPayload.data) {
        throw new Error(sessionPayload.error || "Unable to create Soothify session");
      }
      setSessionId(sessionPayload.data.session.sessionId);

      const response = await fetch("/api/tavus/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationName: "Soothify Video Companion",
          customGreeting: "Hi, I am here with you. How are you feeling right now?",
          sessionId: sessionPayload.data.session.sessionId,
          recallContext: sessionPayload.data.recallContext,
        }),
      });

      const payload = (await response.json()) as TavusApiResponse;
      if (!response.ok || !payload.success || !payload.data?.conversation_url) {
        throw new Error(payload.error || "Unable to start Tavus conversation");
      }

      setConversation(payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start Tavus conversation");
    } finally {
      setLoading(false);
    }
  }

  const finalizeConversation = useCallback(
    async (conversationToEnd: TavusConversation, shouldEndTavus: boolean) => {
      setEnding(true);
      setError(null);

      try {
        if (shouldEndTavus) {
          await fetch(`/api/tavus/conversations/${conversationToEnd.conversation_id}/end`, {
            method: "POST",
          });
        }
        if (sessionId) {
          await fetch(`/api/companion/sessions/${sessionId}/end`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              outcome: "unfinished",
              summary: "Video companion session ended.",
              tavusConversationId: conversationToEnd.conversation_id,
            }),
          });
        }
      } finally {
        setConversation(null);
        setSessionId(null);
        setEnding(false);
      }
    },
    [sessionId]
  );

  async function endConversation() {
    if (!conversation) return;
    await finalizeConversation(conversation, true);
  }

  useEffect(() => {
    if (!conversation || ending) return;

    const interval = window.setInterval(async () => {
      const response = await fetch(`/api/tavus/conversations/${conversation.conversation_id}`);
      const payload = (await response.json().catch(() => ({}))) as TavusApiResponse;
      if (response.ok && payload.success && payload.data?.status === "ended") {
        window.clearInterval(interval);
        await finalizeConversation(conversation, false);
      }
    }, 10000);

    return () => window.clearInterval(interval);
  }, [conversation, ending, finalizeConversation]);

  return (
    <main className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Video Companion</h1>
          <p className="muted mt-2">Launch a Tavus conversation from Soothify.</p>
        </div>

        <div className="flex gap-2">
          {!conversation && (
            <button className="btn btn-primary" disabled={loading} onClick={startConversation}>
              {loading ? "Starting..." : "Start Video"}
            </button>
          )}
          {conversation && (
            <button className="btn btn-outline" disabled={ending} onClick={endConversation}>
              {ending ? "Leaving..." : "Leave"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!conversation && !error && (
        <div className="card p-6">
          <h2 className="text-lg font-medium">Ready when you are</h2>
          <p className="muted mt-2 text-sm">
            Starting creates a Tavus CVI session and embeds the returned conversation room here.
          </p>
        </div>
      )}

      {conversation && (
        <section className="space-y-3">
          <div className="flex flex-col gap-2 rounded-lg border bg-white p-3 text-sm md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-medium">Status: {conversation.status}</p>
              <p className="muted">Conversation ID: {conversation.conversation_id}</p>
            </div>
            <a
              className="btn btn-outline"
              href={conversation.conversation_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Room
            </a>
          </div>

          <div className="overflow-hidden rounded-lg border bg-white">
            <iframe
              title="Tavus video companion"
              src={conversation.conversation_url}
              allow="camera; microphone; fullscreen; display-capture; autoplay"
              className="h-[72vh] w-full"
            />
          </div>
        </section>
      )}
    </main>
  );
}
