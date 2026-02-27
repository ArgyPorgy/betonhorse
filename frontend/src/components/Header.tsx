"use client";

import { usePrivySafe as usePrivy } from "@/lib/usePrivySafe";
import { useState } from "react";
import Image from "next/image";

export default function Header() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const [showWallet, setShowWallet] = useState(false);

  const walletAddress = user?.wallet?.address;
  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : null;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-sm border-b border-[#222]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="BetOnHorse"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <div>
              <h1 className="text-xl font-bold text-white">BetOnHorse</h1>
              <p className="text-[10px] text-[#666] -mt-1 font-medium tracking-wider uppercase">
                Sepolia Testnet
              </p>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {ready && !authenticated && (
              <button
                onClick={login}
                className="bet-button px-5 py-2 rounded-lg font-semibold text-sm"
              >
                Connect Wallet
              </button>
            )}

            {ready && authenticated && (
              <div className="flex items-center gap-3">
                {/* Wallet Info */}
                <button
                  onClick={() => setShowWallet(!showWallet)}
                  className="bg-[#111] border border-[#333] px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:border-[#10b981] transition-all cursor-pointer"
                >
                  <div className="w-2 h-2 rounded-full bg-[#10b981]" />
                  <span className="text-[#999] font-mono">{shortAddress}</span>
                </button>

                {/* Wallet dropdown */}
                {showWallet && (
                  <div className="absolute top-16 right-4 bg-[#111] border border-[#333] p-4 rounded-lg w-72 shadow-2xl">
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-[#666] uppercase tracking-wider mb-1">
                          Wallet Address
                        </p>
                        <p className="text-sm font-mono text-[#ccc] break-all">
                          {walletAddress}
                        </p>
                      </div>
                      <div className="pt-3 border-t border-[#222]">
                        <p className="text-xs text-[#666] mb-2">
                          Send Sepolia ETH to this address to fund your account
                        </p>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(walletAddress || "");
                          }}
                          className="w-full py-2 px-3 bg-[#0a0a0a] border border-[#333] rounded-lg text-xs text-[#999] hover:text-white hover:border-[#10b981] transition"
                        >
                          Copy Address
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Logout */}
                <button
                  onClick={logout}
                  className="px-3 py-2 rounded-lg text-sm text-[#666] hover:text-white hover:bg-[#111] transition"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
