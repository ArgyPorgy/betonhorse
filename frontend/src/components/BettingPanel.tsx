"use client";

import { useState, useEffect } from "react";
import { usePrivySafe as usePrivy } from "@/lib/usePrivySafe";
import { useContract } from "@/lib/useContract";
import {
  MIN_BET,
  MAX_BET,
  PAYOUT_MULTIPLIER,
  CONTRACT_ADDRESS,
} from "@/lib/constants";
import type { RaceStatus } from "@/lib/types";
import toast from "react-hot-toast";

interface BettingPanelProps {
  selectedHorse: number | null;
  selectedHorseName: string;
  raceStatus: RaceStatus;
  raceId: number | null;
  onPlaceBet: (amount: number, txHash: string) => void;
  countdown: number;
}

const QUICK_BETS = [0.001, 0.005, 0.01, 0.05, 0.1];

export default function BettingPanel({
  selectedHorse,
  selectedHorseName,
  raceStatus,
  raceId,
  onPlaceBet,
  countdown,
}: BettingPanelProps) {
  const { authenticated, login, user } = usePrivy();
  const { placeBet, getBalance, isLoading } = useContract();
  const [betAmount, setBetAmount] = useState<string>("0.01");
  const [isBetting, setIsBetting] = useState(false);
  const [walletBalance, setWalletBalance] = useState<string>("0");

  // Fetch wallet balance
  useEffect(() => {
    if (authenticated && user?.wallet?.address) {
      getBalance().then(setWalletBalance);
    }
  }, [authenticated, user, getBalance]);

  const canBet =
    authenticated &&
    selectedHorse !== null &&
    raceStatus === "OPEN" &&
    raceId !== null &&
    !isBetting &&
    !isLoading &&
    !!CONTRACT_ADDRESS;

  const potentialWin = parseFloat(betAmount || "0") * PAYOUT_MULTIPLIER;
  const hasEnoughBalance =
    parseFloat(walletBalance) >= parseFloat(betAmount || "0");

  async function handlePlaceBet() {
    if (!canBet || selectedHorse === null || raceId === null) return;

    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount < MIN_BET) {
      toast.error(`Minimum bet is ${MIN_BET} ETH`);
      return;
    }
    if (amount > MAX_BET) {
      toast.error(`Maximum bet is ${MAX_BET} ETH`);
      return;
    }
    if (!hasEnoughBalance) {
      toast.error(
        `Insufficient balance. You have ${parseFloat(walletBalance).toFixed(4)} ETH`
      );
      return;
    }

    setIsBetting(true);
    const toastId = toast.loading("Sending transaction to blockchain...");

    try {
      const result = await placeBet(raceId, selectedHorse, amount);

      toast.success(`Bet placed on-chain! TX: ${result.hash.slice(0, 10)}...`, {
        id: toastId,
        duration: 5000,
      });

      // Notify parent and refresh balance
      onPlaceBet(amount, result.hash);
      getBalance().then(setWalletBalance);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Transaction failed";
      toast.error(message, { id: toastId });
    } finally {
      setIsBetting(false);
    }
  }

  const formatCountdown = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-[#111] border border-[#222] p-6 rounded-lg space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Place Your Bet</h2>
        {raceStatus === "OPEN" && countdown > 0 && (
          <div className="status-badge status-open flex items-center gap-2">
            <div className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse" />
            {formatCountdown(countdown)}
          </div>
        )}
        {raceStatus === "LOCKED" && (
          <div className="status-badge status-locked">Locked</div>
        )}
        {raceStatus === "RUNNING" && (
          <div className="status-badge status-running">Racing</div>
        )}
        {raceStatus === "SETTLED" && (
          <div className="status-badge status-settled">Finished</div>
        )}
      </div>

      {/* Race ID & Contract */}
      <div className="flex items-center justify-between text-xs text-[#666]">
        {raceId && <span className="font-mono">Race #{raceId}</span>}
        {CONTRACT_ADDRESS && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-[#10b981] rounded-full" />
            On-chain
          </span>
        )}
      </div>

      {/* Wallet Balance */}
      {authenticated && (
        <div className="bg-[#0a0a0a] border border-[#222] rounded-lg p-3 flex items-center justify-between">
          <span className="text-xs text-[#666] uppercase tracking-wider">Your Balance</span>
          <span className="text-sm font-mono text-white">
            {parseFloat(walletBalance).toFixed(4)} ETH
          </span>
        </div>
      )}

      {/* Selected horse */}
      <div className="bg-[#0a0a0a] border border-[#222] rounded-lg p-4">
        <p className="text-xs text-[#666] mb-1 uppercase tracking-wider">Your Horse</p>
        {selectedHorse !== null ? (
          <p className="text-lg font-bold text-[#10b981]">
            {selectedHorseName}
          </p>
        ) : (
          <p className="text-sm text-[#666]">Select a horse to bet on</p>
        )}
      </div>

      {/* Bet Amount */}
      <div>
        <label className="text-xs text-[#666] mb-2 block uppercase tracking-wider">
          Bet Amount (Sepolia ETH)
        </label>
        <div className="relative">
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            min={MIN_BET}
            max={MAX_BET}
            step={0.001}
            disabled={!canBet}
            className={`w-full bg-[#0a0a0a] border rounded-lg px-4 py-3 text-lg font-mono text-white focus:outline-none transition disabled:opacity-50 ${
              !hasEnoughBalance && parseFloat(betAmount) > 0
                ? "border-red-500"
                : "border-[#333] focus:border-[#10b981]"
            }`}
            placeholder="0.01"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#666] text-sm">
            ETH
          </span>
        </div>

        {!hasEnoughBalance && parseFloat(betAmount) > 0 && (
          <p className="text-xs text-red-400 mt-1">
            Insufficient balance. Fund your wallet with Sepolia ETH.
          </p>
        )}

        {/* Quick bet buttons */}
        <div className="flex gap-2 mt-2">
          {QUICK_BETS.map((amount) => (
            <button
              key={amount}
              onClick={() => setBetAmount(amount.toString())}
              disabled={!canBet}
              className={`flex-1 py-1.5 text-xs rounded font-mono transition disabled:opacity-50 ${
                parseFloat(walletBalance) >= amount
                  ? "bg-[#1a1a1a] hover:bg-[#222] text-[#888] hover:text-white border border-[#333]"
                  : "bg-[#0a0a0a] text-[#444] border border-[#222]"
              }`}
            >
              {amount}
            </button>
          ))}
        </div>
      </div>

      {/* Potential Win */}
      <div className="bg-[#0a0a0a] border border-[#222] rounded-lg p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-[#666] uppercase tracking-wider">Potential Win</p>
          <p className="text-2xl font-bold text-[#10b981]">
            {potentialWin.toFixed(4)} ETH
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#666] uppercase tracking-wider">Multiplier</p>
          <p className="text-2xl font-bold text-white">
            {PAYOUT_MULTIPLIER}x
          </p>
        </div>
      </div>

      {/* Bet Button */}
      {!authenticated ? (
        <button
          onClick={login}
          className="bet-button w-full py-4 rounded-lg font-bold text-lg"
        >
          Connect Wallet to Bet
        </button>
      ) : !CONTRACT_ADDRESS ? (
        <button
          disabled
          className="w-full py-4 rounded-lg font-bold text-[#666] text-lg bg-[#111] border border-[#333] cursor-not-allowed"
        >
          Contract Not Configured
        </button>
      ) : (
        <button
          onClick={handlePlaceBet}
          disabled={!canBet || !hasEnoughBalance}
          className="bet-button w-full py-4 rounded-lg font-bold text-lg disabled:opacity-50"
        >
          {isBetting || isLoading
            ? "Confirming on Blockchain..."
            : raceStatus !== "OPEN"
            ? raceStatus === "RUNNING"
              ? "Race in Progress..."
              : "Waiting for Next Race..."
            : selectedHorse === null
            ? "Select a Horse First"
            : !hasEnoughBalance
            ? "Insufficient Balance"
            : `Bet ${betAmount} ETH on ${selectedHorseName}`}
        </button>
      )}

      {/* Info */}
      <p className="text-[10px] text-[#666] text-center">
        Win = {PAYOUT_MULTIPLIER}x your bet | Lose = lose it all | House edge
        applies | Testnet only
      </p>
    </div>
  );
}
