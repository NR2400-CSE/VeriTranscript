"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createPublicClient, http } from "viem";
import { hardhat } from "viem/chains";

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

function VerifyContent() {
  const searchParams = useSearchParams();
  const queryHash = searchParams.get("hash");

  const [file, setFile] = useState<File | null>(null);
  const [computedHash, setComputedHash] = useState<string>("");
  const [originalHash, setOriginalHash] = useState<string>("");
  const [isTamperedMode, setIsTamperedMode] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [credentialData, setCredentialData] = useState<any>(null);
  const [hasChecked, setHasChecked] = useState<boolean>(false);
  const [isRevoked, setIsRevoked] = useState<boolean>(false);
  const [revocationDetails, setRevocationDetails] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const verifyHashOnChain = useCallback(async (hash: string) => {
    setIsVerifying(true);
    setHasChecked(false);
    setCredentialData(null);
    setIsRevoked(false);
    setRevocationDetails(null);
    setErrorMessage("");
    setComputedHash(hash);

    try {
      const revokedMap = JSON.parse(
        localStorage.getItem("veritranscript_revocations") || "{}"
      );
      const revInfo = revokedMap[hash.toLowerCase()];

      if (revInfo) {
        setIsRevoked(true);
        setRevocationDetails(revInfo);
      }

      let data: any = null;
      try {
        data = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: "verifyCredential",
          args: [hash as `0x${string}`],
        });
      } catch {
        data = null;
      }

      if (data && (data.isValid || data[0])) {
        setCredentialData(data);
      } else {
        setCredentialData(null);
        setErrorMessage(
          "The computed document hash does not match any active credential on the local registry."
        );
      }
    } catch (err: any) {
      setCredentialData(null);
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

      await verifyHashOnChain(sha256);
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

  const downloadAuditReportPDF = () => {
    if (!credentialData) return;

    const studentName = credentialData.studentName ?? credentialData[3];
    const degreeName = credentialData.degreeName ?? credentialData[4];
    const studentAddress = credentialData.student ?? credentialData[1];
    const issueDate = new Date(
      Number(credentialData.issueTimestamp ?? credentialData[5]) * 1000
    ).toLocaleString();
    const verificationTime = new Date().toLocaleString();

    const pdfReportContent = `%PDF-1.4
1 0 obj
<< /Title (Cryptographic Verification Audit Report - ${studentName})
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
(VERIFICATION STATUS   : [ PASS - AUTHENTIC & VALID ON-CHAIN ]) Tj
0 -20 Td
(VERIFIED TIMESTAMP    : ${verificationTime}) Tj
0 -20 Td
(CONTRACT ADDRESS      : ${CONTRACT_ADDRESS}) Tj
0 -20 Td
(NETWORK LEDGER        : Hardhat Local Ethereum [Chain ID: 31337]) Tj
0 -25 Td
(========================================================================) Tj
0 -25 Td
(STUDENT RECIPIENT     : ${studentName}) Tj
0 -20 Td
(DEGREE / CREDENTIAL   : ${degreeName}) Tj
0 -20 Td
(STUDENT WALLET        : ${studentAddress}) Tj
0 -20 Td
(ISSUED TIMESTAMP      : ${issueDate}) Tj
0 -20 Td
(DOCUMENT SHA-256 HASH : ${computedHash}) Tj
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
    a.download = `Verification_Audit_Report_${studentName.replace(/\s+/g, "_")}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isAuthentic = Boolean(
    credentialData && (credentialData.isValid ?? credentialData[0]) && !isRevoked
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center py-16 px-4">
      <div className="text-center max-w-xl mb-10">
        <h1 className="text-3xl font-bold tracking-tight">Instant Document Verifier</h1>
        <p className="text-slate-400 text-sm mt-2">
          Cryptographic validation against the local registry.
        </p>
      </div>

      <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="border-2 border-dashed border-slate-700 rounded-2xl p-8 text-center hover:border-blue-500 transition-colors">
          <input
            type="file"
            id="verify-file"
            onChange={handleDocumentDrop}
            className="hidden"
            accept=".pdf,.doc,.docx"
          />
          <label htmlFor="verify-file" className="cursor-pointer flex flex-col items-center">
            <span className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-semibold text-white mb-2 transition cursor-pointer">
              Choose PDF transcript
            </span>
            <span className="text-sm text-slate-400">
              {file ? file.name : "Select the document to verify"}
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
            Querying local Hardhat smart contract...
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

        {/* Valid State */}
        {hasChecked && isAuthentic && (
          <div className="p-6 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl space-y-5">
            <div className="flex items-center space-x-3 text-emerald-400">
              <span className="text-2xl">✓</span>
              <h3 className="font-bold text-lg">Verification Successful: Authentic</h3>
            </div>
            <div className="space-y-2 text-sm text-slate-300">
              <p>
                <strong className="text-slate-400">Student:</strong>{" "}
                {credentialData.studentName ?? credentialData[3]}
              </p>
              <p>
                <strong className="text-slate-400">Degree:</strong>{" "}
                {credentialData.degreeName ?? credentialData[4]}
              </p>
              <p className="break-all">
                <strong className="text-slate-400">Student Address:</strong>{" "}
                {credentialData.student ?? credentialData[1]}
              </p>
              <p>
                <strong className="text-slate-400">Issued On:</strong>{" "}
                {new Date(
                  Number(credentialData.issueTimestamp ?? credentialData[5]) * 1000
                ).toLocaleString()}
              </p>
            </div>

            <button
              onClick={downloadAuditReportPDF}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Download Official Audit Report (PDF)</span>
            </button>
          </div>
        )}

        {/* Revoked State */}
        {hasChecked && isRevoked && (
          <div className="p-6 bg-amber-950/40 border border-amber-500/40 rounded-2xl space-y-3">
            <div className="flex items-center space-x-3 text-amber-400">
              <span className="text-2xl">⚠</span>
              <h3 className="font-bold text-lg">Credential Revoked / Inactive</h3>
            </div>
            <div className="space-y-2 text-sm text-slate-300">
              {credentialData && (
                <>
                  <p>
                    <strong className="text-slate-400">Student:</strong>{" "}
                    {credentialData.studentName ?? credentialData[3]}
                  </p>
                  <p>
                    <strong className="text-slate-400">Degree:</strong>{" "}
                    {credentialData.degreeName ?? credentialData[4]}
                  </p>
                </>
              )}
              <p>
                <strong className="text-amber-400">Reason:</strong>{" "}
                {revocationDetails?.reason || "Revoked by Institution"}
              </p>
              <p>
                <strong className="text-slate-400">Revocation Date:</strong>{" "}
                {revocationDetails?.revokedAt}
              </p>
            </div>
          </div>
        )}

        {/* Tampered / Unregistered State */}
        {hasChecked && !isAuthentic && !isRevoked && !isVerifying && (
          <div className="p-6 bg-rose-950/40 border border-rose-500/40 rounded-2xl text-rose-300 space-y-2">
            <div className="flex items-center space-x-2 text-rose-400 font-bold">
              <span>✕</span>
              <span>Verification Failed: Tampered or Unregistered</span>
            </div>
            <p className="text-xs text-slate-400">
              {errorMessage ||
                "The computed document hash does not match any active credential on the local registry."}
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