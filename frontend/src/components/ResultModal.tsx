"use client";

import { useEffect, useState } from "react";
import type { RaceResult } from "@/lib/types";
import { HORSE_NAMES } from "@/lib/constants";

interface ResultModalProps {
  result: RaceResult | null;
  selectedHorse: number | null;
  betAmount: number;
  onClose: () => void;
}

export default function ResultModal({
  result,
  selectedHorse,
  betAmount,
  onClose,
}: ResultModalProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (result) {
      setTimeout(() => setShow(true), 500);
    } else {
      setShow(false);
    }
  }, [result]);

  if (!result || !show) return null;

  const didWin = selectedHorse === result.winner;
  const winAmount = didWin ? betAmount * 2 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#111] border border-[#333] p-8 rounded-lg max-w-md w-full text-center">
        {/* Result indicator */}
        <div
          className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
            didWin ? "bg-[#10b981]/20" : "bg-red-500/20"
          }`}
        >
          {didWin ? (
            <svg
              className="w-8 h-8 text-[#10b981]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          ) : (
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          )}
        </div>

        {/* Title */}
        <h2
          className={`text-3xl font-black mb-2 ${
            didWin ? "text-[#10b981]" : "text-red-500"
          }`}
        >
          {didWin ? "YOU WON" : "YOU LOST"}
        </h2>

        {/* Winner info */}
        <p className="text-[#888] mb-4">
          {result.winnerName} crossed the finish line first
        </p>

        {/* Amount */}
        {selectedHorse !== null && betAmount > 0 && (
          <div className="bg-[#0a0a0a] border border-[#222] rounded-lg p-4 mb-4">
            <p className="text-xs text-[#666] mb-1 uppercase tracking-wider">
              {didWin ? "You Won" : "You Lost"}
            </p>
            <p
              className={`text-3xl font-black font-mono ${
                didWin ? "text-[#10b981]" : "text-red-500"
              }`}
            >
              {didWin ? "+" : "-"}
              {didWin ? winAmount.toFixed(4) : betAmount.toFixed(4)} ETH
            </p>
          </div>
        )}

        {/* Probabilities */}
        <div className="text-left mb-6">
          <p className="text-xs text-[#666] mb-2 uppercase tracking-wider">
            Win Probabilities
          </p>
          <div className="space-y-1">
            {result.probabilities.map((prob, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 text-xs"
              >
                <span
                  className={`w-3 h-3 rounded inline-block ${
                    idx === result.winner
                      ? "bg-[#10b981]"
                      : "bg-[#333]"
                  }`}
                />
                <span
                  className={`flex-1 ${
                    idx === result.winner ? "text-white" : "text-[#666]"
                  }`}
                >
                  {HORSE_NAMES[idx] || `Horse #${idx + 1}`}
                  {idx === result.winner && " (Winner)"}
                </span>
                <span className="font-mono text-[#888]">
                  {(prob * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Fairness */}
        <div className="text-left mb-6 bg-[#0a0a0a] border border-[#222] rounded-lg p-3">
          <p className="text-[10px] text-[#666] mb-1 uppercase tracking-wider">
            Provably Fair Verification
          </p>
          <p className="text-[9px] font-mono text-[#555] break-all">
            Seed: {result.seed.substring(0, 32)}...
          </p>
          <p className="text-[9px] font-mono text-[#555] break-all">
            Hash: {result.seedHash.substring(0, 32)}...
          </p>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="bet-button w-full py-3 rounded-lg font-bold"
        >
          {didWin ? "Continue" : "Try Again"}
        </button>
      </div>
    </div>
  );
}
