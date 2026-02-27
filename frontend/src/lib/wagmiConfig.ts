"use client";

import { createConfig, http } from "wagmi";
import { sepolia } from "wagmi/chains";

// Use a reliable RPC endpoint
const SEPOLIA_RPC = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";

export const wagmiConfig = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(SEPOLIA_RPC),
  },
});
