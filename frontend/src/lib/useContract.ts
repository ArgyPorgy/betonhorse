"use client";

import { useCallback, useState } from "react";
import { useWallets, usePrivy } from "@privy-io/react-auth";
import {
  createPublicClient,
  createWalletClient,
  custom,
  parseEther,
  formatEther,
  http,
} from "viem";
import { sepolia } from "viem/chains";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "./constants";

const SEPOLIA_RPC = "https://ethereum-sepolia-rpc.publicnode.com";

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(SEPOLIA_RPC),
});

export function useContract() {
  const { wallets } = useWallets();
  const { user } = usePrivy();
  const [isLoading, setIsLoading] = useState(false);

  // Get the best available wallet (prefer embedded, fallback to external)
  const getActiveWallet = useCallback(() => {
    if (!wallets || wallets.length === 0) return null;

    // First try embedded wallet
    const embedded = wallets.find((w) => w.walletClientType === "privy");
    if (embedded) return embedded;

    // Fallback to first wallet (all wallets in useWallets are connected)
    return wallets[0];
  }, [wallets]);

  const getWalletClient = useCallback(async () => {
    const wallet = getActiveWallet();
    if (!wallet) {
      throw new Error("No wallet found. Please connect your wallet first.");
    }

    // Switch to Sepolia if needed
    try {
      await wallet.switchChain(sepolia.id);
    } catch {
      // Chain switch might fail if already on correct chain, that's ok
    }

    const provider = await wallet.getEthereumProvider();
    return createWalletClient({
      chain: sepolia,
      transport: custom(provider),
      account: wallet.address as `0x${string}`,
    });
  }, [getActiveWallet]);

  const getBalance = useCallback(async (): Promise<string> => {
    const wallet = getActiveWallet();
    if (!wallet) return "0";

    try {
      const balance = await publicClient.getBalance({
        address: wallet.address as `0x${string}`,
      });
      return formatEther(balance);
    } catch {
      return "0";
    }
  }, [getActiveWallet]);

  const getWalletAddress = useCallback((): string | null => {
    const wallet = getActiveWallet();
    return wallet?.address || user?.wallet?.address || null;
  }, [getActiveWallet, user]);

  const placeBet = useCallback(
    async (raceId: number, horseId: number, amountEth: number) => {
      if (!CONTRACT_ADDRESS) {
        throw new Error("Contract address not configured");
      }

      const wallet = getActiveWallet();
      if (!wallet) {
        throw new Error("No wallet connected. Please login first.");
      }

      setIsLoading(true);
      try {
        // Check balance first
        const balance = await publicClient.getBalance({
          address: wallet.address as `0x${string}`,
        });
        const betAmount = parseEther(amountEth.toString());

        if (balance < betAmount) {
          throw new Error(
            `Insufficient balance. You have ${formatEther(balance)} ETH but need ${amountEth} ETH. Fund your wallet with Sepolia ETH first.`
          );
        }

        // Get wallet client
        const walletClient = await getWalletClient();

        // Simulate the transaction first to check for errors
        try {
          await publicClient.simulateContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: CONTRACT_ABI,
            functionName: "placeBet",
            args: [BigInt(raceId), horseId],
            value: betAmount,
            account: wallet.address as `0x${string}`,
          });
        } catch (simError: unknown) {
          // Parse simulation error for better message
          const errMsg =
            simError instanceof Error ? simError.message : String(simError);
          if (errMsg.includes("Race not open")) {
            throw new Error(
              "Race is not open for bets. Wait for the next race."
            );
          }
          if (errMsg.includes("Bet too small")) {
            throw new Error("Bet amount is too small. Minimum is 0.001 ETH.");
          }
          if (errMsg.includes("Bet too large")) {
            throw new Error("Bet amount is too large. Maximum is 1 ETH.");
          }
          if (errMsg.includes("Race does not exist")) {
            throw new Error("Race does not exist yet. Wait for a new race to start.");
          }
          // Log full error for debugging
          console.error("Contract simulation error:", simError);
          throw new Error(`Contract error: ${errMsg.slice(0, 100)}`);
        }

        // Send the transaction
        const hash = await walletClient.writeContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: CONTRACT_ABI,
          functionName: "placeBet",
          args: [BigInt(raceId), horseId],
          value: betAmount,
          account: wallet.address as `0x${string}`,
          chain: sepolia,
        });

        // Wait for confirmation
        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          confirmations: 1,
        });

        return {
          success: true,
          hash,
          receipt,
        };
      } catch (error: unknown) {
        // Handle user rejection
        const errMsg = error instanceof Error ? error.message : String(error);
        if (
          errMsg.includes("User rejected") ||
          errMsg.includes("User denied") ||
          errMsg.includes("user rejected") ||
          errMsg.includes("User exited") ||
          errMsg.includes("User cancelled")
        ) {
          throw new Error("Transaction cancelled.");
        }
        if (errMsg.includes("Recovery method")) {
          throw new Error(
            "Wallet setup incomplete. Try logging out and back in, or use an external wallet like MetaMask."
          );
        }
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [getWalletClient, getActiveWallet]
  );

  const claimWinnings = useCallback(
    async (betId: number) => {
      if (!CONTRACT_ADDRESS) {
        throw new Error("Contract address not configured");
      }

      const wallet = getActiveWallet();
      if (!wallet) {
        throw new Error("No wallet connected");
      }

      setIsLoading(true);
      try {
        const walletClient = await getWalletClient();

        const hash = await walletClient.writeContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: CONTRACT_ABI,
          functionName: "claim",
          args: [BigInt(betId)],
          account: wallet.address as `0x${string}`,
          chain: sepolia,
        });

        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          confirmations: 1,
        });

        return {
          success: true,
          hash,
          receipt,
        };
      } finally {
        setIsLoading(false);
      }
    },
    [getWalletClient, getActiveWallet]
  );

  const getPlayerBets = useCallback(async (playerAddress: string) => {
    if (!CONTRACT_ADDRESS) return [];

    try {
      const betIds = await publicClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: "getPlayerBets",
        args: [playerAddress as `0x${string}`],
      });
      return betIds as bigint[];
    } catch {
      return [];
    }
  }, []);

  return {
    placeBet,
    claimWinnings,
    getBalance,
    getPlayerBets,
    getWalletAddress,
    isLoading,
  };
}
