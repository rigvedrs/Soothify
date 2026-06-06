"use client";

import { useEffect, useState } from "react";

type DashboardSummary = {
  userId: string;
  today: {
    sessions: number;
    stressMoments: number;
    averageOutcome: string;
    recentHelpfulMethod: string | null;
  };
  whatHelps: string[];
  recurringStressors: string[];
  companionNotes: string[];
  sessions: Array<Record<string, string>>;
};

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch("/api/dashboard/summary?userId=demo-user");
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload.error || "Unable to load dashboard");
        setSummary(payload.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl space-y-5">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <div className="card p-6 muted">Loading memory insights...</div>
      </main>
    );
  }

  if (error || !summary) {
    return (
      <main className="mx-auto max-w-6xl space-y-5">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error || "No dashboard data available"}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="muted mt-2">Personal patterns your companion can use next time.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="card p-4">
          <p className="text-sm muted">Sessions</p>
          <p className="mt-2 text-3xl font-semibold">{summary.today.sessions}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm muted">Stress Moments</p>
          <p className="mt-2 text-3xl font-semibold">{summary.today.stressMoments}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm muted">Recent Outcome</p>
          <p className="mt-2 text-xl font-semibold capitalize">{summary.today.averageOutcome.replace("_", " ")}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm muted">Recently Helpful</p>
          <p className="mt-2 text-base font-medium">{summary.today.recentHelpfulMethod ?? "No pattern yet"}</p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Panel title="What Helps" items={summary.whatHelps} empty="Helpful methods will appear after sessions." />
        <Panel title="Recurring Stressors" items={summary.recurringStressors} empty="Stress patterns will appear here." />
        <Panel title="Companion Notes" items={summary.companionNotes} empty="Memory notes will appear after extraction." />
      </section>

      <section className="card p-4">
        <h2 className="text-lg font-semibold">Recent Sessions</h2>
        <div className="mt-3 space-y-3">
          {summary.sessions.length === 0 ? (
            <p className="muted">No sessions yet.</p>
          ) : (
            summary.sessions.map((session) => (
              <div key={session.sessionId} className="rounded-md border p-3">
                <p className="font-medium">
                  {session.provider} · {session.mode}
                </p>
                <p className="muted mt-1 text-sm">{session.summary || session.outcome || "Session saved"}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

function Panel({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <section className="card p-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {items.length === 0 ? (
        <p className="muted mt-3">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm">
          {items.map((item) => (
            <li key={item} className="rounded-md bg-gray-50 p-2">
              {item}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
