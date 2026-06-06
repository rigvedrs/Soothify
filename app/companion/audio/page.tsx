"use client";

import { useEffect, useState } from "react";
import ElevenLabsAudioClient from "./Client";

export default function AudioCompanionPage() {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSignedUrl = async () => {
      try {
        const response = await fetch("/api/elevenlabs/token");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || data.error || `HTTP ${response.status}`);
        }

        setSignedUrl(data.signedUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to initialize ElevenLabs");
      } finally {
        setLoading(false);
      }
    };

    fetchSignedUrl();
  }, []);

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight text-center">Audio Companion</h1>
        <div className="card p-6 text-center">
          <p className="muted">Loading audio session...</p>
        </div>
      </main>
    );
  }

  if (error || !signedUrl) {
    return (
      <main className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight text-center">Audio Companion</h1>
        <div className="card p-6">
          <p className="font-medium">Failed to initialize audio companion</p>
          <p className="mt-2 text-sm text-red-600">{error}</p>
        </div>
      </main>
    );
  }

  return <ElevenLabsAudioClient signedUrl={signedUrl} />;
}
