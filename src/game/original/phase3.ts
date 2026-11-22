import data from "./phase3-data.json" with { type: "json" };
import type { Entry } from "./phase1";
export const PHASE3_TIMELINE = data.entries as Entry[];
export const PHASE3_PICKUPS = data.pickups as {
  cycle: number;
  type: "poder" | "vida" | "disparo";
}[];
export const PHASE3_END = 4550;
export type Confetti = {
  x: number;
  y: number;
  dx: number;
  dy: number;
  frame: number;
};
export function createConfetti(random: () => number): Confetti[] {
  const rand = (n: number) => Math.floor(random() * n);
  return Array.from({ length: 60 }, (_, i) => ({
    x: rand(520),
    y: rand(10),
    dx: (rand(2) ? 1 : -1) * rand(4),
    dy: 3 + rand(2),
    frame:
      i % 6 === 0
        ? 0
        : i % 5 === 0
          ? 1
          : i % 7 === 0
            ? 2
            : i % 4 === 0
              ? 3
              : i % 8 === 0
                ? 4
                : 5,
  }));
}
export function tickConfetti(
  p: Confetti,
  random: () => number,
  width: number,
  height: number,
) {
  p.x += p.dx;
  p.y += p.dy;
  if (
    p.x < -width * 2 - 5 ||
    p.x > 520 + width * 2 - 5 ||
    p.y > 480 + height * 2 - 5
  ) {
    p.x = Math.floor(random() * 480);
    p.y = Math.floor(random() * 10);
  }
}
