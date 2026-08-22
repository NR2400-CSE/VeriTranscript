"use client";

import * as React from "react";
import {
  RainbowKitProvider,
  getDefaultConfig,
  getDefaultWallets,
} from "@rainbow-me/rainbowkit";
import { hardhat, polygonAmoy } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, http } from "wagmi";
import "@rainbow-me/rainbowkit/styles.css";

const config = getDefaultConfig({
  appName: "VeriTranscript",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "3a8170812b534d0ff9d794f19a901d64", // standard fallback demo id
  chains: [hardhat, polygonAmoy],
  transports: {
    [hardhat.id]: http("http://127.0.0.1:8545"),
    [polygonAmoy.id]: http(),
  },
  ssr: true,
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {mounted && children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}