"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ElevenLabsAudioClient from "./Client";

export default function AudioCompanionPage() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") === "panic" ? "panic" : "standard";
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [resolvedMode, setResolvedMode] = useState<"standard" | "panic">(mode);
  const [usingFallbackAgent, setUsingFallbackAgent] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [recallContext, setRecallContext] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSignedUrl = async () => {
      try {
        const sessionResponse = await fetch("/api/companion/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: "elevenlabs", mode: "audio" }),
        });
        const sessionPayload = await sessionResponse.json();
        if (!sessionResponse.ok || !sessionPayload.success) {
          throw new Error(sessionPayload.error || "Unable to create Soothify session");
        }
        setSessionId(sessionPayload.data.session.sessionId);
        setRecallContext(sessionPayload.data.recallContext ?? []);

        const response = await fetch(`/api/elevenlabs/token?mode=${mode}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || data.error || `HTTP ${response.status}`);
        }

        setSignedUrl(data.signedUrl);
        setResolvedMode(data.mode === "panic" ? "panic" : "standard");
        setUsingFallbackAgent(Boolean(data.usingFallbackAgent));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to initialize ElevenLabs");
      } finally {
        setLoading(false);
      }
    };

    fetchSignedUrl();
  }, [mode]);

  const pageTitle = resolvedMode === "panic" ? "Panic Support" : "Audio Companion";
  const loadingCopy = resolvedMode === "panic" ? "Preparing panic support..." : "Loading audio session...";

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight text-center">{pageTitle}</h1>
        <div className="card p-6 text-center">
          <p className="muted">{loadingCopy}</p>
        </div>
      </main>
    );
  }

  if (error || !signedUrl) {
    return (
      <main className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight text-center">{pageTitle}</h1>
        <div className="card p-6">
          <p className="font-medium">Failed to initialize {resolvedMode === "panic" ? "panic support" : "audio companion"}</p>
          <p className="mt-2 text-sm text-red-600">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <ElevenLabsAudioClient
      signedUrl={signedUrl}
      mode={resolvedMode}
      usingFallbackAgent={usingFallbackAgent}
      sessionId={sessionId}
      recallContext={recallContext}
    />
  );
}
