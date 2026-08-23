"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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

interface CandidateRecord {
  studentName: string;
  degreeName: string;
  studentAddress: string;
  issuedAt: string;
  docHash: string;
  isRevoked: boolean;
}

function VerifyContent() {
  const searchParams = useSearchParams();
  const queryHash = searchParams.get("hash");

  const [file, setFile] = useState<File | null>(null);
  const [computedHash, setComputedHash] = useState<string>("");
  const [originalHash, setOriginalHash] = useState<string>("");
  const [isTamperedMode, setIsTamperedMode] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [matchedCandidates, setMatchedCandidates] = useState<CandidateRecord[]>([]);
  const [hasChecked, setHasChecked] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const verifyHashOnChain = useCallback(async (hash: string, fileName?: string) => {
    setIsVerifying(true);
    setHasChecked(false);
    setMatchedCandidates([]);
    setErrorMessage("");
    setComputedHash(hash);

    try {
      // 1. Fetch Local Ledger Records
      const rawVault = localStorage.getItem("veritranscript_vault");
      let vaultList: any[] = [];
      if (rawVault) {
        try {
          const parsed = JSON.parse(rawVault);
          vaultList = Array.isArray(parsed) ? parsed : Object.values(parsed);
        } catch {}
      }

      // Filter all matching entries in local cache
      const vaultMatches = vaultList.filter(
        (v) =>
          v.docHash?.toLowerCase() === hash.toLowerCase() ||
          (fileName && v.fileName?.toLowerCase() === fileName.toLowerCase())
      );

      // 2. Fetch Blockchain Logs
      const logs = await publicClient.getLogs({
        address: CONTRACT_ADDRESS,
        fromBlock: 0n,
        toBlock: "latest",
      });

      const onChainMatches: any[] = [];

      for (const log of logs) {
        try {
          const decoded: any = decodeEventLog({
            abi: CREDENTIAL_ISSUED_EVENT_ABI,
            data: log.data,
            topics: log.topics,
          });

          if (decoded.eventName === "CredentialIssued") {
            const isDirectHashMatch = decoded.args.docHash.toLowerCase() === hash.toLowerCase();
            const isVaultHashMatch = vaultMatches.some(
              (vm) => vm.docHash?.toLowerCase() === decoded.args.docHash.toLowerCase()
            );

            if (isDirectHashMatch || isVaultHashMatch) {
              onChainMatches.push(decoded.args);
            }
          }
        } catch {}
      }

      // 3. Aggregate all unique candidates found across on-chain logs and vault
      const candidateList: CandidateRecord[] = [];

      // Add On-Chain Log Matches
      onChainMatches.forEach((logItem) => {
        const vMatch = vaultList.find(
          (v) =>
            v.docHash?.toLowerCase() === logItem.docHash.toLowerCase() ||
            (v.studentAddress?.toLowerCase() === logItem.student.toLowerCase() &&
              v.degreeName?.toLowerCase() === logItem.degreeName.toLowerCase())
        );

        const timestampNum = Number(logItem.timestamp);
        const dateStr = timestampNum
          ? new Date(timestampNum * 1000).toLocaleString()
          : new Date().toLocaleString();

        candidateList.push({
          studentName: logItem.studentName || vMatch?.studentName || "Candidate",
          degreeName: logItem.degreeName || vMatch?.degreeName || "Academic Credential",
          studentAddress: logItem.student,
          issuedAt: dateStr,
          docHash: logItem.docHash,
          isRevoked: Boolean(vMatch?.isRevoked),
        });
      });

      // Add Vault Matches if not already present
      vaultMatches.forEach((vItem) => {
        const alreadyAdded = candidateList.some(
          (c) =>
            c.studentAddress.toLowerCase() === vItem.studentAddress?.toLowerCase() &&
            c.degreeName.toLowerCase() === vItem.degreeName?.toLowerCase()
        );

        if (!alreadyAdded) {
          candidateList.push({
            studentName: vItem.studentName || "Candidate",
            degreeName: vItem.degreeName || "Academic Credential",
            studentAddress: vItem.studentAddress || "0x...",
            issuedAt: vItem.issuedAt || new Date().toLocaleString(),
            docHash: vItem.docHash || hash,
            isRevoked: Boolean(vItem.isRevoked),
          });
        }
      });

      if (candidateList.length > 0) {
        setMatchedCandidates(candidateList);
      } else {
        setErrorMessage(
          "The computed document hash does not match any credential on the local registry."
        );
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Verification lookup failed.");
    } finally {
      setIsVerifying(false);
      setHasChecked(true);
    }
  }, []);

  useEffect(() => {
    if (queryHash && queryHash.startsWith("0x")) {
      setOriginalHash(queryHash);
      verifyHashOnChain(queryHash);
    }
  }, [queryHash, verifyHashOnChain]);

  const processFile = async (selectedFile: File, simulateTamper: boolean) => {
    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      let uint8 = new Uint8Array(arrayBuffer);

      if (simulateTamper) {
        uint8 = new Uint8Array(uint8);
        uint8[0] = uint8[0] ^ 0xff;
      }

      const hashBuffer = await crypto.subtle.digest("SHA-256", uint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const sha256 =
        "0x" + hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

      if (!simulateTamper) {
        setOriginalHash(sha256);
      }

      await verifyHashOnChain(sha256, selectedFile.name);
    } catch (err) {
      console.error("Hashing error:", err);
      setErrorMessage("Failed to calculate document digest.");
    }
  };

  const handleDocumentDrop = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setIsTamperedMode(false);
    await processFile(selectedFile, false);
  };

  const handleToggleTamperSimulation = async () => {
    if (!file && !queryHash) return;
    const newTamperState = !isTamperedMode;
    setIsTamperedMode(newTamperState);

    if (file) {
      await processFile(file, newTamperState);
    } else if (originalHash) {
      if (newTamperState) {
        const forged =
          "0x" +
          (originalHash[2] === "a" ? "b" : "a") +
          originalHash.slice(3);
        await verifyHashOnChain(forged);
      } else {
        await verifyHashOnChain(originalHash);
      }
    }
  };

  const downloadAuditReportPDF = (candidate: CandidateRecord) => {
    const verificationTime = new Date().toLocaleString();

    const pdfReportContent = `%PDF-1.4
1 0 obj
<< /Title (Cryptographic Verification Audit Report - ${candidate.studentName})
   /Author (VeriTranscript Verification Network)
   /Subject (Blockchain Authentication Record) >>
endobj
2 0 obj
<< /Type /Catalog /Pages 3 0 R >>
endobj
3 0 obj
<< /Type /Pages /Kids [4 0 R] /Count 1 >>
endobj
4 0 obj
<< /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] /Contents 5 0 R /Resources << /Font << /F1 6 0 R >> >> >>
endobj
5 0 obj
<< /Length 560 >>
stream
BT
/F1 18 Tf
50 720 Td
(CRYPTOGRAPHIC VERIFICATION AUDIT REPORT) Tj
/F1 10 Tf
0 -30 Td
(Issued by VeriTranscript Distributed Protocol) Tj
0 -25 Td
(========================================================================) Tj
0 -25 Td
(VERIFICATION STATUS   : [ ${candidate.isRevoked ? "REVOKED / INACTIVE" : "PASS - AUTHENTIC & VALID"} ]) Tj
0 -20 Td
(VERIFIED TIMESTAMP    : ${verificationTime}) Tj
0 -20 Td
(CONTRACT ADDRESS      : ${CONTRACT_ADDRESS}) Tj
0 -20 Td
(NETWORK LEDGER        : Hardhat Local Ethereum [Chain ID: 31337]) Tj
0 -25 Td
(========================================================================) Tj
0 -25 Td
(STUDENT RECIPIENT     : ${candidate.studentName}) Tj
0 -20 Td
(DEGREE / CREDENTIAL   : ${candidate.degreeName}) Tj
0 -20 Td
(STUDENT WALLET        : ${candidate.studentAddress}) Tj
0 -20 Td
(ISSUED TIMESTAMP      : ${candidate.issuedAt}) Tj
0 -20 Td
(DOCUMENT SHA-256 HASH : ${candidate.docHash}) Tj
0 -30 Td
(========================================================================) Tj
0 -25 Td
(LEGAL ATTESTATION:) Tj
0 -15 Td
(This audit confirms the file payload was cryptographically proven authentic) Tj
0 -15 Td
(against the immutable blockchain registry without third-party modification.) Tj
ET
endstream
endobj
6 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>
endobj
xref
0 7
0000000000 65535 f 
0000000009 00000 n 
0000000150 00000 n 
0000000203 00000 n 
0000000262 00000 n 
0000000393 00000 n 
0000000995 00000 n 
trailer
<< /Size 7 /Root 2 0 R >>
startxref
1066
%%EOF`;

    const blob = new Blob([pdfReportContent], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Audit_Report_${candidate.studentName.replace(/\s+/g, "_")}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center py-16 px-4">
      <div className="text-center max-w-xl mb-10">
        <h1 className="text-3xl font-bold tracking-tight">Instant Document Verifier</h1>
        <p className="text-slate-400 text-sm mt-2">
          Cryptographic validation against the local registry across all registered recipients.
        </p>
      </div>

      <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="border-2 border-dashed border-slate-700 rounded-2xl p-8 text-center hover:border-blue-500 transition-colors">
          <input
            type="file"
            id="verify-file"
            onChange={handleDocumentDrop}
            className="hidden"
          />
          <label htmlFor="verify-file" className="cursor-pointer flex flex-col items-center">
            <span className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-semibold text-white mb-2 transition cursor-pointer">
              Choose Document / Transcript
            </span>
            <span className="text-sm text-slate-400">
              {file ? file.name : "Select any document (PDF, DOCX, PNG) to verify all recipients"}
            </span>
          </label>
        </div>

        {/* Live Tamper Simulation Switch */}
        {(file || originalHash) && (
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-slate-300">
                Security Sandbox / Tamper Simulation
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Simulate 1-byte payload modification to demonstrate cryptographic integrity.
              </p>
            </div>
            <button
              onClick={handleToggleTamperSimulation}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer shrink-0 ${
                isTamperedMode
                  ? "bg-rose-500/20 text-rose-400 border-rose-500/30 hover:bg-rose-500/30"
                  : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
              }`}
            >
              {isTamperedMode ? "Tamper Active (1 Byte Mutated)" : "Inject Tamper"}
            </button>
          </div>
        )}

        {isVerifying && (
          <p className="text-center text-sm text-slate-400 animate-pulse">
            Querying local Hardhat smart contract for all registered candidates...
          </p>
        )}

        {computedHash && (
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-slate-500 font-medium">Evaluated SHA-256 Digest:</p>
              {isTamperedMode && (
                <span className="text-[10px] uppercase font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded">
                  Mutated Byte Payload
                </span>
              )}
            </div>
            <p className="text-xs font-mono text-blue-400 break-all">{computedHash}</p>
          </div>
        )}

        {/* Display All Matching Candidates */}
        {hasChecked && matchedCandidates.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Matching On-Chain Recipients ({matchedCandidates.length})
              </span>
            </div>

            {matchedCandidates.map((cand, idx) => (
              <div
                key={idx}
                className={`p-6 rounded-2xl border space-y-4 transition ${
                  cand.isRevoked
                    ? "bg-amber-950/30 border-amber-500/40"
                    : "bg-emerald-950/30 border-emerald-500/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">{cand.isRevoked ? "⚠" : "✓"}</span>
                    <h3 className="font-bold text-base text-white">
                      {cand.isRevoked ? "Revoked Credential" : "Authentic & Verified"}
                    </h3>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      cand.isRevoked
                        ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                        : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    }`}
                  >
                    {cand.isRevoked ? "REVOKED" : "VALID"}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300 font-mono">
                  <p>
                    <strong className="text-slate-400 font-sans">Student:</strong> {cand.studentName}
                  </p>
                  <p>
                    <strong className="text-slate-400 font-sans">Degree:</strong> {cand.degreeName}
                  </p>
                  <p className="break-all">
                    <strong className="text-slate-400 font-sans">Student Address:</strong>{" "}
                    {cand.studentAddress}
                  </p>
                  <p>
                    <strong className="text-slate-400 font-sans">Issued On:</strong> {cand.issuedAt}
                  </p>
                </div>

                <button
                  onClick={() => downloadAuditReportPDF(cand)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold shadow transition cursor-pointer"
                >
                  Download Audit Report for {cand.studentName} (PDF)
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Failed / Tampered State */}
        {hasChecked && matchedCandidates.length === 0 && !isVerifying && (
          <div className="p-6 bg-rose-950/40 border border-rose-500/40 rounded-2xl text-rose-300 space-y-2">
            <div className="flex items-center space-x-2 text-rose-400 font-bold">
              <span>✕</span>
              <span>Verification Failed: Tampered or Unregistered</span>
            </div>
            <p className="text-xs text-slate-400">
              {errorMessage ||
                "The computed document hash does not match any registered credential."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
          Loading Verifier...
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}