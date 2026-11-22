import data from "./phase2-data.json" with { type: "json" };
import type { Entry } from "./phase1";
export const PHASE2_TIMELINE = data.entries as Entry[];
export const PHASE2_PICKUPS = data.pickups as {
  cycle: number;
  type: "poder" | "vida" | "disparo";
}[];
export const PHASE2_END = 4150;
// Events run after the map/ship movement of their cycle (Pantalla::Escena).
export function phase2Scroll(cycle: number) {
  return cycle <= 2260 || cycle > 3110
    ? 2
    : cycle <= 2270 || cycle > 3100
      ? 1
      : 0;
}
export function phase2Distance(cycle: number) {
  let distance = 0;
  for (let i = 1; i <= cycle; i++) distance += phase2Scroll(i);
  return distance;
}
export class OriginalElcano {
  active = false;
  y: number;
  speed = 3;
  rampX = 26;
  rampOpen = false;
  height: number;
  constructor(height: number) {
    this.height = height;
    this.y = -height;
  }
  tick(cycle: number) {
    if (this.active) {
      this.rampX += this.rampOpen
        ? this.rampX < 98
          ? 2
          : 0
        : this.rampX > 26
          ? -2
          : 0;
      this.y += this.speed;
      if (this.y > 480) this.active = false;
    }
    if (cycle === 2120) {
      this.active = true;
      this.y = -this.height;
      this.speed = 3;
      this.rampX = 26;
      this.rampOpen = false;
    }
    if (cycle === 2260) this.speed = 2;
    if (cycle === 2270) {
      this.speed = 0;
      this.rampOpen = true;
    }
    if (cycle === 3070) this.rampOpen = false;
    if (cycle === 3100) this.speed = 2;
    if (cycle === 3110) this.speed = 3;
  }
}
