"use client";

import Link from "next/link";
import { useAccount } from "wagmi";

export default function Home() {
  const { address, isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white selection:bg-blue-600 selection:text-white transition-colors duration-200">
      <div className="relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-blue-600/20 via-purple-600/20 to-emerald-500/10 blur-[130px] -z-0 pointer-events-none" />

        {/* Hero Section */}
        <div className="max-w-6xl mx-auto px-4 pt-20 pb-16 text-center relative z-10 space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-md">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Decentralized Credential Ledger v1.0
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-tight sm:leading-none">
            Tamper-Proof Academic Transcripts on the{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400">
              Blockchain
            </span>
          </h1>

          <p className="text-slate-600 dark:text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Eliminate degree forgery with client-side SHA-256 hashing and immutable smart
            contract verification. Self-sovereign for students, instant for employers.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              href="/issuer"
              className="px-7 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/30 border border-blue-400/30 hover:scale-[1.02] active:scale-95 transition flex items-center gap-2"
            >
              <span>University Portal</span>
              <span className="text-base">→</span>
            </Link>

            <Link
              href="/student"
              className="px-7 py-3.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm rounded-xl border border-slate-300 dark:border-slate-700 shadow-md hover:scale-[1.02] active:scale-95 transition flex items-center gap-2"
            >
              <span>Student Vault</span>
              <span className="text-base">🎓</span>
            </Link>

            <Link
              href="/verify"
              className="px-7 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/30 border border-emerald-400/30 hover:scale-[1.02] active:scale-95 transition flex items-center gap-2"
            >
              <span>Instant Verifier</span>
              <span className="text-base font-black">✓</span>
            </Link>
          </div>

          <div className="pt-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
            {isConnected ? (
              <span className="px-3 py-1 bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-full shadow-sm">
                Connected Address: <strong className="text-slate-800 dark:text-slate-200">{address?.slice(0, 6)}...{address?.slice(-4)}</strong>
              </span>
            ) : (
              <span>Ready for MetaMask Connection</span>
            )}
          </div>
        </div>

        {/* Feature Cards */}
        <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-7 space-y-4 shadow-sm hover:border-slate-400 dark:hover:border-slate-700 transition">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xl font-bold">
              🏛
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">University Issuance</h3>
            <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
              Registrars issue single credentials or batch rosters via CSV. Generates SHA-256 document digests on-chain without storing private data publicly.
            </p>
            <div className="pt-2">
              <Link href="/issuer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1">
                <span>Open Portal</span>
                <span>&rarr;</span>
              </Link>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-7 space-y-4 shadow-sm hover:border-slate-400 dark:hover:border-slate-700 transition">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400 text-xl font-bold">
              🎓
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Self-Sovereign Vault</h3>
            <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
              Students own their academic records directly in their Web3 wallet with Soulbound profile avatars, PDF exports, and shareable QR verification codes.
            </p>
            <div className="pt-2">
              <Link href="/student" className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-semibold flex items-center gap-1">
                <span>Open Student Vault</span>
                <span>&rarr;</span>
              </Link>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-7 space-y-4 shadow-sm hover:border-slate-400 dark:hover:border-slate-700 transition">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-xl font-bold">
              ⚡
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Instant Verifier</h3>
            <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
              Employers verify authenticity in milliseconds with zero login required by comparing client-side file digests against the immutable registry.
            </p>
            <div className="pt-2">
              <Link href="/verify" className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-1">
                <span>Test Document Verifier</span>
                <span>&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}