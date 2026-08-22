"use client";

import { useState, useEffect } from "react";
import { createPublicClient, http } from "viem";
import { hardhat } from "viem/chains";
import { useWriteContract, useAccount } from "wagmi";

const publicClient = createPublicClient({
  chain: hardhat,
  transport: http("http://127.0.0.1:8545"),
});

const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  "0x5FbDB2315678afecb367f032d93F642f64180aa3") as `0x${string}`;

const CONTRACT_ABI = [
  {
    inputs: [
      { internalType: "bytes32", name: "_docHash", type: "bytes32" },
      { internalType: "address", name: "_student", type: "address" },
      { internalType: "string", name: "_ipfsURI", type: "string" },
      { internalType: "string", name: "_studentName", type: "string" },
      { internalType: "string", name: "_degreeName", type: "string" },
    ],
    name: "issueCredential",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const TEST_ACCOUNTS = [
  { role: "Registrar", name: "Issuer (Account #0)", address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" },
  { role: "Student", name: "Alice Doe (Account #1)", address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" },
  { role: "Student", name: "Krishna Garg (Account #2)", address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" },
  { role: "Student", name: "Srishant (Account #3)", address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906" },
  { role: "Student", name: "Naman Raj (Account #4)", address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65" },
];

const SEED_DATA = [
  {
    name: "Krishna Garg",
    degree: "B.Tech in Electronics & Communication",
    student: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  },
  {
    name: "Srishant",
    degree: "B.Tech in Computer Science & Engineering",
    student: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  },
  {
    name: "Alice Doe",
    degree: "Master of Science in Artificial Intelligence",
    student: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  },
];

export default function DemoAssistant() {
  const { isConnected } = useAccount();
  const [isOpen, setIsOpen] = useState(false);
  const [blockNumber, setBlockNumber] = useState<bigint | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedStatus, setSeedStatus] = useState<string>("");

  const { writeContractAsync } = useWriteContract();

  useEffect(() => {
    const fetchBlock = async () => {
      try {
        const block = await publicClient.getBlockNumber();
        setBlockNumber(block);
      } catch {}
    };
    fetchBlock();
    const interval = setInterval(fetchBlock, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleCopy = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddress(addr);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const handleSeedAll = async () => {
    if (!isConnected) {
      setSeedStatus("Please connect MetaMask first (Account #0 - Issuer).");
      return;
    }

    setIsSeeding(true);
    setSeedStatus("Starting batch auto-seed...");

    const vault = JSON.parse(localStorage.getItem("veritranscript_vault") || "{}");

    try {
      for (let i = 0; i < SEED_DATA.length; i++) {
        const item = SEED_DATA[i];
        setSeedStatus(`Minting #${i + 1}/${SEED_DATA.length}: ${item.name}...`);

        const enc = new TextEncoder().encode(`${item.name}-${item.degree}-${item.student}-${Date.now()}`);
        const hashBuf = await crypto.subtle.digest("SHA-256", enc);
        const hexHash = "0x" + Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");

        await writeContractAsync({
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: "issueCredential",
          args: [
            hexHash as `0x${string}`,
            item.student as `0x${string}`,
            `ipfs://veritranscript-seed-${Date.now()}-${i}`,
            item.name,
            item.degree,
          ],
        });

        vault[item.student.toLowerCase()] = {
          studentName: item.name,
          degreeName: item.degree,
          docHash: hexHash,
          fileName: `${item.name.replace(/\s+/g, "_")}_Transcript.pdf`,
          fileData: "",
          issuedAt: new Date().toLocaleString(),
        };
      }

      localStorage.setItem("veritranscript_vault", JSON.stringify(vault));
      setSeedStatus("✓ All 3 test credentials seeded successfully!");
      setTimeout(() => setSeedStatus(""), 4000);
    } catch (err: any) {
      console.error(err);
      setSeedStatus(`Seeding error: ${err?.shortMessage || err?.message || "Rejected"}`);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-full text-[11px] text-slate-700 dark:text-slate-300 font-mono shadow-xl">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Block #{blockNumber ? blockNumber.toString() : "Syncing..."}</span>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-2xl shadow-xl shadow-blue-600/30 border border-blue-400/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
        >
          <span>⚡ Demo Toolkit</span>
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-6 shadow-2xl text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <span>⚡ Evaluator &amp; Demo Assistant</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Quick-switch test addresses &amp; 1-click ledger population.
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center text-sm transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/30 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                  1-Click Demo Data Population
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-300 font-mono">3 Degrees</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Issues credentials on-chain for Krishna Garg, Srishant, and Alice Doe in one go.
              </p>
              <button
                onClick={handleSeedAll}
                disabled={isSeeding}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-400 text-white text-xs font-bold rounded-xl shadow transition cursor-pointer"
              >
                {isSeeding ? "Minting Credentials..." : "⚡ Auto-Seed 3 Sample Degrees On-Chain"}
              </button>
              {seedStatus && (
                <p className="text-[11px] text-center font-mono text-emerald-600 dark:text-emerald-400 animate-pulse">
                  {seedStatus}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                1-Click Hardhat Test Wallets
              </span>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {TEST_ACCOUNTS.map((acc, i) => (
                  <div
                    key={i}
                    className="p-2.5 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 rounded-xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{acc.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-mono">
                          {acc.role}
                        </span>
                      </div>
                      <p className="font-mono text-[11px] text-slate-500 mt-0.5">
                        {acc.address.slice(0, 10)}...{acc.address.slice(-8)}
                      </p>
                    </div>

                    <button
                      onClick={() => handleCopy(acc.address)}
                      className="px-2.5 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-mono text-[11px] transition cursor-pointer shrink-0"
                    >
                      {copiedAddress === acc.address ? "✓ Copied" : "Copy"}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="w-full py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}