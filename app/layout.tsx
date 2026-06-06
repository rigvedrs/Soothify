import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "Soothify — Your pocket companion for difficult moments",
  description: "Voice conversations, emotional support, and mental health tools.",
};

function SoothifyLogo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M3 4C3 2.895 3.895 2 5 2H23C24.105 2 25 2.895 25 4V18C25 19.105 24.105 20 23 20H15.5L11 26V20H5C3.895 20 3 19.105 3 18V4Z"
        fill="rgba(59,130,246,0.1)"
        stroke="#3B82F6"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M14 16.5C14 16.5 7 12 7 8.5C7 6.015 9.015 4.5 11.5 4.5C12.85 4.5 14 5.6 14 5.6C14 5.6 15.15 4.5 16.5 4.5C18.985 4.5 21 6.015 21 8.5C21 12 14 16.5 14 16.5Z"
        fill="#3B82F6"
      />
    </svg>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        <header className="sticky top-0 z-40 border-b border-[#E2E8F0] bg-white/90 backdrop-blur-md">
          <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2.5 text-[#0F172A] hover:text-[#3B82F6] transition-colors"
            >
              <SoothifyLogo />
              <span className="font-semibold tracking-tight">Soothify</span>
            </Link>

            <nav className="hidden md:flex items-center gap-5 text-sm text-[#64748B]">
              <Link href="/assessment" className="hover:text-[#0F172A] transition-colors">Assessment</Link>
              <Link href="/companion" className="hover:text-[#0F172A] transition-colors">Companion</Link>
              <Link href="/dashboard" className="hover:text-[#0F172A] transition-colors">Dashboard</Link>
              <Link href="/exercises" className="hover:text-[#0F172A] transition-colors">Exercises</Link>
              <Link href="/facilities" className="hover:text-[#0F172A] transition-colors">Find Help</Link>
              <Link href="/blogs" className="hover:text-[#0F172A] transition-colors">Blogs</Link>
            </nav>

            <Link
              href="/companion"
              className="px-4 py-1.5 rounded-full bg-[#3B82F6] text-white text-sm font-semibold hover:bg-[#2563EB] transition-colors"
            >
              Start
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6">
          {children}
        </main>

        <footer className="mt-8 border-t border-[#E2E8F0]">
          <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-[#94A3B8] flex flex-col md:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <SoothifyLogo size={18} />
              <span>© {new Date().getFullYear()} Soothify</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/blogs" className="hover:text-[#3B82F6] transition-colors">Resources</Link>
              <Link href="/exercises" className="hover:text-[#3B82F6] transition-colors">Exercises</Link>
              <Link href="/facilities" className="hover:text-[#3B82F6] transition-colors">Find Help</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
