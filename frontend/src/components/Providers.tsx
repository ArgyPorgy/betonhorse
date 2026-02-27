"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { sepolia } from "viem/chains";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { wagmiConfig } from "@/lib/wagmiConfig";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";

// Context to signal Privy readiness
export const PrivyReadyContext = createContext(false);
export const usePrivyReady = () => useContext(PrivyReadyContext);

const queryClient = new QueryClient();

export default function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR / pre-render, don't mount Privy (avoids build crash)
  if (!mounted) {
    return (
      <PrivyReadyContext.Provider value={false}>
        {children}
      </PrivyReadyContext.Provider>
    );
  }

  if (!PRIVY_APP_ID) {
    return (
      <PrivyReadyContext.Provider value={false}>
        <div className="min-h-screen flex items-center justify-center bg-black text-white">
          <div className="text-center p-8">
            <h1 className="text-3xl font-bold mb-4">BetOnHorse</h1>
            <p className="text-[#888] mb-4">Privy App ID not configured.</p>
            <p className="text-[#666] text-sm">
              Set{" "}
              <code className="text-[#10b981]">NEXT_PUBLIC_PRIVY_APP_ID</code>{" "}
              in your .env file and rebuild.
            </p>
          </div>
        </div>
      </PrivyReadyContext.Provider>
    );
  }

  return (
    <PrivyReadyContext.Provider value={true}>
      <PrivyProvider
        appId={PRIVY_APP_ID}
        config={{
          // Login methods - wallet allows external wallets like MetaMask
          loginMethods: ["email", "wallet", "google"],
          appearance: {
            theme: "dark",
            accentColor: "#10b981",
            logo: "/logo.png",
          },
          // Embedded wallet config - only create for email/social logins
          embeddedWallets: {
            createOnLogin: "users-without-wallets",
            // Don't require additional security for testnet
            noPromptOnSignature: true,
          },
          // Chain config
          defaultChain: sepolia,
          supportedChains: [sepolia],
          // Allow external wallets to connect directly
          externalWallets: {
            coinbaseWallet: {
              connectionOptions: "smartWalletOnly",
            },
          },
        }}
      >
        <QueryClientProvider client={queryClient}>
          <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
        </QueryClientProvider>
      </PrivyProvider>
    </PrivyReadyContext.Provider>
  );
}
