import data from "./boss3-data.json" with { type: "json" };
import type { CrabAttack } from "./boss1";
export const GOD_CONFIGS = [
  {
    name: "Baco",
    family: "baco",
    x: 290,
    y: 50,
    poses: [0, 14, 0, 36],
    attacks: [
      [0, 14],
      [15, 23],
      [24, 38],
    ],
    party: [39, 46, 5],
    ruin: 47,
    fire: [85, 65],
    smoke: [125, 40],
  },
  {
    name: "Hércules",
    family: "hercules",
    x: 153,
    y: -25,
    poses: [0, 15, 34, 26],
    attacks: [
      [0, 14],
      [15, 34],
      [35, 44],
    ],
    party: [45, 51, 1],
    ruin: 51,
    fire: [70, 60],
    smoke: [110, 45],
  },
  {
    name: "Neptuno",
    family: "neptuno",
    x: -60,
    y: -15,
    poses: [0, 28, 16, 17],
    attacks: [
      [0, 17],
      [18, 42],
      [43, 54],
    ],
    party: [55, 70, 15],
    ruin: 70,
    fire: [110, 80],
    smoke: [205, 70],
  },
] as const;
export const GOD_SHOTS = data.gods.map(
  (g) => g.shots as unknown as Record<number, CrabAttack>,
);
export function godFrame(god: number, frame: number) {
  const c = GOD_CONFIGS[god];
  return `jefe3/${c.family}_${frame === c.ruin ? "exp" : String(frame + 1).padStart(god === 1 ? 5 : 4, "0")}`;
}
export class OriginalGod {
  god: number;
  hp = 130;
  cycle = 0;
  frame = 0;
  renderFrame = 0;
  pose = 0;
  attacking = false;
  attackIndex = 0;
  party = false;
  partyTime = 178;
  direction = 1;
  blocked = 0;
  fire = 0;
  constructor(god: number) {
    this.god = god;
  }
  get dead() {
    return this.hp <= 0;
  }
  get config() {
    return GOD_CONFIGS[this.god];
  }
  hit() {
    if (!this.dead) this.hp--;
    return this.dead;
  }
  startParty() {
    this.party = true;
    this.frame = this.config.party[0];
  }
  tick(random: () => number): CrabAttack | undefined {
    if (this.cycle > 480) this.cycle = 0;
    this.cycle++;
    const c = this.config;
    if (this.dead) {
      this.frame = c.ruin;
      if (this.cycle % 3 === 0) this.fire = (this.fire + 1) % 3;
    } else if (this.party) {
      this.partyTime--;
      if (this.partyTime < 0) {
        if (this.cycle % 3 === 0) {
          this.frame--;
          if (this.frame < c.party[0]) {
            this.direction = 1;
            this.partyTime = 178;
            this.party = false;
            this.attacking = false;
            this.frame = c.poses[this.pose];
          }
        }
      } else if (this.cycle % 3 === 0) {
        this.frame += this.direction;
        if (this.frame >= c.party[1] - 1) this.direction = -1;
        else if (this.frame <= c.party[0] + c.party[2]) this.direction = 1;
      }
    } else {
      if (this.attacking) {
        if (this.cycle % 3 === 0) {
          this.frame++;
          if (this.frame === c.attacks[this.attackIndex][1])
            this.attacking = false;
        }
      } else if (this.cycle % 7 === 0) {
        this.pose = (this.pose + 1) % 4;
        this.frame = c.poses[this.pose];
      }
      // iniciar() restores 140 even when cargar.cpp specified 120 or 150.
      if (this.cycle % 140 === 0) {
        this.attacking = true;
        this.attackIndex = Math.floor(random() * 3);
        this.frame = c.attacks[this.attackIndex][0];
      }
    }
    this.renderFrame = this.frame;
    // Draw first, then crearDisparo; shots are independent of the attack pose.
    if (this.blocked > 0) {
      this.blocked--;
      return;
    }
    if (!this.party && !this.dead) return GOD_SHOTS[this.god][this.cycle];
  }
}
export class OriginalBioPic {
  outside = false;
  showing = false;
  cycle = 0;
  frame = 0;
  remaining = 178;
  wait = 50;
  blocked = 0;
  show() {
    this.outside = true;
    this.showing = true;
  }
  get visible() {
    return this.outside && this.wait < 0;
  }
  get solid() {
    return this.showing && this.visible;
  }
  tick(): CrabAttack[] {
    if (!this.outside) return [];
    const shots: CrabAttack[] = [];
    // Source calls crearDisparo before dibujar.
    if (this.blocked > 0) this.blocked--;
    else if (this.wait < 0) {
      if (this.cycle % 40 === 0)
        shots.push({ type: "large", pattern: "eight" });
      if (this.cycle % 55 === 0) shots.push({ type: "blue", pattern: "eight" });
    }
    this.cycle++;
    if (this.showing && --this.remaining < 0) {
      this.remaining = 178;
      this.frame = 4;
      this.showing = false;
    }
    if (this.showing) {
      if (this.wait < 0) {
        if (this.cycle % 4 === 0) {
          this.frame++;
          if (this.frame > 18) this.frame = 5;
        }
      } else this.wait--;
    } else if (this.cycle % 4 === 0) {
      this.frame--;
      if (this.frame < 0) {
        this.frame = 0;
        this.outside = false;
        this.wait = 50;
      }
    }
    return shots;
  }
}
export function bioPicFrame(frame: number) {
  return frame < 4
    ? `jefe3/inout${String(frame + 1).padStart(4, "0")}`
    : `jefe3/pico${String(frame - 3).padStart(3, "0")}`;
}
export class OriginalGodEncounter {
  gods = [new OriginalGod(0), new OriginalGod(1), new OriginalGod(2)];
  bio = new OriginalBioPic();
  pendingParty = false;
  partyMusic = false;
  tick(globalCycle: number, random: () => number) {
    const shots = this.gods.map((g) => g.tick(random));
    if (globalCycle % 600 === 0 && this.gods.some((g) => !g.dead))
      this.pendingParty = true;
    let partyStarted = false;
    if (this.pendingParty && this.gods.every((g) => !g.attacking)) {
      this.pendingParty = false;
      this.gods.forEach((g) => g.startParty());
      this.bio.show();
      partyStarted = true;
      this.partyMusic = true;
    }
    const partyEnded =
      this.partyMusic && this.gods.some((g) => !g.dead && !g.party);
    if (partyEnded) this.partyMusic = false;
    const bioShots = this.bio.tick();
    return { shots, bioShots, partyStarted, partyEnded };
  }
}
