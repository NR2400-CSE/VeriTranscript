import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { polygonAmoy } from 'viem/chains';

export const config = getDefaultConfig({
  appName: 'VeriTranscript',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'DEMO_PROJECT_ID',
  chains: [polygonAmoy],
  ssr: true,
});