"use client";

import { useState } from "react";
import { createPublicClient, http, decodeEventLog } from "viem";
import { hardhat } from "viem/chains";

const publicClient = createPublicClient({
  chain: hardhat,
  transport: http("http://127.0.0.1:8545"),
});

const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  "0x5FbDB2315678afecb367f032d93F642f64180aa3") as `0x${string}`;

const CREDENTIAL_ISSUED_EVENT_ABI = [
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

interface BatchItemResult {
  fileName: string;
  docHash: string;
  studentName: string;
  degreeName: string;
  studentAddress: string;
  status: "VALID" | "REVOKED" | "INVALID";
}

export default function BatchVerifyPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [results, setResults] = useState<BatchItemResult[]>([]);
  const [statusMsg, setStatusMsg] = useState("");

  const processBatchFiles = async (selectedFiles: FileList | File[]) => {
    const fileArray = Array.from(selectedFiles);
    setFiles(fileArray);
    setIsVerifying(true);
    setStatusMsg(`Verifying ${fileArray.length} document(s) across all recipients...`);

    try {
      // 1. Fetch local vault records
      const rawVault = localStorage.getItem("veritranscript_vault");
      let vaultList: any[] = [];
      if (rawVault) {
        try {
          const parsed = JSON.parse(rawVault);
          vaultList = Array.isArray(parsed) ? parsed : Object.values(parsed);
        } catch {}
      }

      // 2. Fetch Blockchain Logs
      const logs = await publicClient.getLogs({
        address: CONTRACT_ADDRESS,
        fromBlock: 0n,
        toBlock: "latest",
      });

      const onChainRecords: any[] = [];
      for (const log of logs) {
        try {
          const decoded: any = decodeEventLog({
            abi: CREDENTIAL_ISSUED_EVENT_ABI,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === "CredentialIssued") {
            onChainRecords.push(decoded.args);
          }
        } catch {}
      }

      // 3. Evaluate each file and collect ALL matching recipients
      const evaluatedResults: BatchItemResult[] = [];

      for (let i = 0; i < fileArray.length; i++) {
        const f = fileArray[i];
        const buffer = await f.arrayBuffer();
        const hashBuf = await crypto.subtle.digest("SHA-256", buffer);
        const hexHash =
          "0x" +
          Array.from(new Uint8Array(hashBuf))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");

        // Find ALL matching items in vault for this specific file/hash
        const vaultMatches = vaultList.filter(
          (v) =>
            v.docHash?.toLowerCase() === hexHash.toLowerCase() ||
            (v.fileName && v.fileName.toLowerCase() === f.name.toLowerCase())
        );

        // Find ALL matching logs on-chain
        const onChainMatches = onChainRecords.filter((r) => {
          const isDirectMatch = r.docHash.toLowerCase() === hexHash.toLowerCase();
          const isVaultMatch = vaultMatches.some(
            (vm) => vm.docHash?.toLowerCase() === r.docHash.toLowerCase()
          );
          return isDirectMatch || isVaultMatch;
        });

        let fileHadRecipients = false;

        // Add all on-chain matches for this file
        onChainMatches.forEach((logItem) => {
          const vMatch = vaultList.find(
            (v) =>
              v.docHash?.toLowerCase() === logItem.docHash.toLowerCase() ||
              (v.studentAddress?.toLowerCase() === logItem.student.toLowerCase() &&
                v.degreeName?.toLowerCase() === logItem.degreeName.toLowerCase())
          );

          evaluatedResults.push({
            fileName: f.name,
            docHash: logItem.docHash,
            studentName: logItem.studentName || vMatch?.studentName || "Verified Candidate",
            degreeName: logItem.degreeName || vMatch?.degreeName || "Academic Credential",
            studentAddress: logItem.student,
            status: vMatch?.isRevoked ? "REVOKED" : "VALID",
          });
          fileHadRecipients = true;
        });

        // Add any additional vault matches not present in on-chain logs
        vaultMatches.forEach((vItem) => {
          const alreadyListed = evaluatedResults.some(
            (r) =>
              r.fileName === f.name &&
              r.studentAddress.toLowerCase() === vItem.studentAddress?.toLowerCase() &&
              r.degreeName.toLowerCase() === vItem.degreeName?.toLowerCase()
          );

          if (!alreadyListed) {
            evaluatedResults.push({
              fileName: f.name,
              docHash: vItem.docHash || hexHash,
              studentName: vItem.studentName || "Verified Candidate",
              degreeName: vItem.degreeName || "Academic Credential",
              studentAddress: vItem.studentAddress || "0x...",
              status: vItem.isRevoked ? "REVOKED" : "VALID",
            });
            fileHadRecipients = true;
          }
        });

        // If no recipient matched at all, flag as invalid
        if (!fileHadRecipients) {
          evaluatedResults.push({
            fileName: f.name,
            docHash: hexHash,
            studentName: "Unregistered Candidate",
            degreeName: "Unrecognized Document",
            studentAddress: "Unknown",
            status: "INVALID",
          });
        }
      }

      setResults(evaluatedResults);
      setStatusMsg(`✓ Completed batch verification (${evaluatedResults.length} total recipient records found).`);
    } catch (err: any) {
      console.error(err);
      setStatusMsg("Batch verification encountered an error.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processBatchFiles(e.target.files);
    }
  };

  const handleExportCSV = () => {
    if (results.length === 0) return;
    const headers = "File Name,Student Name,Degree,Wallet Address,Status,Document Hash\n";
    const rows = results
      .map(
        (r) =>
          `"${r.fileName}","${r.studentName}","${r.degreeName}","${r.studentAddress}","${r.status}","${r.docHash}"`
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Batch_Verification_Audit_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const validCount = results.filter((r) => r.status === "VALID").length;
  const revokedCount = results.filter((r) => r.status === "REVOKED").length;
  const invalidCount = results.filter((r) => r.status === "INVALID").length;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center py-16 px-4">
      <div className="text-center max-w-xl mb-10">
        <h1 className="text-3xl font-extrabold tracking-tight">Recruiter Batch Verifier</h1>
        <p className="text-slate-400 text-sm mt-2">
          Simultaneously inspect and audit multi-candidate transcripts against on-chain records.
        </p>
      </div>

      <div className="max-w-4xl w-full space-y-8">
        {/* Upload Multi-Files Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl text-center space-y-6">
          <label className="border-2 border-dashed border-slate-800 hover:border-blue-500/50 rounded-2xl p-10 flex flex-col items-center justify-center space-y-3 cursor-pointer bg-slate-950/40 transition">
            <span className="text-4xl">📂</span>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-200">
                {files.length > 0
                  ? `${files.length} document(s) loaded`
                  : "Click or drag multiple files (PDF, DOCX, PNG, etc.) to verify"}
              </p>
              <p className="text-xs text-slate-500">
                Select multiple candidate files to discover all associated student credentials
              </p>
            </div>
            <input
              type="file"
              multiple
              onChange={handleFileInput}
              className="hidden"
            />
          </label>

          {isVerifying && (
            <p className="text-xs font-mono text-blue-400 animate-pulse">{statusMsg}</p>
          )}
        </div>

        {/* Results Table Section */}
        {results.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl">
            {/* Summary Metrics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Valid Recipients</span>
                <p className="text-2xl font-black text-emerald-400">{validCount}</p>
              </div>
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Revoked</span>
                <p className="text-2xl font-black text-amber-500">{revokedCount}</p>
              </div>
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Unregistered</span>
                <p className="text-2xl font-black text-rose-500">{invalidCount}</p>
              </div>
            </div>

            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white">All Matching Candidate Credentials ({results.length})</h2>
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Export Audit Report (CSV)
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="pb-3 px-2">Document File</th>
                    <th className="pb-3 px-2">Student Name</th>
                    <th className="pb-3 px-2">Degree / Certificate</th>
                    <th className="pb-3 px-2">Wallet Address</th>
                    <th className="pb-3 px-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {results.map((res, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-2 text-slate-300 font-sans">{res.fileName}</td>
                      <td className="py-3 px-2 text-white font-sans font-medium">{res.studentName}</td>
                      <td className="py-3 px-2 text-slate-400 font-sans">{res.degreeName}</td>
                      <td className="py-3 px-2 text-slate-500 text-[11px]">
                        {res.studentAddress.length > 14
                          ? `${res.studentAddress.slice(0, 8)}...${res.studentAddress.slice(-6)}`
                          : res.studentAddress}
                      </td>
                      <td className="py-3 px-2">
                        {res.status === "VALID" && (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold font-sans">
                            ✓ VALID
                          </span>
                        )}
                        {res.status === "REVOKED" && (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold font-sans">
                            ⚠ REVOKED
                          </span>
                        )}
                        {res.status === "INVALID" && (
                          <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-bold font-sans">
                            ✕ UNREGISTERED
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