import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@rainbow-me/rainbowkit/styles.css";
import { Providers } from "./providers";
import { ThemeProvider } from "@/components/ThemeProvider";
import Navbar from "@/components/Navbar";
import DemoAssistant from "@/components/DemoAssistant";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VeriTranscript | Blockchain Credential Ledger",
  description: "Tamper-Proof Academic Credentials on Ethereum",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen flex flex-col transition-colors duration-200`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <Providers>
            <Navbar />
            <main className="flex-grow">{children}</main>
            <DemoAssistant />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}