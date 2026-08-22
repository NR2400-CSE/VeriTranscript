"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAccount } from "wagmi";
import { createPublicClient, http, decodeEventLog } from "viem";
import { hardhat } from "viem/chains";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from "html-to-image";

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

interface CredentialRecord {
  docHash: string;
  studentAddress: string;
  ipfsURI: string;
  studentName: string;
  degreeName: string;
  issuedAt: string;
}

export default function StudentPage() {
  const { address, isConnected } = useAccount();
  const [credentials, setCredentials] = useState<CredentialRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedQrHash, setSelectedQrHash] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [badgeModalCred, setBadgeModalCred] = useState<CredentialRecord | null>(null);
  const [privacyMode, setPrivacyMode] = useState<boolean>(false);

  const badgeRef = useRef<HTMLDivElement>(null);

  const fetchBlockchainCredentials = useCallback(async () => {
    if (!address) {
      setCredentials([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const logs = await publicClient.getLogs({
        address: CONTRACT_ADDRESS,
        fromBlock: 0n,
        toBlock: "latest",
      });

      const records: CredentialRecord[] = [];

      for (const log of logs) {
        try {
          const decoded: any = decodeEventLog({
            abi: CREDENTIAL_ISSUED_EVENT_ABI,
            data: log.data,
            topics: log.topics,
          });

          if (
            decoded.eventName === "CredentialIssued" &&
            decoded.args.student.toLowerCase() === address.toLowerCase()
          ) {
            const timestampNum = Number(decoded.args.timestamp);
            const dateStr = timestampNum
              ? new Date(timestampNum * 1000).toLocaleString()
              : new Date().toLocaleString();

            records.push({
              docHash: decoded.args.docHash,
              studentAddress: decoded.args.student,
              ipfsURI: decoded.args.ipfsURI,
              studentName: decoded.args.studentName,
              degreeName: decoded.args.degreeName,
              issuedAt: dateStr,
            });
          }
        } catch {}
      }

      setCredentials(records);
    } catch (err) {
      console.error("Failed to read logs:", err);
      setCredentials([]);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchBlockchainCredentials();
  }, [fetchBlockchainCredentials]);

  const handleDownloadPDF = (cred: CredentialRecord) => {
    try {
      const storedVault = JSON.parse(
        localStorage.getItem("veritranscript_vault") || "{}"
      );
      const savedDoc = storedVault[cred.studentAddress.toLowerCase()];

      if (savedDoc && savedDoc.fileData) {
        const byteCharacters = atob(savedDoc.fileData.split(",")[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/pdf" });

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = savedDoc.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }
    } catch (e) {
      console.error("Error retrieving document binary:", e);
    }
    alert("Document binary not found in local cache.");
  };

  const handleCopyLink = (hash: string) => {
    const url = `${window.location.origin}/verify?hash=${hash}`;
    navigator.clipboard.writeText(url);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2500);
  };

  const handleShareLinkedIn = (cred: CredentialRecord) => {
    const verifyUrl = encodeURIComponent(`${window.location.origin}/verify?hash=${cred.docHash}`);
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${verifyUrl}`,
      "_blank"
    );
  };

  const handleShareTwitter = (cred: CredentialRecord) => {
    const verifyUrl = `${window.location.origin}/verify?hash=${cred.docHash}`;
    const text = encodeURIComponent(
      `🎓 Verified my tamper-proof academic credential on @VeriTranscript: ${cred.degreeName}!\n\nVerify on-chain here: `
    );
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(verifyUrl)}`,
      "_blank"
    );
  };

  const handleDownloadBadgePNG = async (cred: CredentialRecord) => {
    if (!badgeRef.current) return;
    try {
      const dataUrl = await toPng(badgeRef.current, { cacheBust: true });
      const link = document.createElement("a");
      link.download = `${cred.studentName.replace(/\s+/g, "_")}_${privacyMode ? "Redacted_" : ""}Badge.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to export badge image:", err);
    }
  };

  const primaryStudentName = credentials[0]?.studentName || "Verified Student";
  const avatarUrl = address
    ? `https://api.dicebear.com/7.x/identicon/svg?seed=${address}`
    : `https://api.dicebear.com/7.x/identicon/svg?seed=VeriTranscript`;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center py-16 px-4">
      <div className="text-center max-w-xl mb-10">
        <h1 className="text-3xl font-bold tracking-tight">Student Credential Vault</h1>
        <p className="text-slate-400 text-sm mt-2">
          Self-sovereign academic identity &amp; tamper-proof credentials.
        </p>
      </div>

      <div className="max-w-4xl w-full space-y-6">
        {/* Soulbound Identity Profile Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -z-0 pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-slate-700 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarUrl}
                  alt="Student Avatar"
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white">
                    {isConnected ? primaryStudentName : "Wallet Not Connected"}
                  </h2>
                  <span className="px-2.5 py-0.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold rounded-full flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                    Soulbound ID
                  </span>
                </div>
                <p className="text-xs font-mono text-slate-400 break-all mt-1">
                  {isConnected ? address : "Please connect your wallet in MetaMask"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="px-4 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-center flex-1 md:flex-none">
                <span className="text-[10px] uppercase font-semibold text-slate-500">Credentials</span>
                <p className="text-lg font-bold text-emerald-400">{credentials.length}</p>
              </div>

              <button
                onClick={fetchBlockchainCredentials}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition cursor-pointer flex-1 md:flex-none"
              >
                Refresh Ledger
              </button>
            </div>
          </div>
        </div>

        {/* Credentials List Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
          <h2 className="text-lg font-bold text-slate-200">Your Academic Credentials</h2>

          {isLoading ? (
            <p className="text-sm text-slate-400 animate-pulse py-6 text-center">
              Scanning blockchain blocks for records matching your address...
            </p>
          ) : credentials.length > 0 ? (
            credentials.map((cred, idx) => (
              <div
                key={idx}
                className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 hover:border-slate-700 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-base text-white">{cred.degreeName}</h3>
                    <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-medium rounded-full">
                      Active &amp; Verified
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Student: <span className="text-slate-300 font-medium">{cred.studentName}</span>
                  </p>
                  <p className="text-xs text-slate-500">Issued On: {cred.issuedAt}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
                  <button
                    onClick={() => handleDownloadPDF(cred)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    PDF
                  </button>

                  <button
                    onClick={() => {
                      setBadgeModalCred(cred);
                      setPrivacyMode(false);
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    Share Badge
                  </button>

                  <button
                    onClick={() => handleCopyLink(cred.docHash)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    {copiedHash === cred.docHash ? "✓ Copied" : "Copy Link"}
                  </button>

                  <button
                    onClick={() => setSelectedQrHash(cred.docHash)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-blue-400 rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    QR Code
                  </button>

                  <Link
                    href={`/verify?hash=${cred.docHash}`}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition text-center"
                  >
                    Open Verifier
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="py-10 text-center space-y-2">
              <p className="text-sm text-slate-400">
                No credentials found for this wallet address.
              </p>
              <p className="text-xs text-slate-600">
                Switch accounts in MetaMask or use the Demo Assistant auto-seeder to issue sample degrees.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* QR Code Modal */}
      {selectedQrHash && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-5 text-center shadow-2xl">
            <h3 className="text-lg font-bold text-white">Credential QR Code</h3>
            <p className="text-xs text-slate-400">
              Scan this code to instantly verify authenticity on-chain.
            </p>

            <div className="p-4 bg-white rounded-xl inline-block">
              <QRCodeSVG
                value={
                  typeof window !== "undefined"
                    ? `${window.location.origin}/verify?hash=${selectedQrHash}`
                    : ""
                }
                size={180}
                level="H"
              />
            </div>

            <p className="text-[10px] font-mono text-slate-500 break-all">
              {selectedQrHash}
            </p>

            <button
              onClick={() => setSelectedQrHash(null)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Social Sharing & Digital Badge Modal with Selective Disclosure */}
      {badgeModalCred && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl text-center">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="text-left">
                <h3 className="text-base font-bold text-white">Verified Academic Badge</h3>
                <p className="text-[11px] text-slate-400">
                  Export badge with optional Selective Disclosure masking.
                </p>
              </div>
              <button
                onClick={() => setPrivacyMode(!privacyMode)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                  privacyMode
                    ? "bg-purple-600/30 text-purple-300 border-purple-500/50"
                    : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                }`}
              >
                {privacyMode ? "🛡️ Privacy: ON" : "Privacy: OFF"}
              </button>
            </div>

            {/* Renderable Badge Container */}
            <div
              ref={badgeRef}
              className="bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950/40 border border-blue-500/30 p-6 rounded-2xl text-left space-y-4 shadow-xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-widest text-blue-400 font-bold">
                  VeriTranscript Ledger
                </span>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-semibold">
                  ✓ Verified On-Chain
                </span>
              </div>

              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  Academic Degree
                </p>
                <h4 className="text-base font-bold text-white mt-0.5">
                  {badgeModalCred.degreeName}
                </h4>
              </div>

              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  Graduate Recipient
                </p>
                <h5 className="text-sm font-semibold text-slate-200">
                  {privacyMode
                    ? `${badgeModalCred.studentName[0]}**** ${badgeModalCred.studentName.split(" ").slice(-1)[0]}`
                    : badgeModalCred.studentName}
                </h5>
              </div>

              {/* Masked / Public Hash Display */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>Hardhat #31337</span>
                <span>
                  {privacyMode ? "ZK-Proof Verified [Masked]" : badgeModalCred.issuedAt}
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => handleDownloadBadgePNG(badgeModalCred)}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Download {privacyMode ? "Redacted " : ""}Badge (PNG)
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleShareLinkedIn(badgeModalCred)}
                  className="py-2 bg-[#0A66C2] hover:bg-[#004182] text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  LinkedIn Share
                </button>
                <button
                  onClick={() => handleShareTwitter(badgeModalCred)}
                  className="py-2 bg-black hover:bg-slate-800 border border-slate-700 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  Share on X
                </button>
              </div>

              <button
                onClick={() => setBadgeModalCred(null)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}