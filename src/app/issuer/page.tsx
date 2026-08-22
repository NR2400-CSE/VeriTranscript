"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { createPublicClient, http, decodeEventLog } from "viem";
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
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
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

interface IssuedAuditRecord {
  docHash: string;
  studentAddress: string;
  studentName: string;
  degreeName: string;
  issuedAt: string;
  isRevoked?: boolean;
}

interface BatchStudentEntry {
  studentName: string;
  degreeName: string;
  studentAddress: string;
  status: "pending" | "processing" | "completed" | "error";
  docHash?: string;
  error?: string;
}

export default function IssuerPage() {
  const { isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<"single" | "batch">("single");

  // Single form states
  const [studentName, setStudentName] = useState("");
  const [degreeName, setDegreeName] = useState("");
  const [studentAddress, setStudentAddress] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [docHash, setDocHash] = useState<string>("");
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Batch states
  const [batchList, setBatchList] = useState<BatchStudentEntry[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  // Audit logs
  const [auditLogs, setAuditLogs] = useState<IssuedAuditRecord[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);

  const { data: hash, writeContractAsync } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  const fetchAuditLogs = useCallback(async () => {
    setIsLoadingLogs(true);
    try {
      const logs = await publicClient.getLogs({
        address: CONTRACT_ADDRESS,
        fromBlock: 0n,
        toBlock: "latest",
      });

      const revokedMap = JSON.parse(
        localStorage.getItem("veritranscript_revocations") || "{}"
      );

      const records: IssuedAuditRecord[] = [];

      for (const log of logs) {
        try {
          const decoded: any = decodeEventLog({
            abi: CONTRACT_ABI,
            data: log.data,
            topics: log.topics,
          });

          if (decoded.eventName === "CredentialIssued") {
            const timestampNum = Number(decoded.args.timestamp);
            const dateStr = timestampNum
              ? new Date(timestampNum * 1000).toLocaleString()
              : new Date().toLocaleString();

            const dHash = decoded.args.docHash.toLowerCase();

            records.unshift({
              docHash: decoded.args.docHash,
              studentAddress: decoded.args.student,
              studentName: decoded.args.studentName,
              degreeName: decoded.args.degreeName,
              issuedAt: dateStr,
              isRevoked: Boolean(revokedMap[dHash]),
            });
          }
        } catch {}
      }

      setAuditLogs(records);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setIsLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  useEffect(() => {
    if (isConfirmed) {
      fetchAuditLogs();
    }
  }, [isConfirmed, fetchAuditLogs]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const selectedFile = e.target.files[0];
    setFile(selectedFile);

    const arrayBuffer = await selectedFile.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hexHash =
      "0x" + hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    setDocHash(hexHash);
  };

  const handleIssueCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName || !degreeName || !studentAddress || !docHash || !file) {
      setStatusMsg("Please fill in all fields and select a file.");
      return;
    }

    try {
      setIsSubmitting(true);
      setStatusMsg("Submitting transaction to Hardhat blockchain...");

      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const mockIpfsURI = `ipfs://local-transcript-${Date.now()}`;
      const contractAddress = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
        "0x5FbDB2315678afecb367f032d93F642f64180aa3") as `0x${string}`;

      await writeContractAsync({
        address: contractAddress,
        abi: CONTRACT_ABI,
        functionName: "issueCredential",
        args: [
          docHash as `0x${string}`,
          studentAddress as `0x${string}`,
          mockIpfsURI,
          studentName,
          degreeName,
        ],
      });

      const studentKey = studentAddress.trim().toLowerCase();
      const existingVault = JSON.parse(
        localStorage.getItem("veritranscript_vault") || "{}"
      );

      existingVault[studentKey] = {
        studentName: studentName.trim(),
        degreeName: degreeName.trim(),
        docHash: docHash,
        fileName: file.name,
        fileData: fileBase64,
        issuedAt: new Date().toLocaleString(),
      };

      localStorage.setItem("veritranscript_vault", JSON.stringify(existingVault));

      setStatusMsg("Transaction submitted! Waiting for confirmation...");
    } catch (err: any) {
      console.error(err);
      setStatusMsg(`Error: ${err?.message || "Transaction failed"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // CSV Batch Parsing
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const csvFile = e.target.files[0];

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
      
      const parsed: BatchStudentEntry[] = [];
      // Skip header line if it contains 'name'
      const startIdx = lines[0].toLowerCase().includes("name") ? 1 : 0;

      for (let i = startIdx; i < lines.length; i++) {
        const parts = lines[i].split(",").map((p) => p.trim().replace(/^["']|["']$/g, ""));
        if (parts.length >= 3) {
          parsed.push({
            studentName: parts[0],
            degreeName: parts[1],
            studentAddress: parts[2],
            status: "pending",
          });
        }
      }
      setBatchList(parsed);
    };
    reader.readAsText(csvFile);
  };

  const downloadSampleCSV = () => {
    const sample = `StudentName,DegreeName,StudentWalletAddress\nAlice Doe,Bachelor of Computer Science,0x5e3f7ad8cf6d8d138473f6b91fac83ef6f2f1333\nKrishna Garg,BTECH IN ECE,0x41b7162cd09310ec14637b41d9a827c22d79038f\nNaman Raj,BTECH IN CSE,0x195c6be43f03317e26235905a09a15da4210e3f7`;
    const blob = new Blob([sample], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "veritranscript_batch_sample.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const processBatchMinting = async () => {
    if (batchList.length === 0 || isBatchProcessing) return;
    setIsBatchProcessing(true);

    const contractAddress = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
      "0x5FbDB2315678afecb367f032d93F642f64180aa3") as `0x${string}`;

    const updatedList = [...batchList];

    for (let i = 0; i < updatedList.length; i++) {
      if (updatedList[i].status === "completed") continue;

      updatedList[i].status = "processing";
      setBatchList([...updatedList]);

      try {
        // Generate deterministic unique digest for batch row
        const dataEncoder = new TextEncoder();
        const rawBytes = dataEncoder.encode(
          `${updatedList[i].studentName}-${updatedList[i].degreeName}-${updatedList[i].studentAddress}-${Date.now()}`
        );
        const hashBuf = await crypto.subtle.digest("SHA-256", rawBytes);
        const hex =
          "0x" +
          Array.from(new Uint8Array(hashBuf))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");

        const mockURI = `ipfs://batch-credential-${Date.now()}-${i}`;

        await writeContractAsync({
          address: contractAddress,
          abi: CONTRACT_ABI,
          functionName: "issueCredential",
          args: [
            hex as `0x${string}`,
            updatedList[i].studentAddress as `0x${string}`,
            mockURI,
            updatedList[i].studentName,
            updatedList[i].degreeName,
          ],
        });

        // Store generated certificate
        const studentKey = updatedList[i].studentAddress.trim().toLowerCase();
        const existingVault = JSON.parse(
          localStorage.getItem("veritranscript_vault") || "{}"
        );
        existingVault[studentKey] = {
          studentName: updatedList[i].studentName,
          degreeName: updatedList[i].degreeName,
          docHash: hex,
          fileName: `${updatedList[i].studentName.replace(/\s+/g, "_")}_Transcript.pdf`,
          fileData: "",
          issuedAt: new Date().toLocaleString(),
        };
        localStorage.setItem("veritranscript_vault", JSON.stringify(existingVault));

        updatedList[i].status = "completed";
        updatedList[i].docHash = hex;
      } catch (err: any) {
        console.error("Batch row failed:", err);
        updatedList[i].status = "error";
        updatedList[i].error = err?.shortMessage || err?.message || "Transaction rejected";
      }

      setBatchList([...updatedList]);
    }

    setIsBatchProcessing(false);
    fetchAuditLogs();
  };

  const toggleRevokeStatus = (targetHash: string, currentStatus?: boolean) => {
    const revokedMap = JSON.parse(
      localStorage.getItem("veritranscript_revocations") || "{}"
    );
    const key = targetHash.toLowerCase();

    if (currentStatus) {
      delete revokedMap[key];
    } else {
      revokedMap[key] = {
        revokedAt: new Date().toLocaleString(),
        reason: "Administrative Action / Certificate Revoked by University",
      };
    }

    localStorage.setItem("veritranscript_revocations", JSON.stringify(revokedMap));
    fetchAuditLogs();
  };

  const activeCount = auditLogs.filter((l) => !l.isRevoked).length;
  const revokedCount = auditLogs.filter((l) => l.isRevoked).length;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center py-12 px-4">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">University Portal</h1>
          <p className="text-slate-400 text-sm">
            Issue cryptographically verifiable academic credentials on-chain.
          </p>
        </div>

        {/* Counter Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">
              Active Credentials
            </span>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{activeCount}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">
              Revoked Credentials
            </span>
            <p className="text-2xl font-bold text-rose-400 mt-1">{revokedCount}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">
              Contract Network
            </span>
            <p className="text-2xl font-bold text-purple-400 mt-1">Hardhat 31337</p>
          </div>
        </div>

        {/* Issuance Workspace Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl space-y-6">
          {/* Mode Switcher Tabs */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h2 className="text-xl font-bold text-slate-200">
              {activeTab === "single" ? "Single Student Issuance" : "Batch CSV Issuance"}
            </h2>

            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
              <button
                onClick={() => setActiveTab("single")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === "single"
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Single Entry
              </button>
              <button
                onClick={() => setActiveTab("batch")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === "batch"
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Batch Upload CSV
              </button>
            </div>
          </div>

          {/* Single Form Tab */}
          {activeTab === "single" ? (
            <form onSubmit={handleIssueCredential} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Student Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Alice Doe"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Degree / Certificate Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bachelor of Technology"
                    value={degreeName}
                    onChange={(e) => setDegreeName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Student Wallet Address
                </label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={studentAddress}
                  onChange={(e) => setStudentAddress(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500 font-mono text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Official Transcript PDF
                </label>
                <div className="border-2 border-dashed border-slate-800 rounded-xl p-6 text-center hover:border-blue-500 transition-colors">
                  <input
                    type="file"
                    id="file-upload"
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.doc,.docx"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <span className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium text-white mb-2 transition">
                      Choose file
                    </span>
                    <span className="text-sm text-slate-400">
                      {file ? file.name : "Select a transcript file"}
                    </span>
                  </label>
                </div>
              </div>

              {docHash && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <p className="text-xs text-slate-500 font-medium mb-1">
                    Client-Side SHA-256 Digest:
                  </p>
                  <p className="text-xs font-mono text-blue-400 break-all">{docHash}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={!isConnected || isSubmitting || isConfirming}
                className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-semibold rounded-xl shadow-lg transition duration-200 cursor-pointer"
              >
                {isSubmitting || isConfirming
                  ? "Processing on Blockchain..."
                  : "Issue Credential on Blockchain"}
              </button>

              {statusMsg && (
                <div className="mt-4 p-3 bg-slate-950 border border-slate-800 rounded-xl text-center text-sm text-slate-300">
                  {statusMsg}
                </div>
              )}

              {isConfirmed && (
                <div className="mt-4 p-3 bg-emerald-950/50 border border-emerald-500/50 rounded-xl text-center text-sm text-emerald-300">
                  ✓ Credential successfully confirmed on blockchain!
                </div>
              )}
            </form>
          ) : (
            /* Batch Upload Tab */
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-slate-950 border border-slate-800 rounded-xl">
                <div>
                  <h3 className="text-sm font-semibold text-white">Upload Graduation CSV</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Columns: StudentName, DegreeName, StudentWalletAddress
                  </p>
                </div>
                <button
                  type="button"
                  onClick={downloadSampleCSV}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 text-xs font-semibold rounded-lg border border-slate-700 transition cursor-pointer"
                >
                  Download Sample CSV
                </button>
              </div>

              <div className="border-2 border-dashed border-slate-800 rounded-xl p-6 text-center hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  id="csv-upload"
                  onChange={handleCSVUpload}
                  className="hidden"
                  accept=".csv,.txt"
                />
                <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center">
                  <span className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium text-white mb-2 transition">
                    Select CSV File
                  </span>
                  <span className="text-sm text-slate-400">
                    {batchList.length > 0
                      ? `${batchList.length} students loaded from CSV`
                      : "Upload .csv graduating student roster"}
                  </span>
                </label>
              </div>

              {batchList.length > 0 && (
                <div className="space-y-4">
                  <div className="overflow-x-auto max-h-60 overflow-y-auto border border-slate-800 rounded-xl">
                    <table className="w-full text-left text-xs text-slate-400">
                      <thead className="bg-slate-950 text-slate-300 uppercase tracking-wider text-[11px] sticky top-0">
                        <tr>
                          <th className="py-2.5 px-3">Student</th>
                          <th className="py-2.5 px-3">Degree</th>
                          <th className="py-2.5 px-3">Wallet</th>
                          <th className="py-2.5 px-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 font-mono">
                        {batchList.map((st, i) => (
                          <tr key={i} className="hover:bg-slate-800/30">
                            <td className="py-2 px-3 font-sans text-white">{st.studentName}</td>
                            <td className="py-2 px-3 font-sans text-slate-300">{st.degreeName}</td>
                            <td className="py-2 px-3 text-blue-400">
                              {st.studentAddress.slice(0, 6)}...{st.studentAddress.slice(-4)}
                            </td>
                            <td className="py-2 px-3 text-right font-sans">
                              {st.status === "completed" && (
                                <span className="text-emerald-400 font-semibold">✓ Issued</span>
                              )}
                              {st.status === "processing" && (
                                <span className="text-blue-400 animate-pulse font-semibold">
                                  Minting...
                                </span>
                              )}
                              {st.status === "pending" && (
                                <span className="text-slate-500">Pending</span>
                              )}
                              {st.status === "error" && (
                                <span className="text-rose-400 font-semibold">Failed</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button
                    type="button"
                    onClick={processBatchMinting}
                    disabled={!isConnected || isBatchProcessing}
                    className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-semibold rounded-xl shadow-lg transition duration-200 cursor-pointer"
                  >
                    {isBatchProcessing
                      ? "Executing Sequential Blockchain Mints..."
                      : `Issue All ${batchList.length} Credentials on Blockchain`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Audit Log Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-200">On-Chain Issuance Audit Log</h2>
            <button
              onClick={fetchAuditLogs}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition cursor-pointer"
            >
              Refresh
            </button>
          </div>

          {isLoadingLogs ? (
            <p className="text-sm text-slate-400 animate-pulse py-4 text-center">
              Loading issuance events from blockchain...
            </p>
          ) : auditLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-400">
                <thead className="bg-slate-950 text-slate-300 uppercase tracking-wider text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Degree</th>
                    <th className="py-3 px-4">Wallet Address</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Issued Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {auditLogs.map((log, index) => (
                    <tr key={index} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-sans font-medium text-white">
                        {log.studentName}
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-300">{log.degreeName}</td>
                      <td className="py-3 px-4 text-blue-400">
                        {log.studentAddress.slice(0, 6)}...{log.studentAddress.slice(-4)}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        {log.isRevoked ? (
                          <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-full text-[10px] font-semibold">
                            Revoked
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-semibold">
                            Valid
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-sans">{log.issuedAt}</td>
                      <td className="py-3 px-4 text-right font-sans whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleRevokeStatus(log.docHash, log.isRevoked)}
                            className={`w-16 py-1 border rounded-lg text-[11px] font-semibold text-center transition cursor-pointer ${
                              log.isRevoked
                                ? "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                                : "bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border-rose-500/30"
                            }`}
                          >
                            {log.isRevoked ? "Restore" : "Revoke"}
                          </button>
                          <Link
                            href={`/verify?hash=${log.docHash}`}
                            className="w-14 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg text-[11px] font-semibold text-center transition inline-block"
                          >
                            Verify
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-400 py-4 text-center">
              No credentials have been issued on this smart contract yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}