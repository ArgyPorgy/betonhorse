"use client";

import Image from "next/image";
import { Horse } from "@/lib/types";

interface HorseCardProps {
  horse: Horse;
  selected: boolean;
  onSelect: (horseId: number) => void;
  disabled: boolean;
}

function StatBar({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-[#666] w-14 text-right uppercase tracking-wider">
        {label}
      </span>
      <div className="stat-bar flex-1">
        <div
          className="stat-bar-fill"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-[10px] text-[#666] w-6 font-mono">{value}</span>
    </div>
  );
}

export default function HorseCard({
  horse,
  selected,
  onSelect,
  disabled,
}: HorseCardProps) {
  return (
    <button
      onClick={() => !disabled && onSelect(horse.id)}
      disabled={disabled}
      className={`
        bg-[#111] border border-[#222] p-4 rounded-lg text-left transition-all duration-200 w-full
        ${selected ? "horse-card-selected" : "hover:border-[#333]"}
        ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        {horse.image ? (
          <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-[#333]">
            <Image
              src={horse.image}
              alt={horse.name}
              width={48}
              height={48}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold flex-shrink-0 bg-[#0a0a0a] border border-[#333]"
          >
            {horse.name.charAt(0)}
          </div>
        )}
        <div className="flex-1">
          <h3 className="font-bold text-sm text-white">
            {horse.name}
          </h3>
          <p className="text-[10px] text-[#666] uppercase tracking-wider">
            Horse #{horse.id + 1}
          </p>
        </div>
        {selected && (
          <div className="w-6 h-6 rounded-full bg-[#10b981] flex items-center justify-center">
            <svg
              className="w-4 h-4 text-black"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Personality & Bio */}
      {horse.personality && (
        <div className="mb-2 px-2 py-1.5 bg-[#0a0a0a] border border-[#222] rounded">
          <p className="text-[10px] text-[#10b981] font-medium uppercase tracking-wider">
            {horse.personality.trait}
          </p>
          <p className="text-[10px] text-[#888] italic mt-0.5">
            &quot;{horse.personality.catchphrase}&quot;
          </p>
        </div>
      )}
      <p className="text-xs text-[#888] mb-3 leading-relaxed">
        {horse.bio}
      </p>

      {/* Stats */}
      {horse.stats && (
        <div className="space-y-1.5">
          <StatBar label="Speed" value={horse.stats.speed} />
          <StatBar label="Stamina" value={horse.stats.stamina} />
          <StatBar label="Consist." value={horse.stats.consistency} />
          <StatBar label="Aggress." value={horse.stats.aggression} />
          <StatBar label="Luck" value={horse.stats.luck} />
        </div>
      )}
    </button>
  );
}
