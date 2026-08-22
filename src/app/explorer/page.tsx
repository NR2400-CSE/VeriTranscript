"use client";

import { useState, useEffect, useCallback } from "react";
import { createPublicClient, http, decodeEventLog, formatEther } from "viem";
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

interface BlockItem {
  number: bigint;
  hash: string;
  timestamp: string;
  txCount: number;
  gasUsed: string;
}

interface EventItem {
  txHash: string;
  blockNumber: bigint;
  studentName: string;
  degreeName: string;
  student: string;
  docHash: string;
  timestamp: string;
}

export default function ExplorerPage() {
  const [latestBlocks, setLatestBlocks] = useState<BlockItem[]>([]);
  const [contractEvents, setContractEvents] = useState<EventItem[]>([]);
  const [currentBlockNum, setCurrentBlockNum] = useState<bigint | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchBlockchainState = useCallback(async () => {
    try {
      const blockNum = await publicClient.getBlockNumber();
      setCurrentBlockNum(blockNum);

      // Fetch last 6 blocks
      const blockPromises = [];
      const start = blockNum > 5n ? blockNum - 5n : 0n;
      for (let i = blockNum; i >= start; i--) {
        blockPromises.push(publicClient.getBlock({ blockNumber: i }));
      }
      const fetchedBlocks = await Promise.all(blockPromises);

      const parsedBlocks: BlockItem[] = fetchedBlocks.map((b) => ({
        number: b.number,
        hash: b.hash || "0x0",
        timestamp: new Date(Number(b.timestamp) * 1000).toLocaleTimeString(),
        txCount: b.transactions.length,
        gasUsed: b.gasUsed.toString(),
      }));
      setLatestBlocks(parsedBlocks);

      // Fetch Contract Events
      const logs = await publicClient.getLogs({
        address: CONTRACT_ADDRESS,
        fromBlock: 0n,
        toBlock: "latest",
      });

      const parsedEvents: EventItem[] = [];
      for (const log of logs) {
        try {
          const decoded: any = decodeEventLog({
            abi: CREDENTIAL_EVENT_ABI,
            data: log.data,
            topics: log.topics,
          });

          if (decoded.eventName === "CredentialIssued") {
            const timeNum = Number(decoded.args.timestamp);
            parsedEvents.unshift({
              txHash: log.transactionHash || "0x0",
              blockNumber: log.blockNumber || 0n,
              studentName: decoded.args.studentName,
              degreeName: decoded.args.degreeName,
              student: decoded.args.student,
              docHash: decoded.args.docHash,
              timestamp: timeNum
                ? new Date(timeNum * 1000).toLocaleString()
                : "Just now",
            });
          }
        } catch {}
      }
      setContractEvents(parsedEvents);
    } catch (err) {
      console.error("Explorer fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBlockchainState();
    const interval = setInterval(fetchBlockchainState, 3500);
    return () => clearInterval(interval);
  }, [fetchBlockchainState]);

  const filteredEvents = contractEvents.filter(
    (ev) =>
      ev.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.student.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.docHash.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.txHash.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center py-12 px-4 selection:bg-blue-600">
      <div className="max-w-6xl w-full space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Hardhat Ledger Explorer</h1>
            <p className="text-slate-400 text-sm mt-1">
              Live block tracker and decentralized transaction execution pipeline.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-300">
              <span className="text-slate-500">Latest Block: </span>
              <span className="text-emerald-400 font-bold">
                #{currentBlockNum !== null ? currentBlockNum.toString() : "..."}
              </span>
            </div>
            <button
              onClick={fetchBlockchainState}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Sync
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search by student name, wallet address (0x...), document SHA-256 hash, or tx hash..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3.5 bg-slate-900 border border-slate-800 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Top Grid: Recent Blocks & Contract Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Blocks List */}
          <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Latest Blocks
              </h2>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>

            <div className="space-y-2.5">
              {latestBlocks.map((b) => (
                <div
                  key={b.number.toString()}
                  className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-mono font-bold text-blue-400">
                      Block #{b.number.toString()}
                    </span>
                    <p className="text-[10px] text-slate-500">{b.timestamp}</p>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 bg-slate-800 rounded text-[10px] text-slate-300 font-mono">
                      {b.txCount} txs
                    </span>
                    <p className="text-[10px] text-slate-600 font-mono mt-0.5">
                      Gas: {b.gasUsed}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Smart Contract Overview & Stats */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Active Smart Contract Architecture
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-1">
                  <span className="text-slate-500 font-semibold uppercase text-[10px]">
                    Contract Address
                  </span>
                  <p className="font-mono text-blue-400 break-all">{CONTRACT_ADDRESS}</p>
                </div>
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-1">
                  <span className="text-slate-500 font-semibold uppercase text-[10px]">
                    Ledger Network
                  </span>
                  <p className="font-mono text-purple-400">Hardhat Local (Chain ID: 31337)</p>
                </div>
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-1">
                  <span className="text-slate-500 font-semibold uppercase text-[10px]">
                    Total Events Indexed
                  </span>
                  <p className="text-lg font-bold text-emerald-400">
                    {contractEvents.length} Credentials
                  </p>
                </div>
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-1">
                  <span className="text-slate-500 font-semibold uppercase text-[10px]">
                    Standard Compliance
                  </span>
                  <p className="font-mono text-slate-300">ERC-5192 Soulbound Attestation</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-950/20 border border-blue-500/20 rounded-2xl flex items-center justify-between text-xs">
              <span className="text-slate-400">Want to issue more test records?</span>
              <Link
                href="/issuer"
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition"
              >
                Go to Issuer Portal &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Live Transaction / Event Stream */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-200">
              Contract Event Stream ({filteredEvents.length})
            </h2>
          </div>

          {isLoading ? (
            <p className="text-sm text-slate-400 animate-pulse text-center py-8">
              Connecting to RPC node and indexing event logs...
            </p>
          ) : filteredEvents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-400">
                <thead className="bg-slate-950 text-slate-300 uppercase tracking-wider text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Tx Hash / Block</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Degree</th>
                    <th className="py-3 px-4">Student Wallet</th>
                    <th className="py-3 px-4">Document Hash</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredEvents.map((ev, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <span className="text-blue-400">{ev.txHash.slice(0, 8)}...</span>
                        <p className="text-[10px] text-slate-500">
                          Block #{ev.blockNumber.toString()}
                        </p>
                      </td>
                      <td className="py-3 px-4 font-sans font-medium text-white">
                        {ev.studentName}
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-300">{ev.degreeName}</td>
                      <td className="py-3 px-4 text-slate-400">
                        {ev.student.slice(0, 6)}...{ev.student.slice(-4)}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {ev.docHash.slice(0, 10)}...{ev.docHash.slice(-6)}
                      </td>
                      <td className="py-3 px-4 text-right font-sans">
                        <Link
                          href={`/verify?hash=${ev.docHash}`}
                          className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-[11px] font-semibold transition inline-block"
                        >
                          Verify On-Chain
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-6">
              No matching on-chain event transactions found.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}