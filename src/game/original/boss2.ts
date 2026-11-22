// elementos.cpp:3970–4593; crearDisparo is called BEFORE dibujar increments ciclos.
import type { CrabAttack } from "./boss1";
export const PURPO_ATTACKS: Record<number, CrabAttack> = {
  30: { type: "small", pattern: "burst", bursts: 4 },
  80: { type: "smallBubble", pattern: "fixed", target: 50 },
  90: { type: "smallBubble", pattern: "fixed", target: 450 },
  110: { type: "bubble", pattern: "fixed", target: 450 },
  140: { type: "blue", pattern: "five" },
  160: { type: "rot", pattern: "pair" },
  180: { type: "rot", pattern: "five" },
  200: { type: "rot", pattern: "pair" },
  210: { type: "bubble", pattern: "fixed", target: 100 },
  240: { type: "bubble", pattern: "fixed", target: 550 },
  260: { type: "small", pattern: "burst", bursts: 2 },
  300: { type: "small", pattern: "three" },
  330: { type: "small", pattern: "three" },
  360: { type: "rot", pattern: "sides" },
  380: { type: "rot", pattern: "five" },
  390: { type: "blue", pattern: "closedThree" },
  430: { type: "small", pattern: "three" },
  480: { type: "small", pattern: "three" },
};
export const PURPO_PARTS = [
  [-80, 70, "tent1_00"],
  [300, 110, "tent2_00"],
  [-70, 180, "tent3_00"],
  [180, 155, "tent4_00"],
  [120, 186, "patas_0"],
  [186, 35, "cabeza_0"],
  [50, 95, "mancha_0"],
  [0, 100, "disparando_00"],
  [400, 100, "disparando_00"],
] as const;
export type Tar = {
  x: number;
  y: number;
  dx: number;
  dy: number;
  active: boolean;
  frame: number;
  emitter: number;
};
export class OriginalPurpoBoss {
  cycle = 0;
  ticks = 0;
  blocked = 0;
  legs = 0;
  head = 0;
  tentacle = -1;
  tentacleFrame = 0;
  private tentacleBounce = 1;
  attack = false;
  pendingAttack = false;
  remaining = 0;
  stain = 0;
  nozzle = 0;
  private nozzleBounce = 1;
  stoppingTar = false;
  stainVisible = false;
  nozzlesVisible = false;
  tar: Tar[] = Array.from({ length: 60 }, (_, i) => ({
    x: 0,
    y: 0,
    dx: 0,
    dy: 0,
    active: false,
    frame: Math.floor(i / 2) % 2,
    emitter: i % 2,
  }));
  private random: () => number;
  constructor(random: () => number = Math.random) {
    this.random = random;
  }
  private rand(n: number) {
    return Math.floor(this.random() * n);
  }
  private resetTar(t: Tar, initial = false) {
    t.x = t.emitter * 400 + 43;
    t.y = 310 + (initial ? this.rand(40) : 0);
    t.dx = this.rand(3) - 1;
    t.dy = this.rand(9) + 8;
    t.active = true;
  }
  tick() {
    this.ticks++;
    let shot: CrabAttack | undefined;
    if (this.blocked > 0) this.blocked--;
    else {
      shot = PURPO_ATTACKS[this.cycle];
      if (this.cycle === 450) {
        this.pendingAttack = true;
        this.remaining = 200;
      }
      if (this.cycle === 500) {
        this.nozzle = 0;
        this.cycle = 0;
      }
    }
    this.cycle++;
    this.stainVisible = false;
    this.nozzlesVisible = false;
    if (this.attack) {
      if (this.remaining > 110) {
        this.stainVisible = true;
        if (this.cycle % 15 === 0 && this.stain < 6) this.stain++;
      } else {
        this.nozzlesVisible = true;
        if (this.cycle % 4 === 0) {
          if (this.remaining > 0) {
            if (this.nozzle < 10) {
              this.nozzle++;
              if (this.nozzle === 9)
                this.tar.forEach((t) => this.resetTar(t, true));
            }
          } else {
            this.stoppingTar = true;
            if (this.nozzle > 9) this.nozzleBounce = -1;
            if (this.nozzle < 1) this.nozzleBounce = 1;
            this.nozzle += this.nozzleBounce;
            if (this.nozzle <= 0) {
              this.attack = false;
              this.stoppingTar = false;
              this.tar.forEach((t) => (t.active = false));
            }
          }
        }
        for (const t of this.tar)
          if (t.active) {
            t.x += t.dx;
            t.y += t.dy;
            if (t.y > 480 && !this.stoppingTar) this.resetTar(t);
          }
      }
      this.remaining--;
    } else if (this.cycle % 180 === 0) {
      this.tentacle = this.rand(4);
      this.tentacleFrame = 0;
      // selFrame(0) preserves Elemento's bounce; frame zero selects +1 on next bounce.
    }
    if (this.cycle % 8 === 0) this.legs = (this.legs + 1) % 4;
    if (this.tentacle >= 0) {
      if (this.cycle % 4 === 0) {
        const max = this.tentacle === 2 ? 11 : 12;
        if (this.tentacleFrame > max - 1) this.tentacleBounce = -1;
        if (this.tentacleFrame < 1) this.tentacleBounce = 1;
        this.tentacleFrame += this.tentacleBounce;
        if (this.tentacleFrame === 0) this.tentacle = -1;
      }
    } else if (this.pendingAttack) {
      this.attack = true;
      this.pendingAttack = false;
    }
    this.head = this.cycle % 100 < 8 ? 3 : 0;
    return shot;
  }
}
