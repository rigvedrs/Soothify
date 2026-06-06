'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import lottie from 'lottie-web';
import { ConversationProvider, useConversation } from '@elevenlabs/react';

function Visualizer() {
  const { status, getOutputByteFrequencyData } = useConversation();
  const lottieContainerRef = useRef<HTMLDivElement | null>(null);
  const lottieAnimRef = useRef<ReturnType<typeof lottie.loadAnimation> | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch('/media/hume.json');
        const data = await resp.json();
        if (cancelled) return;
        if (lottieContainerRef.current) {
          lottieAnimRef.current = lottie.loadAnimation({
            container: lottieContainerRef.current,
            renderer: 'svg',
            loop: true,
            autoplay: true,
            animationData: data,
          });
          lottieAnimRef.current.setSpeed(0.8);
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
      try { lottieAnimRef.current?.destroy(); } catch {}
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    if (status !== 'connected') {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (lottieAnimRef.current) lottieAnimRef.current.setSpeed(0.8);
      if (lottieContainerRef.current) lottieContainerRef.current.style.transform = 'scale(1)';
      return;
    }

    const tick = () => {
      const data = getOutputByteFrequencyData();
      if (data && data.length > 0) {
        const avg = data.reduce((a, b) => a + b, 0) / data.length / 255;
        const anim = lottieAnimRef.current;
        if (anim) {
          anim.setSpeed(0.6 + avg * 2.0);
          if (lottieContainerRef.current) {
            const scale = 1 + Math.min(0.35, avg * 0.8);
            lottieContainerRef.current.style.transform = `scale(${scale})`;
          }
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
      <div ref={lottieContainerRef} style={{ width: 220, height: 220 }} />
    </div>
  );
}

function Inner({ signedUrl }: { signedUrl: string }) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { startSession, endSession, status } = useConversation({
    onConnect: () => {
      console.log('[elevenlabs] connected');
      setConnecting(false);
    },
    onDisconnect: () => {
      console.log('[elevenlabs] disconnected');
      setConnecting(false);
    },
    onError: (message) => {
      console.error('[elevenlabs] error', message);
      setError(typeof message === 'string' ? message : 'Connection error');
      setConnecting(false);
    },
  });

  const isConnected = status === 'connected';

  const onStart = useCallback(async () => {
    setError(null);
    setConnecting(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      console.warn('[elevenlabs] mic permission denied', e);
    }
    try {
      startSession({ signedUrl });
    } catch (e: unknown) {
      console.error('[elevenlabs] startSession error', e);
      setError((e as Error)?.message || 'Failed to connect');
      setConnecting(false);
    }
  }, [startSession, signedUrl]);

  const onStop = useCallback(() => {
    setError(null);
    endSession();
  }, [endSession]);

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold text-center">ElevenLabs Voice Chat</h1>
      <Visualizer />
      <div className="flex gap-2 justify-center">
        <button
          className={`px-4 py-2 rounded font-medium ${isConnected || connecting ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-500 text-white hover:bg-indigo-600 cursor-pointer'}`}
          disabled={isConnected || connecting}
          onClick={onStart}
        >
          {connecting ? 'Connecting...' : 'Start Chat'}
        </button>
        <button
          className={`px-4 py-2 rounded font-medium ${isConnected ? 'bg-red-500 text-white hover:bg-red-600 cursor-pointer' : 'bg-slate-400 cursor-not-allowed'}`}
          disabled={!isConnected}
          onClick={onStop}
        >
          Stop Chat
        </button>
      </div>
      <div className="text-center text-xs text-gray-600">
        <p>Status: <span className="font-mono">{isConnected ? '🟢 Connected' : connecting ? '🟡 Connecting' : '🔴 Disconnected'}</span></p>
      </div>
      <p className="text-center text-xs muted">Tip: allow microphone access and speak within ~30s to keep the session alive.</p>
      {error && (
        <div className="text-center">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
    </main>
  );
}

export default function ElevenLabsClient({ signedUrl }: { signedUrl: string }) {
  return (
    <ConversationProvider>
      <Inner signedUrl={signedUrl} />
    </ConversationProvider>
  );
}
