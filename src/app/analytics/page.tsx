"use client";

import { useState, useEffect, useCallback } from "react";
import { createPublicClient, http, decodeEventLog } from "viem";
import { hardhat } from "viem/chains";
import Link from "next/link";

const publicClient = createPublicClient({
  chain: hardhat,
  transport: http("http://127.0.0.1:8545"),
});

const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  "0x5FbDB2315678afecb367f032d93F642f64180aa3") as `0x${string}`;

const CREDENTIAL_EVENT_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "bytes32", name: "docHash", type: "bytes32" },
      { indexed: true, internalType: "address", name: "student", type: "address" },
      { indexed: false, internalType: "string", name: "ipfsURI", type: "string" },
      { indexed: false, internalType: "string", name: "studentName", type: "string" },
      { indexed: false, internalType: "string", name: "degreeName", type: "string" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    name: "CredentialIssued",
    type: "event",
  },
] as const;

export default function AnalyticsPage() {
  const [totalCredentials, setTotalCredentials] = useState<number>(0);
  const [currentBlock, setCurrentBlock] = useState<bigint | null>(null);
  const [latencyMs, setLatencyMs] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLedgerStats = useCallback(async () => {
    try {
      const startTime = performance.now();
      const blockNum = await publicClient.getBlockNumber();
      const endTime = performance.now();
      setLatencyMs(Math.round(endTime - startTime));
      setCurrentBlock(blockNum);

      const logs = await publicClient.getLogs({
        address: CONTRACT_ADDRESS,
        fromBlock: 0n,
        toBlock: "latest",
      });

      let count = 0;
      for (const log of logs) {
        try {
          const decoded: any = decodeEventLog({
            abi: CREDENTIAL_EVENT_ABI,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === "CredentialIssued") count++;
        } catch {}
      }
      setTotalCredentials(count);
    } catch (err) {
      console.error("Analytics fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLedgerStats();
    const interval = setInterval(fetchLedgerStats, 4000);
    return () => clearInterval(interval);
  }, [fetchLedgerStats]);

  // Comparative Cost & Storage Estimations
  const avgPdfBytes = 850000; // ~850 KB standard PDF
  const digestBytes = 32; // SHA-256 fixed bytes
  const bytesSaved = totalCredentials * (avgPdfBytes - digestBytes);
  const traditionalCostPerDoc = 35.0; // $35 notary + transcript courier fee
  const blockchainCostPerDoc = 0.04; // ~$0.04 Layer 2 / optimized gas cost
  const totalCostSavedUSD = (totalCredentials * (traditionalCostPerDoc - blockchainCostCost(traditionalCostPerDoc, blockchainCostPerDoc))).toFixed(2);
  const paperSheetsSaved = totalCredentials * 4; // avg 4 pages per diploma package
  const waterSavedLiters = (paperSheetsSaved * 10).toFixed(1); // ~10L per sheet

  function blockchainCostCost(trad: number, chain: number) {
    return trad - chain;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center py-12 px-4 selection:bg-blue-600">
      <div className="max-w-6xl w-full space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Ledger Economics &amp; ESG Analytics</h1>
            <p className="text-slate-400 text-sm mt-1">
              Real-time measurement of cryptographic storage optimization, cost reduction, and carbon savings.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-400">
              RPC Latency: <span className="text-emerald-400 font-bold">{latencyMs}ms</span>
            </div>
            <button
              onClick={fetchLedgerStats}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500">Credentials Anchored</span>
            <p className="text-2xl font-black text-white">{isLoading ? "..." : totalCredentials}</p>
            <p className="text-[11px] text-slate-400 font-mono">Hardhat Block #{currentBlock?.toString() || "..."}</p>
          </div>

          <div className="p-5 bg-slate-900 border border-emerald-500/30 bg-emerald-950/20 rounded-2xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-emerald-400">Estimated Cost Savings</span>
            <p className="text-2xl font-black text-emerald-400">
              ${(totalCredentials * 34.96).toFixed(2)}
            </p>
            <p className="text-[11px] text-slate-400">vs. $35.00 traditional fee</p>
          </div>

          <div className="p-5 bg-slate-900 border border-blue-500/30 bg-blue-950/20 rounded-2xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-blue-400">On-Chain Payload Saved</span>
            <p className="text-2xl font-black text-blue-400">
              {(bytesSaved / (1024 * 1024)).toFixed(2)} MB
            </p>
            <p className="text-[11px] text-slate-400">via SHA-256 Zero-Data Bloat</p>
          </div>

          <div className="p-5 bg-slate-900 border border-purple-500/30 bg-purple-950/20 rounded-2xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-purple-400">Paper Eliminated</span>
            <p className="text-2xl font-black text-purple-400">{paperSheetsSaved} Sheets</p>
            <p className="text-[11px] text-slate-400">~{waterSavedLiters} L water conserved</p>
          </div>
        </div>

        {/* Comparative Architecture Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cost Comparison Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <h2 className="text-base font-bold text-slate-200">
              Verification Cost Breakdown per 1,000 Transcripts
            </h2>
            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-slate-950 rounded-xl flex items-center justify-between border border-slate-800">
                <div>
                  <span className="font-semibold text-slate-300">Traditional Certified Postal Notary</span>
                  <p className="text-[10px] text-slate-500">Printing, postage, human registrar processing</p>
                </div>
                <span className="font-mono font-bold text-rose-400 text-sm">$35,000.00</span>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-xl flex items-center justify-between border border-slate-800">
                <div>
                  <span className="font-semibold text-slate-300">Centralized Clearinghouse SaaS</span>
                  <p className="text-[10px] text-slate-500">Subscription licenses + third-party API queries</p>
                </div>
                <span className="font-mono font-bold text-amber-400 text-sm">$12,500.00</span>
              </div>

              <div className="p-3.5 bg-emerald-950/40 rounded-xl flex items-center justify-between border border-emerald-500/30">
                <div>
                  <span className="font-semibold text-emerald-300">VeriTranscript Protocol</span>
                  <p className="text-[10px] text-emerald-400/70">Client-side hashing + immutable smart contract call</p>
                </div>
                <span className="font-mono font-bold text-emerald-400 text-sm">$40.00</span>
              </div>
            </div>
          </div>

          {/* Cryptographic Footprint Efficiency */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl flex flex-col justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-200">
                Storage Architecture: On-Chain Bloat Reduction
              </h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Storing raw PDF binary records on an Ethereum ledger would cost thousands in gas fees and permanently bloat node state. VeriTranscript stores only the 32-byte SHA-256 fingerprint.
              </p>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">PDF Document Payload:</span>
                <span className="font-mono text-slate-300">~850,000 bytes</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">VeriTranscript On-Chain Anchor:</span>
                <span className="font-mono text-emerald-400 font-bold">32 bytes</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full w-[99.99%]"></div>
              </div>
              <p className="text-[11px] text-slate-500 text-right font-mono">
                99.996% storage compression efficiency
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs">
              <span className="text-slate-500">Need to inspect recent transactions?</span>
              <Link href="/explorer" className="text-blue-400 hover:text-blue-300 font-semibold">
                Open Hardhat Explorer &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}