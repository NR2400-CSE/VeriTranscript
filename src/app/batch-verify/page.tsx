"use client";

import { useState } from "react";
import { createPublicClient, http } from "viem";
import { hardhat } from "viem/chains";
import Link from "next/link";

const publicClient = createPublicClient({
  chain: hardhat,
  transport: http("http://127.0.0.1:8545"),
});

const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  "0x5FbDB2315678afecb367f032d93F642f64180aa3") as `0x${string}`;

const CONTRACT_ABI = [
  {
    inputs: [{ internalType: "bytes32", name: "_docHash", type: "bytes32" }],
    name: "verifyCredential",
    outputs: [
      {
        components: [
          { internalType: "bool", name: "isValid", type: "bool" },
          { internalType: "address", name: "student", type: "address" },
          { internalType: "string", name: "ipfsURI", type: "string" },
          { internalType: "string", name: "studentName", type: "string" },
          { internalType: "string", name: "degreeName", type: "string" },
          { internalType: "uint256", name: "issueTimestamp", type: "uint256" },
        ],
        internalType: "struct AcademicCredentialRegistry.Credential",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

interface BatchResult {
  fileName: string;
  docHash: string;
  studentName?: string;
  degreeName?: string;
  studentAddress?: string;
  status: "authentic" | "tampered" | "revoked" | "processing";
  reason?: string;
}

export default function BatchVerifyPage() {
  const [results, setResults] = useState<BatchResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const processBatchFiles = async (files: FileList | File[]) => {
    setIsProcessing(true);
    const initialList: BatchResult[] = Array.from(files).map((f) => ({
      fileName: f.name,
      docHash: "Computing SHA-256...",
      status: "processing",
    }));
    setResults(initialList);

    const revokedMap = JSON.parse(
      localStorage.getItem("veritranscript_revocations") || "{}"
    );

    const updatedResults: BatchResult[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const arrayBuffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
        const hexHash =
          "0x" +
          Array.from(new Uint8Array(hashBuffer))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");

        const isRevoked = Boolean(revokedMap[hexHash.toLowerCase()]);

        let contractData: any = null;
        try {
          contractData = await publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: "verifyCredential",
            args: [hexHash as `0x${string}`],
          });
        } catch {
          contractData = null;
        }

        const isValid = Boolean(
          contractData && (contractData.isValid ?? contractData[0])
        );

        if (isRevoked) {
          updatedResults.push({
            fileName: file.name,
            docHash: hexHash,
            studentName: contractData ? contractData.studentName ?? contractData[3] : "N/A",
            degreeName: contractData ? contractData.degreeName ?? contractData[4] : "N/A",
            studentAddress: contractData ? contractData.student ?? contractData[1] : "N/A",
            status: "revoked",
            reason: revokedMap[hexHash.toLowerCase()]?.reason || "Revoked by Institution",
          });
        } else if (isValid) {
          updatedResults.push({
            fileName: file.name,
            docHash: hexHash,
            studentName: contractData.studentName ?? contractData[3],
            degreeName: contractData.degreeName ?? contractData[4],
            studentAddress: contractData.student ?? contractData[1],
            status: "authentic",
          });
        } else {
          updatedResults.push({
            fileName: file.name,
            docHash: hexHash,
            status: "tampered",
            reason: "Digest not registered on ledger",
          });
        }
      } catch (err) {
        updatedResults.push({
          fileName: file.name,
          docHash: "Error",
          status: "tampered",
          reason: "File computation error",
        });
      }
    }

    setResults(updatedResults);
    setIsProcessing(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processBatchFiles(e.dataTransfer.files);
    }
  };

  const authenticCount = results.filter((r) => r.status === "authentic").length;
  const flaggedCount = results.filter((r) => r.status === "tampered" || r.status === "revoked").length;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center py-12 px-4 selection:bg-blue-600">
      <div className="max-w-6xl w-full space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Recruiter Batch Verifier</h1>
            <p className="text-slate-400 text-sm mt-1">
              Simultaneously inspect and audit multi-candidate PDF transcript batches against the smart contract ledger.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/verify"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl transition"
            >
              Single Document Verifier &rarr;
            </Link>
          </div>
        </div>

        {/* Drag & Drop Bulk Zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="border-2 border-dashed border-slate-800 hover:border-blue-500 bg-slate-900/60 rounded-3xl p-10 text-center transition flex flex-col items-center justify-center space-y-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-3xl">
            📂
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-200">
              Drag &amp; Drop Batch PDF Files Here
            </h3>
            <p className="text-xs text-slate-500">
              Select multiple transcripts to compute and evaluate SHA-256 digests in parallel
            </p>
          </div>

          <label className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition cursor-pointer">
            <span>Browse Files</span>
            <input
              type="file"
              multiple
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) processBatchFiles(e.target.files);
              }}
            />
          </label>
        </div>

        {/* Batch Analytics Bar */}
        {results.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-[10px] uppercase font-bold text-slate-500">Total Analyzed</span>
              <p className="text-xl font-bold text-white mt-0.5">{results.length} Documents</p>
            </div>
            <div className="p-4 bg-slate-900 border border-emerald-500/30 bg-emerald-950/20 rounded-2xl">
              <span className="text-[10px] uppercase font-bold text-emerald-400">Authentic Pass</span>
              <p className="text-xl font-bold text-emerald-400 mt-0.5">{authenticCount} Verified</p>
            </div>
            <div className="p-4 bg-slate-900 border border-rose-500/30 bg-rose-950/20 rounded-2xl">
              <span className="text-[10px] uppercase font-bold text-rose-400">Flagged / Tampered</span>
              <p className="text-xl font-bold text-rose-400 mt-0.5">{flaggedCount} Rejected</p>
            </div>
          </div>
        )}

        {/* Results Matrix Table */}
        {results.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <h2 className="text-base font-bold text-slate-200">
              Batch Verification Matrix
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-400">
                <thead className="bg-slate-950 text-slate-300 uppercase tracking-wider text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">File Name</th>
                    <th className="py-3 px-4">Computed SHA-256 Digest</th>
                    <th className="py-3 px-4">Candidate Name</th>
                    <th className="py-3 px-4">Degree</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {results.map((res, i) => (
                    <tr key={i} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-sans text-white font-medium max-w-xs truncate">
                        {res.fileName}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {res.docHash.length > 20
                          ? `${res.docHash.slice(0, 10)}...${res.docHash.slice(-8)}`
                          : res.docHash}
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-300">
                        {res.studentName || "—"}
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-300">
                        {res.degreeName || "—"}
                      </td>
                      <td className="py-3 px-4 text-center font-sans">
                        {res.status === "processing" && (
                          <span className="px-2.5 py-1 bg-slate-800 text-slate-400 text-[11px] rounded-lg animate-pulse">
                            Processing...
                          </span>
                        )}
                        {res.status === "authentic" && (
                          <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold rounded-lg inline-flex items-center gap-1">
                            ✓ Authentic
                          </span>
                        )}
                        {res.status === "revoked" && (
                          <span className="px-2.5 py-1 bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[11px] font-bold rounded-lg inline-flex items-center gap-1">
                            ⚠ Revoked
                          </span>
                        )}
                        {res.status === "tampered" && (
                          <span className="px-2.5 py-1 bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[11px] font-bold rounded-lg inline-flex items-center gap-1">
                            ✕ Invalid / Tampered
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}