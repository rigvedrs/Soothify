import Link from "next/link";

function LogoIcon() {
  return (
    <svg width="52" height="52" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M3 4C3 2.895 3.895 2 5 2H23C24.105 2 25 2.895 25 4V18C25 19.105 24.105 20 23 20H15.5L11 26V20H5C3.895 20 3 19.105 3 18V4Z"
        fill="rgba(255,255,255,0.25)"
        stroke="white"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M14 16.5C14 16.5 7 12 7 8.5C7 6.015 9.015 4.5 11.5 4.5C12.85 4.5 14 5.6 14 5.6C14 5.6 15.15 4.5 16.5 4.5C18.985 4.5 21 6.015 21 8.5C21 12 14 16.5 14 16.5Z"
        fill="white"
      />
    </svg>
  );
}

function VoiceOrb() {
  return (
    <Link
      href="/companion"
      className="relative flex items-center justify-center w-56 h-56 group cursor-pointer"
      aria-label="Open Companion"
    >
      <span
        className="absolute inset-0 rounded-full border border-[rgba(59,130,246,0.2)]"
        style={{ animation: "ring-expand 3s ease-out infinite" }}
      />
      <span
        className="absolute inset-0 rounded-full border border-[rgba(59,130,246,0.14)]"
        style={{ animation: "ring-expand 3s ease-out infinite 1s" }}
      />
      <span
        className="absolute inset-0 rounded-full border border-[rgba(59,130,246,0.08)]"
        style={{ animation: "ring-expand 3s ease-out infinite 2s" }}
      />
      <span className="absolute w-40 h-40 rounded-full bg-[rgba(59,130,246,0.06)]" />
      <span
        className="relative w-28 h-28 rounded-full bg-gradient-to-br from-[#60A5FA] to-[#2563EB] flex items-center justify-center group-hover:from-[#93C5FD] group-hover:to-[#3B82F6] transition-all duration-300"
        style={{
          animation: "orb-pulse 2.6s ease-in-out infinite",
          boxShadow: "0 0 40px rgba(59,130,246,0.45), 0 0 80px rgba(59,130,246,0.15)",
        }}
      >
        <LogoIcon />
      </span>
    </Link>
  );
}

const features = [
  { title: "Begin Assessment", href: "/assessment", desc: "10 quick questions to personalize your journey.", icon: "📋" },
  { title: "Companion", href: "/companion", desc: "Choose audio or video support before starting.", icon: "🎙️" },
  { title: "Dashboard", href: "/dashboard", desc: "Track moods, patterns, and progress.", icon: "📊" },
  { title: "Exercises", href: "/exercises", desc: "Short practices to calm and reset.", icon: "🌿" },
  { title: "Facilities", href: "/facilities", desc: "Find nearby mental health facilities.", icon: "📍" },
  { title: "Blogs", href: "/blogs", desc: "Curated learning to support your wellness.", icon: "📖" },
];

export default function Home() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center pt-16 pb-14 px-4 space-y-8">
        <VoiceOrb />

        <div className="space-y-3">
          <h1 className="text-5xl md:text-6xl font-semibold tracking-tight text-[#0F172A]">
            Soothify
          </h1>
          <p className="text-base md:text-lg text-[#64748B] max-w-xs md:max-w-sm">
            Your pocket companion for difficult moments.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-center">
          <Link
            href="/assessment"
            className="px-7 py-3 rounded-full bg-[#3B82F6] text-white text-sm font-semibold hover:bg-[#2563EB] transition-colors shadow-[0_4px_14px_rgba(59,130,246,0.35)]"
          >
            Start Assessment
          </Link>
          <Link
            href="/companion"
            className="px-7 py-3 rounded-full border border-[#3B82F6]/30 text-[#3B82F6] text-sm hover:border-[#3B82F6] hover:bg-[rgba(59,130,246,0.05)] transition-all"
          >
            Open Companion
          </Link>
        </div>
      </section>

      {/* Feature grid */}
      <section className="w-full max-w-4xl px-4 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className="group p-5 rounded-2xl border border-[#E2E8F0] bg-white hover:border-[#3B82F6]/40 hover:bg-[#F0F7FF] transition-all shadow-sm"
            >
              <span className="text-2xl">{f.icon}</span>
              <h3 className="mt-3 text-[#0F172A] font-medium group-hover:text-[#3B82F6] transition-colors">
                {f.title}
              </h3>
              <p className="mt-1 text-sm text-[#64748B]">{f.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
