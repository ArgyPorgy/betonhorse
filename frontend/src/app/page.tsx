"use client";

import { useEffect, useState, useCallback } from "react";
import { usePrivySafe as usePrivy } from "@/lib/usePrivySafe";
import Header from "@/components/Header";
import HorseCard from "@/components/HorseCard";
import BettingPanel from "@/components/BettingPanel";
import RaceTrack from "@/components/RaceTrack";
import RaceHistory from "@/components/RaceHistory";
import ResultModal from "@/components/ResultModal";
import { getSocket } from "@/lib/socket";
import { BACKEND_URL } from "@/lib/constants";
import type {
  Horse,
  HorseAnimation,
  RaceStatus,
  RaceResult,
  RaceState,
} from "@/lib/types";
import toast from "react-hot-toast";

export default function Home() {
  const { authenticated, user } = usePrivy();

  // Race state
  const [raceId, setRaceId] = useState<number | null>(null);
  const [raceStatus, setRaceStatus] = useState<RaceStatus>("WAITING");
  const [horses, setHorses] = useState<Horse[]>([]);
  const [countdown, setCountdown] = useState(0);
  const [totalPool, setTotalPool] = useState(0);

  // Betting state
  const [selectedHorse, setSelectedHorse] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState(0);
  const [hasBet, setHasBet] = useState(false);

  // Animation state
  const [animation, setAnimation] = useState<HorseAnimation[] | null>(null);
  const [raceDuration, setRaceDuration] = useState(30000);
  const [winner, setWinner] = useState<number | null>(null);

  // Result
  const [raceResult, setRaceResult] = useState<RaceResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  // Fetch horses from backend
  useEffect(() => {
    async function fetchHorses() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/horses`);
        const data = await res.json();
        setHorses(data.horses);
      } catch {
        console.error("Failed to fetch horses from backend");
      }
    }
    fetchHorses();
  }, []);

  // Socket connection
  useEffect(() => {
    const socket = getSocket();

    socket.on("connect", () => {
      console.log("Connected to backend");
    });

    // Initial state
    socket.on("race:state", (state: RaceState) => {
      setRaceId(state.id);
      setRaceStatus(state.status);
      if (state.horses?.length) setHorses(state.horses);
      if (state.totalPool) setTotalPool(state.totalPool);
    });

    // Race created - new betting round
    socket.on(
      "race:created",
      (data: {
        id: number;
        horses: Horse[];
        betDeadline: number;
        seedHash: string;
      }) => {
        setRaceId(data.id);
        setRaceStatus("OPEN");
        if (data.horses?.length) setHorses(data.horses);
        setSelectedHorse(null);
        setHasBet(false);
        setWinner(null);
        setAnimation(null);
        setRaceResult(null);
        setShowResult(false);
        setTotalPool(0);
        toast("New race started. Place your bets.", {
          duration: 4000,
        });
      }
    );

    // Countdown
    socket.on(
      "race:countdown",
      (data: { remaining: number; totalPool: number }) => {
        setCountdown(data.remaining);
        setTotalPool(data.totalPool);
      }
    );

    // Race locked
    socket.on("race:locked", () => {
      setRaceStatus("LOCKED");
      setCountdown(0);
      toast("Bets are locked.", { duration: 2000 });
    });

    // Race started with animation
    socket.on(
      "race:started",
      (data: { animation: HorseAnimation[]; duration: number }) => {
        setRaceStatus("RUNNING");
        setAnimation(data.animation);
        setRaceDuration(data.duration);
        toast("Race started.", { duration: 3000 });
      }
    );

    // Race result
    socket.on("race:result", (data: RaceResult) => {
      setWinner(data.winner);
      setRaceResult(data);
      setRaceStatus("SETTLED");

      setTimeout(() => {
        setShowResult(true);
      }, 2000);
    });

    // Race settled
    socket.on("race:settled", () => {
      // Already handled by race:result
    });

    // Race skipped (no bets)
    socket.on(
      "race:skipped",
      (data: { message: string }) => {
        setRaceStatus("WAITING");
        toast(data.message, { duration: 3000 });
      }
    );

    // Cooldown
    socket.on("race:cooldown", (data: { nextRaceIn: number }) => {
      setRaceStatus("WAITING");
      toast(`Next race in ${data.nextRaceIn / 1000}s`, {
        duration: 3000,
      });
    });

    // Bet updates
    socket.on("bet:confirmed", () => {
      setHasBet(true);
    });

    socket.on("bet:error", (data: { error: string }) => {
      toast.error(data.error);
    });

    socket.on("bet:update", (data: { totalPool: number }) => {
      setTotalPool(data.totalPool);
    });

    // Error
    socket.on("race:error", (data: { message: string }) => {
      toast.error(data.message);
    });

    return () => {
      socket.off("race:state");
      socket.off("race:created");
      socket.off("race:countdown");
      socket.off("race:locked");
      socket.off("race:started");
      socket.off("race:result");
      socket.off("race:settled");
      socket.off("race:skipped");
      socket.off("race:cooldown");
      socket.off("bet:confirmed");
      socket.off("bet:error");
      socket.off("bet:update");
      socket.off("race:error");
    };
  }, []);

  const handlePlaceBet = useCallback(
    (amount: number, txHash: string) => {
      if (selectedHorse === null || !user?.wallet?.address) return;
      setBetAmount(amount);
      setHasBet(true);

      // Notify backend of the on-chain bet for tracking
      const socket = getSocket();
      socket.emit("bet:placed", {
        playerAddress: user.wallet.address,
        horseId: selectedHorse,
        amount,
        txHash,
        raceId,
      });
    },
    [selectedHorse, user, raceId]
  );

  const selectedHorseName =
    selectedHorse !== null
      ? horses.find((h) => h.id === selectedHorse)?.name || ""
      : "";

  return (
    <div className="min-h-screen relative z-10">
      <Header />

      <main className="pt-20 pb-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Title Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-black mb-3 text-white">
            Bet on Horse
          </h1>
          <p className="text-[#888] max-w-xl mx-auto">
            Pick your agentic horse, place your bet, and watch them race.
            Win 2x your stake. 
          </p>
          {totalPool > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 bg-[#111] border border-[#333] px-4 py-2 rounded-lg">
              <span className="text-xs text-[#666] uppercase tracking-wider">Race Pool:</span>
              <span className="text-sm font-bold text-[#10b981] font-mono">
                {totalPool.toFixed(4)} ETH
              </span>
            </div>
          )}
        </div>

        {/* Race Track */}
        <div className="mb-8">
          <RaceTrack
            animation={animation}
            raceStatus={raceStatus}
            winner={winner}
            duration={raceDuration}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Horse Selection - 2 columns */}
          <div className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Choose Your Horse</h2>
              {raceStatus === "OPEN" && (
                <span className="text-xs text-[#666]">
                  Tap a horse to select
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {horses.map((horse) => (
                <HorseCard
                  key={horse.id}
                  horse={horse}
                  selected={selectedHorse === horse.id}
                  onSelect={setSelectedHorse}
                  disabled={
                    raceStatus !== "OPEN" || hasBet || !authenticated
                  }
                />
              ))}
            </div>

            {/* Race History below horses */}
            <div className="mt-6">
              <RaceHistory />
            </div>
          </div>

          {/* Betting Panel - 1 column */}
          <div className="space-y-6">
            <BettingPanel
              selectedHorse={selectedHorse}
              selectedHorseName={selectedHorseName}
              raceStatus={raceStatus}
              raceId={raceId}
              onPlaceBet={handlePlaceBet}
              countdown={countdown}
            />

            {/* How it works */}
            <div className="bg-[#111] border border-[#222] p-5 rounded-lg">
              <h3 className="text-sm font-bold mb-3 text-white">How It Works</h3>
              <div className="space-y-3">
                {[
                  {
                    step: "1",
                    title: "Connect",
                    desc: "Sign in with Privy & fund your wallet with Sepolia ETH",
                  },
                  {
                    step: "2",
                    title: "Choose",
                    desc: "Pick your horse agent based on their stats",
                  },
                  {
                    step: "3",
                    title: "Bet",
                    desc: "Place your bet before the race starts",
                  },
                  {
                    step: "4",
                    title: "Watch",
                    desc: "Watch the race unfold live on the track",
                  },
                  {
                    step: "5",
                    title: "Win",
                    desc: "Win 2x your bet if your horse crosses first",
                  },
                ].map((item) => (
                  <div key={item.step} className="flex gap-3">
                    <div className="w-6 h-6 rounded bg-[#10b981]/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-[#10b981]">
                        {item.step}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{item.title}</p>
                      <p className="text-xs text-[#666]">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#222] py-6 mt-10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs text-[#666]">
            BetOnHorse — Sepolia Testnet Only — Not Real Money —{" "}
            <span className="text-[#888]">
              Provably fair agent horse racing
            </span>
          </p>
        </div>
      </footer>

      {/* Result Modal */}
      {showResult && (
        <ResultModal
          result={raceResult}
          selectedHorse={selectedHorse}
          betAmount={betAmount}
          onClose={() => setShowResult(false)}
        />
      )}
    </div>
  );
}
