// "use client";

// import { useState } from "react";

// export default function DemoFloatingButton() {
//   const [open, setOpen] = useState(false);

//   const fillDemoIssuer = () => {
//     window.dispatchEvent(
//       new CustomEvent("populate-demo-issuer", {
//         detail: {
//           name: "Alice Doe",
//           degree: "Bachelor of Technology in Computer Science",
//           studentAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
//         },
//       })
//     );
//     setOpen(false);
//   };

//   const fillDemoVerify = () => {
//     window.dispatchEvent(
//       new CustomEvent("populate-demo-verify", {
//         detail: {
//           studentName: "Alice Doe",
//           degree: "Bachelor of Technology in Computer Science",
//           contractAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
//         },
//       })
//     );
//     setOpen(false);
//   };

//   return (
//     <div className="fixed bottom-6 left-6 z-50">
//       {open ? (
//         <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-2xl space-y-3 w-64 text-left backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 duration-200">
//           <div className="flex items-center justify-between border-b border-slate-800 pb-2">
//             <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
//               <span>⚡</span> Demo Quick Fill
//             </span>
//             <button
//               onClick={() => setOpen(false)}
//               className="text-slate-400 hover:text-white text-xs font-mono"
//             >
//               ✕
//             </button>
//           </div>

//           <p className="text-[11px] text-slate-400">
//             Inject preconfigured test payloads directly into forms:
//           </p>

//           <div className="space-y-1.5">
//             <button
//               onClick={fillDemoIssuer}
//               className="w-full text-left px-3 py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-xs font-medium text-blue-300 transition flex items-center justify-between"
//             >
//               <span>Auto-Fill Issuer Form</span>
//               <span>→</span>
//             </button>

//             <button
//               onClick={fillDemoVerify}
//               className="w-full text-left px-3 py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-xs font-medium text-emerald-300 transition flex items-center justify-between"
//             >
//               <span>Auto-Fill Verifier Form</span>
//               <span>→</span>
//             </button>
//           </div>
//         </div>
//       ) : (
//         <button
//           onClick={() => setOpen(true)}
//           className="group relative flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-900/90 border border-amber-500/40 text-amber-400 hover:bg-amber-500/20 shadow-lg shadow-amber-500/10 transition-all duration-200"
//           title="Open Demo Helper"
//         >
//           <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
//           <span className="text-xs font-bold tracking-wide">⚡ Demo Data</span>
//         </button>
//       )}
//     </div>
//   );
// }

"use client";

export default function DemoFloatingButton() {
  return null;
}