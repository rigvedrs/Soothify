import Link from "next/link";

export default function Companion() {
  return (
    <main className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Companion</h1>
        <p className="muted mt-2">Choose how you want to start this session.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/companion/video" className="card p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Video companion</h2>
              <p className="muted mt-2 text-sm">Start a Tavus video conversation.</p>
            </div>
            <span className="text-2xl" aria-hidden="true">→</span>
          </div>
        </Link>

        <Link href="/companion/audio" className="card p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Audio companion</h2>
              <p className="muted mt-2 text-sm">Start an ElevenLabs voice conversation.</p>
            </div>
            <span className="text-2xl" aria-hidden="true">→</span>
          </div>
        </Link>
      </div>
    </main>
  );
}
