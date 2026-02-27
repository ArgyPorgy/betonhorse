export interface Horse {
  id: number;
  name: string;
  color: string;
  image?: string;
  bio: string;
  stats?: {
    speed: number;
    stamina: number;
    consistency: number;
    aggression: number;
    luck: number;
  };
  personality?: {
    trait: string;
    style: string;
    catchphrase: string;
  };
}

export interface Keyframe {
  frame: number;
  time: number;
  position: number;
  speed: number;
}

export interface HorseAnimation {
  horseId: number;
  name: string;
  color: string;
  keyframes: Keyframe[];
}

export type RaceStatus =
  | "WAITING"
  | "OPEN"
  | "LOCKED"
  | "RUNNING"
  | "SETTLED";

export interface RaceState {
  id: number;
  status: RaceStatus;
  horses: Horse[];
  betDeadline?: number;
  seedHash?: string;
  totalPool?: number;
  winner?: number | null;
  message?: string;
}

export interface RaceResult {
  raceId: number;
  winner: number;
  winnerName: string;
  winnerColor: string;
  probabilities: number[];
  seed: string;
  seedHash: string;
}

export interface RaceHistoryEntry {
  id: number;
  winner: number;
  winnerName: string;
  totalPool: number;
  settledAt: number;
}
