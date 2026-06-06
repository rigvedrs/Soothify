"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import lottie from "lottie-web";
import {
  ConversationProvider,
  useConversation,
  useConversationClientTool,
} from "@elevenlabs/react";
import { detectPanicSignals } from "@/lib/panic/detect";

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

function PanicSupportBlock({
  sourceLabel,
  usingFallbackAgent,
  showSessionControls,
  onStay,
  onSwitchToPanic,
  switching,
}: {
  sourceLabel: string;
  usingFallbackAgent: boolean;
  showSessionControls: boolean;
  onStay: () => void;
  onSwitchToPanic: () => void;
  switching: boolean;
}) {
  return (
    <section className="rounded-3xl border border-[#F1B5AE] bg-[linear-gradient(180deg,#FFF7F5_0%,#FFF1EE_100%)] p-6 shadow-[0_18px_45px_rgba(198,93,75,0.12)]">
      <div className="space-y-3">
        <span className="inline-flex rounded-full bg-[#FCE7E4] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#9F3A31]">
          Immediate support
        </span>
        <h2 className="text-2xl font-semibold tracking-tight text-[#4A1D16]">Stay with me for the next 60 seconds.</h2>
        <p className="text-sm leading-6 text-[#7A3A31]">
          I think you may be in a panic moment. Put both feet on the ground. Breathe in for 4,
          hold for 4, and breathe out for 6 while we slow this down together.
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#B45343]">Step 1</p>
          <p className="mt-2 text-sm text-[#4A1D16]">Notice 3 things you can see without moving.</p>
        </div>
        <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#B45343]">Step 2</p>
          <p className="mt-2 text-sm text-[#4A1D16]">Relax your jaw and let your shoulders drop on each exhale.</p>
        </div>
        <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#B45343]">Step 3</p>
          <p className="mt-2 text-sm text-[#4A1D16]">If you feel unsafe or at risk, call emergency services or text 988 now.</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        {showSessionControls && (
          <>
            <button
              type="button"
              onClick={onStay}
              className="inline-flex rounded-full border border-[#D8A39B] px-5 py-3 text-sm font-semibold text-[#7A3A31] transition-colors hover:border-[#C65D4B] hover:bg-white"
            >
              Stay in current session
            </button>
            <button
              type="button"
              onClick={onSwitchToPanic}
              disabled={switching}
              className="inline-flex rounded-full bg-[#C65D4B] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(198,93,75,0.25)] transition-colors hover:bg-[#B14F3E] disabled:cursor-not-allowed disabled:bg-[#D99B91]"
            >
              {switching ? "Switching..." : "Switch to Panic Support"}
            </button>
          </>
        )}
        <a
          href="sms:988"
          className="inline-flex rounded-full border border-[#D8A39B] px-5 py-3 text-sm font-semibold text-[#7A3A31] transition-colors hover:border-[#C65D4B] hover:bg-white"
        >
          Text 988
        </a>
        <Link
          href="/facilities"
          className="inline-flex rounded-full border border-[#D8A39B] px-5 py-3 text-sm font-semibold text-[#7A3A31] transition-colors hover:border-[#C65D4B] hover:bg-white"
        >
          Find nearby help
        </Link>
      </div>

      <p className="mt-4 text-center text-xs text-[#8B5A54]">
        {showSessionControls
          ? `Triggered by ${sourceLabel}. Keep the conversation going here or switch to the dedicated panic companion.`
          : "You are in the dedicated panic support session now. Stay with the grounding steps or reach out for immediate help if needed."}
      </p>

      {usingFallbackAgent && (
        <p className="mt-2 text-center text-xs text-[#8B5A54]">
          Panic support uses the default voice companion if no dedicated panic agent is configured.
        </p>
      )}
    </section>
  );
}

function AudioSession({
  signedUrl,
  mode,
  usingFallbackAgent,
}: {
  signedUrl: string;
  mode: "standard" | "panic";
  usingFallbackAgent: boolean;
}) {
  const router = useRouter();
  const [connecting, setConnecting] = useState(false);
  const [switchingToPanic, setSwitchingToPanic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panicActive, setPanicActive] = useState(mode === "panic");
  const [panicSource, setPanicSource] = useState<"route" | "transcript" | "agent_tool">(
    mode === "panic" ? "route" : "transcript"
  );
  const [panicEvidence, setPanicEvidence] = useState<string[]>([]);
  const sentPanicUpdateRef = useRef(mode === "panic");

  const handlePanicDetection = useCallback(
    (message: string) => {
      if (mode === "panic") return;

      const detection = detectPanicSignals(message);
      if (!detection.detected) return;

      setPanicActive(true);
      setPanicSource("transcript");
      setPanicEvidence(detection.evidence);
    },
    [mode]
  );

  const { startSession, endSession, status, sendContextualUpdate } = useConversation({
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
    onMessage: ({ message, role, source }) => {
      const isUserMessage = role === "user" || source === "user";
      if (!isUserMessage) return;
      handlePanicDetection(message);
    },
  });

  const isConnected = status === "connected";
  const isPanicMode = mode === "panic";
  const title = isPanicMode ? "Panic Support" : "Audio Companion";
  const subtitle = isPanicMode
    ? "You do not need to explain everything. Start talking and we will take this one step at a time."
    : "Start an ElevenLabs voice session.";
  const startLabel = isPanicMode ? "Start Panic Support" : "Start Audio";
  const panicSourceLabel =
    panicSource === "route"
      ? "the panic support entry"
      : panicSource === "agent_tool"
        ? "the ElevenLabs agent"
        : panicEvidence.length > 0
          ? `the transcript detector (${panicEvidence.join(", ")})`
          : "the transcript detector";

  useConversationClientTool("trigger_panic_support", (params) => {
    if (mode !== "panic") {
      setPanicActive(true);
      setPanicSource("agent_tool");
      const reason =
        params && typeof params === "object" && "reason" in params && typeof params.reason === "string"
          ? [params.reason]
          : [];
      setPanicEvidence(reason);
    }

    return "panic support UI shown";
  });

  useEffect(() => {
    if (!panicActive || sentPanicUpdateRef.current || !isConnected) return;

    sentPanicUpdateRef.current = true;
    sendContextualUpdate(
      "The user appears to be in an acute panic moment. Say: 'I think you may be in a panic moment. Stay with me. We'll take one breath at a time.' Keep replies under 20 words, guide breathing and grounding, and avoid broad reflective questions."
    );
  }, [isConnected, panicActive, sendContextualUpdate]);

  const onStart = useCallback(async () => {
    setError(null);
    setConnecting(true);

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await startSession({
        signedUrl,
        onMessage: ({ message, role, source }) => {
          const isUserMessage = role === "user" || source === "user";
          if (!isUserMessage) return;
          handlePanicDetection(message);
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
      setConnecting(false);
    }
  }, [handlePanicDetection, startSession, signedUrl]);

  const onStop = useCallback(async () => {
    setError(null);
    await endSession();
  }, [endSession]);

  const onStay = useCallback(() => {
    setPanicActive(true);
  }, []);

  const onSwitchToPanic = useCallback(async () => {
    setSwitchingToPanic(true);
    try {
      if (isConnected) {
        await endSession();
      }
    } finally {
      router.push("/companion/audio?mode=panic");
    }
  }, [endSession, isConnected, router]);

  return (
    <main className="mx-auto max-w-2xl space-y-5">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="muted mt-2">{subtitle}</p>
      </div>

      {(isPanicMode || panicActive) && (
        <PanicSupportBlock
          sourceLabel={panicSourceLabel}
          usingFallbackAgent={usingFallbackAgent}
          showSessionControls={!isPanicMode}
          onStay={onStay}
          onSwitchToPanic={onSwitchToPanic}
          switching={switchingToPanic}
        />
      )}

      <div className={`card p-6 space-y-4 ${isPanicMode ? "border-[#F1B5AE] bg-[#FFFDFC]" : ""}`}>
        <Visualizer />

        <div className="flex justify-center gap-2">
          <button className="btn btn-primary" disabled={isConnected || connecting} onClick={onStart}>
            {connecting ? "Connecting..." : startLabel}
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

export default function ElevenLabsAudioClient({
  signedUrl,
  mode,
  usingFallbackAgent,
}: {
  signedUrl: string;
  mode: "standard" | "panic";
  usingFallbackAgent: boolean;
}) {
  return (
    <ConversationProvider>
      <AudioSession signedUrl={signedUrl} mode={mode} usingFallbackAgent={usingFallbackAgent} />
    </ConversationProvider>
  );
}
