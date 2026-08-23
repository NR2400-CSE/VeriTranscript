import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import Navbar from "@/components/Navbar";
import DemoAssistant from "@/components/DemoAssistant";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VeriTranscript | Blockchain Credential Ledger",
  description: "Tamper-Proof Academic Transcripts on the Blockchain",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-slate-950 text-white min-h-screen flex flex-col antialiased`}>
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <DemoAssistant />
        </Providers>
      </body>
    </html>
  );
}