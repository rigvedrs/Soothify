"use client";

import { useState } from "react";

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

export default function TavusVideoCompanion() {
  const [conversation, setConversation] = useState<TavusConversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startConversation() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/tavus/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationName: "Soothify Video Companion",
          customGreeting: "Hi, I am here with you. How are you feeling right now?",
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

  async function endConversation() {
    if (!conversation) return;

    setEnding(true);
    setError(null);

    try {
      await fetch(`/api/tavus/conversations/${conversation.conversation_id}/end`, {
        method: "POST",
      });
    } finally {
      setConversation(null);
      setEnding(false);
    }
  }

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
