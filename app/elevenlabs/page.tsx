'use client';

import { useEffect, useState } from 'react';
import ElevenLabsClient from './Client';

export default function ElevenLabsPage() {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const response = await fetch('/api/elevenlabs/token');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        setSignedUrl(data.signedUrl);
      } catch (e: unknown) {
        setError((e as Error)?.message || 'Failed to fetch ElevenLabs signed URL');
      } finally {
        setLoading(false);
      }
    };

    fetchToken();
  }, []);

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold text-center">ElevenLabs Voice Chat</h1>
        <div className="card p-4 text-center">
          <p className="muted">Loading voice chat...</p>
        </div>
      </main>
    );
  }

  if (error || !signedUrl) {
    return (
      <main className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold text-center">ElevenLabs Voice Chat</h1>
        <div className="card p-4">
          <p className="muted">Failed to initialize voice chat</p>
          <p className="text-sm mt-2" style={{ color: '#b91c1c' }}>{error}</p>
          {error?.includes('credentials') && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-800 mb-2">To fix this:</p>
              <ol className="list-decimal ml-5 text-xs text-blue-700 space-y-1">
                <li>Visit <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" className="underline">ElevenLabs</a> and create an account</li>
                <li>Create a Conversational AI agent and copy the Agent ID</li>
                <li>Copy your API key from your profile settings</li>
                <li>Update <code className="bg-blue-100 px-1 rounded">.env.local</code> with real values</li>
                <li>Restart your development server</li>
              </ol>
            </div>
          )}
        </div>
      </main>
    );
  }

  return <ElevenLabsClient signedUrl={signedUrl} />;
}
