import type { ArenaEnemy, CrabBullet } from "./original/boss1";
import type { Family, Motion } from "./original/motion";
import type { Shot } from "./original/phase1";
import type Phaser from "phaser";
import type { EnemyKind, MapData, Surface } from "./model";
export type Content = {
  introImages: string[];
  maps: MapData[];
  scripts: Record<string, any>;
  sprites: Record<string, { width: number; height: number }>;
};
export type Mode =
  | "intro"
  | "menu"
  | "playing"
  | "boss"
  | "vs"
  | "victory"
  | "comic"
  | "gameover"
  | "complete";
export type Settings = {
  music: number;
  effects: number;
  reduced: boolean;
  autoFire: boolean;
};
export type Enemy = {
  arenaEnemy?: ArenaEnemy;
  original?: {
    family: Family;
    motion: Motion;
    shots: Shot[];
    gift?: "poder" | "vida" | "disparo";
    slot?: number;
    born?: number;
    car?: string;
    float?: string;
    turret?: number;
  };
  sprite: Phaser.GameObjects.Image;
  shadow?: Phaser.GameObjects.Image;
  parts: Phaser.GameObjects.Image[];
  kind: EnemyKind;
  surface: Surface;
  x: number;
  y: number;
  worldY: number;
  baseX: number;
  hp: number;
  maxHp: number;
  r: number;
  age: number;
  fire: number;
  speed: number;
  variant: number;
  dead: boolean;
  warning: number;
};
export type Bullet = {
  nativePlayer?: boolean;
  nativeDelay?: boolean;
  powerBall?: boolean;
  ballCycles?: number;
  crabType?: CrabBullet;
  crabDelay?: boolean;
  original?: Shot["type"];
  sprite: Phaser.GameObjects.Image;
  active: boolean;
  friendly: boolean;
  x: number;
  y: number;
  oldY: number;
  vx: number;
  vy: number;
  r: number;
  damage: number;
  homing: boolean;
};
export type Pickup = {
  sprite: Phaser.GameObjects.Image;
  type: "disparo" | "poder" | "vida";
  age: number;
  original?: { cycle: number; dx: number; dy: number };
};
export type Boss = {
  root: Phaser.GameObjects.Container;
  parts: Phaser.GameObjects.Image[];
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  r: number;
  age: number;
  fire: number;
  attack: number;
  god: number;
  warning: number;
  hit: number;
};
export type Command = { type: string; value?: any };
export function emit(name: string, detail: unknown) {
  document.dispatchEvent(new CustomEvent(`game:${name}`, { detail }));
}
