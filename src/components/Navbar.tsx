"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useChainId } from "wagmi";
import { useState, useEffect } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const chainId = useChainId();
  const [theme, setTheme] = useState("dark");
  const [showExplorerModal, setShowExplorerModal] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  const handleExplorerClick = (e: React.MouseEvent) => {
    if (chainId === 31337 || !chainId) {
      e.preventDefault();
      setShowExplorerModal(true);
    }
  };

  const navLinks = [
    { name: "University Portal", href: "/issuer" },
    { name: "Student Vault", href: "/student" },
    { name: "Instant Verifier", href: "/verify" },
    { name: "Batch Verify", href: "/batch-verify" },
    { name: "Analytics", href: "/analytics" },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-black text-xl tracking-tight text-white">
            <span className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white text-base shadow-md shadow-blue-600/30">
              🎓
            </span>
            <span>VeriTranscript</span>
          </Link>

          {/* Nav Items */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}

            {/* Explorer Button */}
            <a
              href={chainId === 80002 ? "https://amoy.polygonscan.com" : "#"}
              target={chainId === 80002 ? "_blank" : "_self"}
              rel="noreferrer"
              onClick={handleExplorerClick}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>Explorer</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            </a>
          </nav>

          {/* Controls & Wallet Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              aria-label="Toggle Theme"
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition text-sm"
            >
              {theme === "dark" ? "🌙" : "☀️"}
            </button>

            <ConnectButton showBalance={false} chainStatus="icon" />
          </div>
        </div>
      </header>

      {/* Explorer Modal for Local Hardhat Node */}
      {showExplorerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center gap-2">
                <span>🔍</span> Hardhat Local Explorer
              </h3>
              <button
                onClick={() => setShowExplorerModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your browser is connected to the local development chain (<code className="text-blue-400 font-mono">127.0.0.1:8545</code>, Chain ID: <code className="text-blue-400 font-mono">31337</code>).
            </p>
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1.5">
              <div>Network: Hardhat Localhost</div>
              <div>RPC URL: http://127.0.0.1:8545</div>
              <div>Contract: 0x5FbDB2315678afecb367f032d93F642f64180aa3</div>
            </div>
            <p className="text-[11px] text-slate-500">
              To open Polygonscan, switch your network in MetaMask to <strong>Polygon Amoy Testnet</strong>.
            </p>
            <button
              onClick={() => setShowExplorerModal(false)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}