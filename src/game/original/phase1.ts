import fullData from "./phase1-data.json" with { type: "json" };
import type { Family, Move } from "./motion";
export type ShotPattern =
  | "aim"
  | "five"
  | "circle"
  | "sides"
  | "pair"
  | "cross"
  | "diagonal"
  | "three"
  | "closedThree"
  | "burst"
  | "turret";
export type Shot = {
  at: number;
  type: "small" | "large" | "blue" | "rotating";
  pattern: ShotPattern;
  count: number;
  interval: number;
};
export type Entry = {
  cycle: number;
  absolute?: boolean;
  sourceLine?: number;
  car?: string;
  float?: string;
  family: Family;
  // Original coordinates are top-left; centerX mirrors getCentrarXen.
  x: number | "left" | "right180" | "right";
  centerX?: boolean;
  y?: number;
  moves?: Move[];
  shots?: Shot[];
  gift?: "poder" | "vida" | "disparo";
  followers?: {
    count: number;
    delay: number;
    dx?: number;
    dy?: number;
    family?: Family;
  };
};
export const ORIGINAL_SPECS: Record<
  Family,
  {
    kind:
      | "gull"
      | "scout"
      | "medium"
      | "zeppelin"
      | "crab"
      | "turret"
      | "mine"
      | "boat"
      | "wasp"
      | "car"
      | "tank"
      | "octopus"
      | "float";
    hp: number;
    score: number;
    pool: number;
  }
> = {
  taxi: { kind: "car", hp: 6, score: 150, pool: 4 },
  barrierLeft: { kind: "turret", hp: 5, score: 10, pool: 4 },
  fenceLeft: { kind: "turret", hp: 5, score: 10, pool: 4 },
  float: { kind: "float", hp: 30, score: 500, pool: 4 },
  wasp: { kind: "wasp", hp: 10, score: 100, pool: 4 },
  helicopter: { kind: "scout", hp: 1, score: 10, pool: 15 },
  car: { kind: "car", hp: 2, score: 50, pool: 6 },
  police: { kind: "car", hp: 6, score: 200, pool: 4 },
  tank: { kind: "tank", hp: 16, score: 220, pool: 2 },
  yacht: { kind: "boat", hp: 10, score: 220, pool: 2 },
  shell: { kind: "car", hp: 10, score: 200, pool: 4 },
  barrier: { kind: "turret", hp: 5, score: 10, pool: 4 },
  octopus: { kind: "octopus", hp: 10, score: 150, pool: 4 },
  rascasio: { kind: "zeppelin", hp: 22, score: 250, pool: 2 },
  boat: { kind: "boat", hp: 1, score: 10, pool: 4 },
  zeppelin: { kind: "zeppelin", hp: 22, score: 250, pool: 2 },
  mine: { kind: "mine", hp: 8, score: 0, pool: 8 },
  gaviota1: { kind: "gull", hp: 1, score: 10, pool: 15 },
  gaviota2: { kind: "gull", hp: 1, score: 10, pool: 15 },
  small: { kind: "scout", hp: 1, score: 10, pool: 15 },
  medium: { kind: "medium", hp: 10, score: 100, pool: 4 },
  gavibot: { kind: "medium", hp: 10, score: 100, pool: 4 },
  large: { kind: "zeppelin", hp: 22, score: 250, pool: 2 },
  caseta: { kind: "turret", hp: 8, score: 120, pool: 4 },
  crab: { kind: "crab", hp: 10, score: 150, pool: 4 },
};

// Generated from the audited C++ requests. Never mix in makeWaves for phase one.
export const PHASE1_TIMELINE = fullData.entries as Entry[];
export const PHASE1_OPENING = PHASE1_TIMELINE.filter(
  (entry) => entry.cycle <= 900,
);
export const PHASE1_MINES = PHASE1_TIMELINE.filter(
  (entry) => entry.family === "mine",
);

export const PHASE1_PICKUPS = fullData.pickups as {
  cycle: number;
  type: "poder" | "disparo" | "vida";
}[];
