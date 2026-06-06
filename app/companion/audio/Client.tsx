"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import lottie from "lottie-web";
import { ConversationProvider, useConversation } from "@elevenlabs/react";

function Visualizer() {
  const { status, getOutputByteFrequencyData } = useConversation();
  const lottieContainerRef = useRef<HTMLDivElement | null>(null);
  const lottieAnimRef = useRef<ReturnType<typeof lottie.loadAnimation> | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const resp = await fetch("/media/voice.json");
        const data = await resp.json();
        if (cancelled || !lottieContainerRef.current) return;

        lottieAnimRef.current = lottie.loadAnimation({
          container: lottieContainerRef.current,
          renderer: "svg",
          loop: true,
          autoplay: true,
          animationData: data,
        });
        lottieAnimRef.current.setSpeed(0.8);
      } catch {}
    })();

    return () => {
      cancelled = true;
      try {
        lottieAnimRef.current?.destroy();
      } catch {}
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    if (status !== "connected") {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lottieAnimRef.current?.setSpeed(0.8);
      if (lottieContainerRef.current) lottieContainerRef.current.style.transform = "scale(1)";
      return;
    }

    const tick = () => {
      const data = getOutputByteFrequencyData();
      if (data?.length) {
        const avg = data.reduce((a, b) => a + b, 0) / data.length / 255;
        lottieAnimRef.current?.setSpeed(0.6 + avg * 2);
        if (lottieContainerRef.current) {
          const scale = 1 + Math.min(0.35, avg * 0.8);
          lottieContainerRef.current.style.transform = `scale(${scale})`;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [status, getOutputByteFrequencyData]);

  return (
    <div className="flex justify-center">
      <div ref={lottieContainerRef} className="h-[220px] w-[220px]" />
    </div>
  );
}

function AudioSession({ signedUrl }: { signedUrl: string }) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { startSession, endSession, status } = useConversation({
    onConnect: () => {
      setConnecting(false);
    },
    onDisconnect: () => {
      setConnecting(false);
    },
    onError: (message) => {
      setError(typeof message === "string" ? message : "Connection error");
      setConnecting(false);
    },
  });

  const isConnected = status === "connected";

  const onStart = useCallback(async () => {
    setError(null);
    setConnecting(true);

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await startSession({ signedUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
      setConnecting(false);
    }
  }, [startSession, signedUrl]);

  const onStop = useCallback(async () => {
    setError(null);
    await endSession();
  }, [endSession]);

  return (
    <main className="mx-auto max-w-2xl space-y-5">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Audio Companion</h1>
        <p className="muted mt-2">Start an ElevenLabs voice session.</p>
      </div>

      <div className="card p-6 space-y-4">
        <Visualizer />

        <div className="flex justify-center gap-2">
          <button className="btn btn-primary" disabled={isConnected || connecting} onClick={onStart}>
            {connecting ? "Connecting..." : "Start Audio"}
          </button>
          <button className="btn btn-outline" disabled={!isConnected} onClick={onStop}>
            Stop
          </button>
        </div>

        <p className="text-center text-sm muted">
          Status: {isConnected ? "Connected" : connecting ? "Connecting" : "Disconnected"}
        </p>

        {error && <p className="text-center text-sm text-red-600">{error}</p>}
      </div>
    </main>
  );
}

export default function ElevenLabsAudioClient({ signedUrl }: { signedUrl: string }) {
  return (
    <ConversationProvider>
      <AudioSession signedUrl={signedUrl} />
    </ConversationProvider>
  );
}
