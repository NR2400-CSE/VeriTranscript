"use client";

import { useState, useEffect } from "react";
import { useWriteContract, useAccount } from "wagmi";

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

interface IssuedRecord {
  id: string;
  docHash: string;
  studentName: string;
  degreeName: string;
  studentAddress: string;
  fileName: string;
  fileData: string;
  issuedAt: string;
  isRevoked: boolean;
}

export default function IssuerPage() {
  const { isConnected } = useAccount();
  const [tab, setTab] = useState<"single" | "batch">("single");

  const [studentName, setStudentName] = useState("");
  const [degreeName, setDegreeName] = useState("");
  const [studentAddress, setStudentAddress] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [records, setRecords] = useState<IssuedRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const { writeContractAsync } = useWriteContract();

  const fetchAllStoredRecords = (): IssuedRecord[] => {
    const raw = typeof window !== "undefined" ? localStorage.getItem("veritranscript_vault") : null;
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      const list: IssuedRecord[] = [];

      if (Array.isArray(parsed)) {
        parsed.forEach((item: any, idx: number) => {
          list.push({
            id: item.docHash || `rec-${idx}`,
            studentAddress: item.studentAddress || item.student || "0x00",
            studentName: item.studentName || item.name || "Student",
            degreeName: item.degreeName || item.degree || "Degree",
            docHash: item.docHash || `0x${idx}`,
            fileName: item.fileName || "Document.pdf",
            fileData: item.fileData || "",
            issuedAt: item.issuedAt || new Date().toLocaleDateString(),
            isRevoked: Boolean(item.isRevoked),
          });
        });
      } else if (typeof parsed === "object") {
        let idx = 0;
        for (const [addr, data] of Object.entries(parsed) as any) {
          list.push({
            id: data.docHash || `rec-${idx}-${addr}`,
            studentAddress: addr,
            studentName: data.studentName || data.name || "Student",
            degreeName: data.degreeName || data.degree || "Degree",
            docHash: data.docHash || `0x${idx}`,
            fileName: data.fileName || "Document.pdf",
            fileData: data.fileData || "",
            issuedAt: data.issuedAt || new Date().toLocaleDateString(),
            isRevoked: Boolean(data.isRevoked),
          });
          idx++;
        }
      }
      return list;
    } catch {
      return [];
    }
  };

  const syncRecords = () => {
    const all = fetchAllStoredRecords();
    setRecords([...all].reverse());
  };

  useEffect(() => {
    syncRecords();
    const interval = setInterval(syncRecords, 1500);
    return () => clearInterval(interval);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      setStatusMsg("Please connect MetaMask (Account #0 - Issuer).");
      return;
    }
    if (!studentName || !degreeName || !studentAddress) {
      setStatusMsg("Please fill in Student Name, Degree, and Wallet Address.");
      return;
    }

    setIsSubmitting(true);
    setStatusMsg("Reading file & calculating cryptographic hash...");

    try {
      let base64Data = "";
      let fileName = "Document.pdf";
      let buffer: ArrayBuffer;

      if (selectedFile) {
        base64Data = await fileToBase64(selectedFile);
        fileName = selectedFile.name;
        buffer = await selectedFile.arrayBuffer();
      } else {
        buffer = new ArrayBuffer(32);
      }

      const metaBytes = new TextEncoder().encode(`${studentName}-${degreeName}-${studentAddress}-${Date.now()}`);
      const combinedBuffer = new Uint8Array(buffer.byteLength + metaBytes.byteLength);
      combinedBuffer.set(new Uint8Array(buffer), 0);
      combinedBuffer.set(metaBytes, buffer.byteLength);

      const hashBuffer = await crypto.subtle.digest("SHA-256", combinedBuffer);
      const hexHash =
        "0x" +
        Array.from(new Uint8Array(hashBuffer))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

      setStatusMsg("Broadcasting transaction to blockchain...");

      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "issueCredential",
        args: [
          hexHash as `0x${string}`,
          studentAddress as `0x${string}`,
          `ipfs://transcript-${Date.now()}`,
          studentName,
          degreeName,
        ],
        gas: BigInt(500000),
      });

      const newRecord: IssuedRecord = {
        id: hexHash,
        studentName,
        degreeName,
        studentAddress,
        docHash: hexHash,
        fileName,
        fileData: base64Data,
        issuedAt: new Date().toLocaleString(),
        isRevoked: false,
      };

      const existing = fetchAllStoredRecords();
      const updated = [newRecord, ...existing];
      localStorage.setItem("veritranscript_vault", JSON.stringify(updated));

      setRecords(updated);
      setStatusMsg("✓ Credential issued & full document stored successfully!");
      setStudentName("");
      setDegreeName("");
      setStudentAddress("");
      setSelectedFile(null);
    } catch (err: any) {
      console.error(err);
      setStatusMsg(`Error: ${err?.shortMessage || err?.message || "Failed"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = (recordToUpdate: IssuedRecord) => {
    const existing = fetchAllStoredRecords();
    const updated = existing.map((r) => {
      const match =
        r.id === recordToUpdate.id ||
        (r.studentAddress.toLowerCase() === recordToUpdate.studentAddress.toLowerCase() &&
          r.degreeName.toLowerCase() === recordToUpdate.degreeName.toLowerCase());
      return match ? { ...r, isRevoked: true } : r;
    });

    localStorage.setItem("veritranscript_vault", JSON.stringify(updated));
    setRecords([...updated].reverse());
    setStatusMsg(`✓ Revoked credential for ${recordToUpdate.studentName}`);
    setTimeout(() => setStatusMsg(""), 3000);
  };

  const handleReinstate = (recordToUpdate: IssuedRecord) => {
    const existing = fetchAllStoredRecords();
    const updated = existing.map((r) => {
      const match =
        r.id === recordToUpdate.id ||
        (r.studentAddress.toLowerCase() === recordToUpdate.studentAddress.toLowerCase() &&
          r.degreeName.toLowerCase() === recordToUpdate.degreeName.toLowerCase());
      return match ? { ...r, isRevoked: false } : r;
    });

    localStorage.setItem("veritranscript_vault", JSON.stringify(updated));
    setRecords([...updated].reverse());
    setStatusMsg(`✓ Restored credential for ${recordToUpdate.studentName}`);
    setTimeout(() => setStatusMsg(""), 3000);
  };

  const activeCount = records.filter((r) => !r.isRevoked).length;
  const revokedCount = records.filter((r) => r.isRevoked).length;

  const filteredRecords = records.filter(
    (r) =>
      r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.studentAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.degreeName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 space-y-10">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight">University Portal</h1>
        <p className="text-sm text-slate-400">
          Issue cryptographically verifiable academic credentials on-chain.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Active Credentials
          </span>
          <p className="text-3xl font-black text-emerald-400 mt-2">{activeCount}</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Revoked Credentials
          </span>
          <p className="text-3xl font-black text-rose-500 mt-2">{revokedCount}</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Contract Network
          </span>
          <p className="text-2xl font-black text-purple-400 mt-2">Hardhat 31337</p>
        </div>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 className="text-lg font-bold">Single Student Issuance</h2>
        </div>

        <form onSubmit={handleIssue} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">
                Student Full Name
              </label>
              <input
                type="text"
                placeholder="e.g. Krishna Garg"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">
                Degree / Certificate Name
              </label>
              <input
                type="text"
                placeholder="e.g. Pan Card"
                value={degreeName}
                onChange={(e) => setDegreeName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">
              Student Wallet Address
            </label>
            <input
              type="text"
              placeholder="0x..."
              value={studentAddress}
              onChange={(e) => setStudentAddress(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">
              Official Document / Transcript File
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:text-xs file:font-semibold cursor-pointer"
            />
          </div>

          {statusMsg && (
            <p className="text-xs font-mono text-center py-2 text-blue-400">
              {statusMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-bold rounded-xl shadow-lg transition cursor-pointer"
          >
            {isSubmitting ? "Processing Transaction..." : "Issue Credential"}
          </button>
        </form>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold">Credential Registry &amp; Lifecycle Management</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live records of issued credentials with revocation/reinstatement controls.
            </p>
          </div>
          <input
            type="text"
            placeholder="Search by student, degree, or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs focus:outline-none focus:border-blue-500 w-full sm:w-64"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="pb-3 px-2">Student</th>
                <th className="pb-3 px-2">Degree</th>
                <th className="pb-3 px-2">Wallet Address</th>
                <th className="pb-3 px-2">Status</th>
                <th className="pb-3 px-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No credentials found.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec, i) => (
                  <tr key={rec.id || i} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-2 font-medium text-white">{rec.studentName}</td>
                    <td className="py-3 px-2 text-slate-300">{rec.degreeName}</td>
                    <td className="py-3 px-2 font-mono text-slate-400">
                      {rec.studentAddress.slice(0, 8)}...{rec.studentAddress.slice(-6)}
                    </td>
                    <td className="py-3 px-2">
                      {rec.isRevoked ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-bold">
                          REVOKED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                          ACTIVE
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-right">
                      {rec.isRevoked ? (
                        <button
                          type="button"
                          onClick={() => handleReinstate(rec)}
                          className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 rounded-lg text-[11px] font-semibold transition cursor-pointer"
                        >
                          Restore / Reinstate
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRevoke(rec)}
                          className="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/40 rounded-lg text-[11px] font-semibold transition cursor-pointer"
                        >
                          Revoke / Terminate
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}