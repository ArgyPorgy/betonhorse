"use client";

import { useEffect, useState } from "react";
import { BACKEND_URL } from "@/lib/constants";
import type { RaceHistoryEntry } from "@/lib/types";

export default function RaceHistory() {
  const [history, setHistory] = useState<RaceHistoryEntry[]>([]);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/race/history`);
        const data = await res.json();
        setHistory(data.races || []);
      } catch {
        // silent fail
      }
    }
    fetchHistory();
    const interval = setInterval(fetchHistory, 30000);
    return () => clearInterval(interval);
  }, []);

  if (history.length === 0) return null;

  return (
    <div className="bg-[#111] border border-[#222] rounded-lg p-4">
      <h2 className="text-sm font-bold text-white mb-3">Race History</h2>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {history.map((race, idx) => (
          <div
            key={`${race.id}-${idx}`}
            className="flex items-center justify-between py-2 px-3 bg-[#0a0a0a] border border-[#222] rounded"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#666] font-mono w-10">
                #{race.id}
              </span>
              <span className="text-sm font-medium text-white">
                {race.winnerName}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-[#666] font-mono">
                {new Date(race.settledAt).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
