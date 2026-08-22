"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  return (
    <nav className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center space-x-8">
        <Link href="/" className="flex items-center space-x-2 text-xl font-bold tracking-tight text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition">
          <span className="text-2xl">🛡️</span>
          <span>VeriTranscript</span>
        </Link>
        <div className="hidden md:flex items-center space-x-6 text-sm font-medium text-slate-600 dark:text-slate-400">
          <Link href="/issuer" className="hover:text-slate-900 dark:hover:text-white transition">
            University Portal
          </Link>
          <Link href="/student" className="hover:text-slate-900 dark:hover:text-white transition">
            Student Vault
          </Link>
          <Link href="/verify" className="hover:text-slate-900 dark:hover:text-white transition">
            Instant Verifier
          </Link>
          <Link href="/batch-verify" className="hover:text-slate-900 dark:hover:text-white transition">
            Batch Verify
          </Link>
          <Link href="/analytics" className="hover:text-slate-900 dark:hover:text-white transition">
            Analytics
          </Link>
          <Link href="/explorer" className="hover:text-blue-600 dark:hover:text-blue-400 text-blue-600/80 dark:text-blue-400/80 transition flex items-center gap-1.5">
            <span>Explorer</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          </Link>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <ConnectButton
          showBalance={false}
          chainStatus="icon"
          accountStatus={{
            smallScreen: "avatar",
            largeScreen: "full",
          }}
        />
      </div>
    </nav>
  );
}