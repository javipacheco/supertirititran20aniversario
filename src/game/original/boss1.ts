// elementos.cpp:3138–3517 + niveles.cpp:1308–1385. All positions are top-left.
export type CrabBullet =
  "small" | "large" | "blue" | "rot" | "bubble" | "smallBubble";
export type CrabAttack = {
  type: CrabBullet;
  pattern:
    | "aim"
    | "fixed"
    | "pair"
    | "five"
    | "three"
    | "closedThree"
    | "sides"
    | "burst"
    | "circle"
    | "eight"
    | "cross"
    | "diagonal";
  target?: number;
  bursts?: number;
};
export const CRAB_ATTACKS: Record<number, CrabAttack> = {
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
};
export const CRAB_PARTS = [
  [60, 169, "cang_sombra"],
  [20, 140, "cang_pata_iz0"],
  [218, 140, "cang_pata_de0"],
  [45, 20, "cang_brazo_iz0"],
  [165, 25, "cang_brazo_de0"],
  [78, 130, "cang_boca"],
  [119, 89, "cang_ojos_ab"],
] as const;
export type ArenaEnemy = {
  kind: "tower" | "crab";
  x: number;
  y: number;
  cycle: number;
  frame: number;
  vulnerable: boolean;
  active: boolean;
  open: boolean;
  closing: boolean;
  direction: number;
  remaining: number;
  shots: { at: number; interval: number; count: number };
};
export function arenaTower(x: number): ArenaEnemy {
  return {
    kind: "tower",
    x,
    y: 100,
    cycle: 0,
    frame: 0,
    vulnerable: false,
    active: true,
    open: false,
    closing: false,
    direction: 1,
    remaining: 180,
    shots: { at: 0, interval: 1, count: 0 },
  };
}
export function arenaCrab(
  x: number,
  y: number,
  at: number,
  interval: number,
): ArenaEnemy {
  return {
    kind: "crab",
    x,
    y,
    cycle: 0,
    frame: 0,
    vulnerable: false,
    active: true,
    open: false,
    closing: false,
    direction: 1,
    remaining: 180,
    shots: { at, interval, count: 6 },
  };
}
export function tickArenaEnemy(e: ArenaEnemy): boolean {
  if (!e.active) return false;
  e.cycle++;
  const elapsed = e.cycle - e.shots.at;
  const fire =
    elapsed >= 0 &&
    elapsed % e.shots.interval === 0 &&
    elapsed / e.shots.interval < e.shots.count;
  if (e.kind === "crab") {
    e.vulnerable = e.frame >= 3;
    if (e.cycle % 5 === 0) e.frame = e.frame > 5 ? 4 : e.frame + 1;
    if (e.remaining > 0) e.remaining--;
    else if (--e.frame < 0) e.active = false;
  } else {
    e.vulnerable = e.open && e.frame >= 3;
    if (e.open && --e.remaining < 0) {
      e.remaining = 180;
      e.closing = true;
      e.open = false;
      e.frame = 3;
      e.shots.count = 0;
    }
    if (e.cycle % 3 === 0) {
      if (e.open) {
        e.frame += e.direction;
        if (e.frame >= 6) e.direction = -1;
        else if (e.frame <= 3) e.direction = 1;
      }
      if (e.closing && --e.frame === 0) e.closing = false;
    }
  }
  return fire;
}
export class OriginalCrabBoss {
  x = 150;
  y = -25;
  cycle = 0;
  ticks = 0;
  direction = 3;
  private savedDirection = 3;
  private moving = true;
  private armsMoving = true;
  calling = false;
  private blink = 0;
  legs = 0;
  leftArm = 0;
  rightArm = 0;
  private leftBounce = 1;
  private rightBounce = 1;
  eyes = 0;
  blocked = 0;
  tick() {
    this.ticks++;
    if (this.cycle % 100 === 0) {
      this.moving = !this.moving;
      if (this.moving) this.direction = this.savedDirection;
    }
    if (this.moving && !this.calling) {
      if (this.x < 0) this.direction = this.savedDirection = 3;
      if (this.x > 200) this.direction = this.savedDirection = -3;
      this.x += this.direction;
    } else this.direction = 0;
    let attack: CrabAttack | undefined,
      castanets = false,
      reinforcements = false;
    if (this.blocked > 0) this.blocked--;
    else if (this.cycle === 400) {
      this.calling = true;
      this.cycle = 0;
      castanets = true;
    } else attack = CRAB_ATTACKS[this.cycle];
    this.cycle++;
    if (this.cycle % 140 === 0) this.armsMoving = !this.armsMoving;
    if (this.cycle % 3 === 0 && this.direction !== 0)
      this.legs = (this.legs + 1) % 3;
    if (!this.calling) {
      if (this.armsMoving) {
        if (this.cycle % 7 === 0) {
          if (this.rightArm > 1) this.rightBounce = -1;
          if (this.rightArm < 1) this.rightBounce = 1;
          this.rightArm += this.rightBounce;
        }
        if (this.cycle % 6 === 0) {
          if (this.leftArm > 1) this.leftBounce = -1;
          if (this.leftArm < 1) this.leftBounce = 1;
          this.leftArm += this.leftBounce;
        }
      }
    } else {
      if (this.cycle % 3 === 0) {
        this.rightArm = this.rightArm === 3 ? 4 : 3;
        this.leftArm = this.leftArm === 3 ? 4 : 3;
      }
      if (this.cycle % 100 === 0) {
        this.calling = false;
        reinforcements = true;
        this.leftArm = this.rightArm = 0;
      }
    }
    if (this.cycle % 70 === 0) this.blink = 1;
    if (this.direction > 0) this.eyes = 2;
    else if (this.direction < 0) this.eyes = 3;
    else if (this.blink > 0) {
      this.eyes = 1;
      if (++this.blink > 5) this.blink = 0;
    } else this.eyes = 0;
    return { attack, castanets, reinforcements };
  }
}
