"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { HorseAnimation, RaceStatus } from "@/lib/types";

interface RaceTrackProps {
  animation: HorseAnimation[] | null;
  raceStatus: RaceStatus;
  winner: number | null;
  duration: number;
}

const TRACK_HEIGHT = 420;
const LANE_HEIGHT = 60;
const HORSE_SIZE = 48;
const TRACK_PADDING = 30;
const FINISH_LINE_X_RATIO = 0.92;

// Horse data - names and image paths
const HORSE_DATA = [
  { name: "Alexa", image: "/alexa.png", color: "#10b981" },
  { name: "Dan", image: "/dan.png", color: "#3b82f6" },
  { name: "Peter", image: "/peter.png", color: "#f59e0b" },
  { name: "Robert", image: "/robert.png", color: "#ef4444" },
  { name: "Robin", image: "/robin.png", color: "#8b5cf6" },
  { name: "Tommy", image: "/tommy.png", color: "#06b6d4" },
];

export default function RaceTrack({
  animation,
  raceStatus,
  winner,
  duration,
}: RaceTrackProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [currentPositions, setCurrentPositions] = useState<number[]>(
    new Array(6).fill(0)
  );

  // Preload horse images
  useEffect(() => {
    let loadedCount = 0;
    const images: HTMLImageElement[] = [];

    HORSE_DATA.forEach((horse, idx) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        loadedCount++;
        if (loadedCount === HORSE_DATA.length) {
          setImagesLoaded(true);
        }
      };
      img.onerror = () => {
        // If image fails, still count as loaded (will use fallback)
        loadedCount++;
        if (loadedCount === HORSE_DATA.length) {
          setImagesLoaded(true);
        }
      };
      img.src = horse.image;
      images[idx] = img;
    });

    imagesRef.current = images;
  }, []);

  const drawTrack = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      width: number,
      positions: number[],
      progress: number,
      showFinish: boolean
    ) => {
      // Clear
      ctx.clearRect(0, 0, width, TRACK_HEIGHT);

      // Background - pure black
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, TRACK_HEIGHT);

      // Track surface with subtle texture
      const trackStartY = TRACK_PADDING;
      const trackEndY = TRACK_HEIGHT - TRACK_PADDING;
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, trackStartY, width, trackEndY - trackStartY);

      const finishX = width * FINISH_LINE_X_RATIO;

      // Lane dividers
      for (let i = 0; i <= 6; i++) {
        const y = trackStartY + i * LANE_HEIGHT;
        ctx.strokeStyle = "rgba(51, 51, 51, 0.5)";
        ctx.lineWidth = 1;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.moveTo(70, y);
        ctx.lineTo(width - 10, y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Finish line
      const finishWidth = 6;
      for (let y = trackStartY; y < trackEndY; y += 8) {
        for (let x = 0; x < finishWidth; x += 8) {
          const isWhite = ((y - trackStartY) / 8 + x / 8) % 2 === 0;
          ctx.fillStyle = isWhite
            ? "rgba(255, 255, 255, 0.8)"
            : "rgba(0, 0, 0, 0.5)";
          ctx.fillRect(finishX + x, y, 8, 8);
        }
      }

      // "FINISH" label
      ctx.save();
      ctx.font = "bold 10px 'Space Grotesk', sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.textAlign = "center";
      ctx.fillText("FINISH", finishX + finishWidth / 2, trackStartY - 8);
      ctx.restore();

      // Distance markers
      for (let pct = 0.25; pct < FINISH_LINE_X_RATIO; pct += 0.25) {
        const mx = 70 + (finishX - 70) * (pct / FINISH_LINE_X_RATIO);
        ctx.strokeStyle = "rgba(51, 51, 51, 0.3)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(mx, trackStartY);
        ctx.lineTo(mx, trackEndY);
        ctx.stroke();

        ctx.font = "9px 'Space Grotesk', sans-serif";
        ctx.fillStyle = "rgba(100, 100, 100, 0.5)";
        ctx.textAlign = "center";
        ctx.fillText(`${Math.round(pct * 100)}%`, mx, trackEndY + 14);
      }

      // Draw horses
      for (let i = 0; i < 6; i++) {
        const horse = HORSE_DATA[i];
        const laneY = trackStartY + i * LANE_HEIGHT + LANE_HEIGHT / 2;
        const pos = positions[i] || 0;

        // Horse position: from start (70px) to finish line
        const trackWidth = finishX - 70;
        const horseX = 70 + pos * trackWidth;

        // Lane label with horse name
        ctx.font = "bold 10px 'Space Grotesk', sans-serif";
        ctx.fillStyle = "#666666";
        ctx.textAlign = "right";
        ctx.fillText(horse.name.toUpperCase(), 65, laneY + 4);

        // Shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.beginPath();
        ctx.ellipse(
          horseX,
          laneY + HORSE_SIZE / 2 + 2,
          HORSE_SIZE / 2,
          4,
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();

        // Draw horse image or fallback
        const img = imagesRef.current[i];
        if (imagesLoaded && img && img.complete && img.naturalWidth > 0) {
          // Draw circular clipped image
          ctx.save();
          ctx.beginPath();
          ctx.arc(horseX, laneY, HORSE_SIZE / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();

          ctx.drawImage(
            img,
            horseX - HORSE_SIZE / 2,
            laneY - HORSE_SIZE / 2,
            HORSE_SIZE,
            HORSE_SIZE
          );
          ctx.restore();

          // Border around image
          ctx.strokeStyle = winner === i && showFinish ? "#10b981" : "#333333";
          ctx.lineWidth = winner === i && showFinish ? 3 : 2;
          ctx.beginPath();
          ctx.arc(horseX, laneY, HORSE_SIZE / 2, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          // Fallback: colored circle with initial
          ctx.fillStyle = "#222222";
          ctx.beginPath();
          ctx.arc(horseX, laneY, HORSE_SIZE / 2, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = winner === i && showFinish ? "#10b981" : "#333333";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(horseX, laneY, HORSE_SIZE / 2, 0, Math.PI * 2);
          ctx.stroke();

          ctx.font = "bold 18px 'Space Grotesk', sans-serif";
          ctx.textAlign = "center";
          ctx.fillStyle = "#ffffff";
          ctx.fillText(horse.name[0], horseX, laneY + 6);
        }

        // Dust trail during race
        if (raceStatus === "RUNNING" && pos > 0.02) {
          for (let d = 0; d < 4; d++) {
            const dustX =
              horseX - HORSE_SIZE / 2 - 10 - d * 10 + Math.random() * 6;
            const dustY = laneY + HORSE_SIZE / 4 + Math.random() * 10;
            const dustAlpha = 0.3 - d * 0.07;
            const dustSize = 4 + Math.random() * 4;
            ctx.fillStyle = `rgba(80, 80, 80, ${dustAlpha})`;
            ctx.beginPath();
            ctx.arc(dustX, dustY, dustSize, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Winner indicator
        if (showFinish && winner === i) {
          // Glow effect
          ctx.shadowColor = "#10b981";
          ctx.shadowBlur = 20;
          ctx.strokeStyle = "#10b981";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(horseX, laneY, HORSE_SIZE / 2 + 4, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Winner label
          ctx.font = "bold 10px 'Space Grotesk', sans-serif";
          ctx.fillStyle = "#10b981";
          ctx.textAlign = "center";
          ctx.fillText("WINNER", horseX, laneY - HORSE_SIZE / 2 - 8);
        }

        // Position percentage
        if (raceStatus === "RUNNING" || showFinish) {
          ctx.font = "bold 10px 'Space Grotesk', sans-serif";
          ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
          ctx.textAlign = "center";
          ctx.fillText(
            `${Math.round(pos * 100)}%`,
            horseX,
            laneY + HORSE_SIZE / 2 + 14
          );
        }
      }

      // Race status overlay
      if (raceStatus === "WAITING" || raceStatus === "OPEN") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        ctx.fillRect(0, 0, width, TRACK_HEIGHT);
        ctx.font = "bold 28px 'Libre Baskerville', serif";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText(
          raceStatus === "WAITING"
            ? "Waiting for Race"
            : "Place Your Bets",
          width / 2,
          TRACK_HEIGHT / 2
        );
        ctx.font = "16px 'Space Grotesk', sans-serif";
        ctx.fillStyle = "#666666";
        ctx.fillText(
          raceStatus === "WAITING"
            ? "Next race starting soon"
            : "Select a horse and place your bet on-chain",
          width / 2,
          TRACK_HEIGHT / 2 + 35
        );
      }

      if (raceStatus === "LOCKED") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, 0, width, TRACK_HEIGHT);
        ctx.font = "bold 32px 'Libre Baskerville', serif";
        ctx.fillStyle = "#f59e0b";
        ctx.textAlign = "center";
        ctx.fillText("Bets Locked", width / 2, TRACK_HEIGHT / 2 - 10);
        ctx.font = "18px 'Space Grotesk', sans-serif";
        ctx.fillStyle = "#666666";
        ctx.fillText("Race starting...", width / 2, TRACK_HEIGHT / 2 + 25);
      }
    },
    [raceStatus, winner, imagesLoaded]
  );

  // Main animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const container = canvas.parentElement;
    const width = container?.clientWidth || 900;
    canvas.width = width;
    canvas.height = TRACK_HEIGHT;

    if (raceStatus === "RUNNING" && animation) {
      startTimeRef.current = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);

        // Interpolate positions from keyframes
        const positions = animation.map((horse) => {
          const kfs = horse.keyframes;
          const frameIndex = Math.min(
            Math.floor(progress * (kfs.length - 1)),
            kfs.length - 2
          );
          const nextFrame = Math.min(frameIndex + 1, kfs.length - 1);
          const frameProg = progress * (kfs.length - 1) - frameIndex;

          return (
            kfs[frameIndex].position +
            (kfs[nextFrame].position - kfs[frameIndex].position) * frameProg
          );
        });

        setCurrentPositions(positions);
        drawTrack(ctx, width, positions, progress, false);

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(animate);
        } else {
          // Final frame - show finish state
          drawTrack(ctx, width, positions, 1, true);
        }
      };

      animFrameRef.current = requestAnimationFrame(animate);
    } else {
      // Static draw
      drawTrack(ctx, width, currentPositions, 0, raceStatus === "SETTLED");
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [animation, raceStatus, duration, drawTrack, imagesLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const container = canvas.parentElement;
      const width = container?.clientWidth || 900;
      canvas.width = width;
      canvas.height = TRACK_HEIGHT;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        drawTrack(ctx, width, currentPositions, 0, raceStatus === "SETTLED");
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [currentPositions, raceStatus, drawTrack]);

  return (
    <div className="bg-[#111] border border-[#222] rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between">
        <h2 className="text-sm font-bold text-white">AI Agent Race Track</h2>
        {raceStatus === "RUNNING" && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs text-red-400 font-semibold uppercase tracking-wider">LIVE</span>
          </div>
        )}
      </div>
      <div id="race-canvas-container">
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: TRACK_HEIGHT }}
        />
      </div>
    </div>
  );
}
