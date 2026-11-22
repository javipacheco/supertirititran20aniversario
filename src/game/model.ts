export const W = 520,
  H = 640;
export type Surface = "air" | "water" | "road" | "sand" | "deck";
export const PHASES = [
  {
    name: "La playa no se toca",
    place: "Playa de La Caleta · El Balneario",
    boss: "Coñeta",
    tag: "Operación turismo",
    color: "#65dfed",
    event: "Nubes sobre Santa Catalina",
  },
  {
    name: "La del pulpo",
    place: "La Bahía · Puente Carranza",
    boss: "Purpo",
    tag: "Operación bahía",
    color: "#73dcba",
    event: "El arca de Bizcone",
  },
  {
    name: "Esto sí es Carnaval",
    place: "La avenida · Puertas de Tierra",
    boss: "Los Dioses",
    tag: "Operación Carnaval",
    color: "#e6aaed",
    event: "La cabalgata del caos",
  },
];
export const POWERS = [
  {
    name: "Escudo",
    icon: "escudo",
    hint: "18 segundos de protección",
    sound: "superescudo",
  },
  {
    name: "Bomba",
    icon: "bomba",
    hint: "Onda de bomba y bloqueo de disparos enemigos",
    sound: "bombapoderes",
  },
  {
    name: "Duplicación",
    icon: "clonacion",
    hint: "Dos clones con disparo propio durante 18 segundos",
    sound: "clonacion0",
  },
  {
    name: "¡Ese Cádiz!",
    icon: "amarillo",
    hint: "25 balones que rebotan y barren la pantalla",
    sound: "esecadi",
  },
];
export type MapData = {
  phase: number;
  columns: number;
  rows: number;
  tileSize: number;
  cells: number[];
  tileMasks: Record<string, number[]>;
};
export class Terrain {
  data: MapData;
  constructor(data: MapData) {
    this.data = data;
  }
  at(x: number, y: number): number {
    if (x < 0 || x >= W || y < 0 || y >= 8000) return 0;
    const col = Math.floor(x / 40),
      row = Math.floor(y / 40),
      id = this.data.cells[row * 13 + col];
    return (
      this.data.tileMasks[id]?.[
        Math.floor((y % 40) / 4) * 10 + Math.floor((x % 40) / 4)
      ] ?? 0
    );
  }
  fits(surface: Surface, x: number, y: number, radius = 14): boolean {
    if (surface === "air" || surface === "deck")
      return x >= radius && x <= W - radius;
    const code = surface === "water" ? 1 : surface === "road" ? 2 : 3;
    for (const [dx, dy] of [
      [0, 0],
      [-radius, 0],
      [radius, 0],
      [0, -radius],
      [0, radius],
      [-radius * 0.7, -radius * 0.7],
      [radius * 0.7, radius * 0.7],
    ])
      if (this.at(x + dx, y + dy) !== code) return false;
    return true;
  }
  lane(
    surface: Surface,
    y: number,
    preferred: number,
    radius = 14,
  ): number | null {
    let best: number | null = null,
      distance = Infinity;
    for (let x = radius + 4; x < W - radius - 4; x += 4)
      if (
        this.fits(surface, x, y, radius) &&
        Math.abs(x - preferred) < distance
      ) {
        best = x;
        distance = Math.abs(x - preferred);
      }
    return best;
  }
}
export function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
export type EnemyKind =
  | "scout"
  | "wasp"
  | "gull"
  | "heli"
  | "medium"
  | "zeppelin"
  | "boat"
  | "crab"
  | "octopus"
  | "car"
  | "tank"
  | "float"
  | "mine"
  | "turret";
export type Spawn = {
  at: number;
  kind: EnemyKind;
  x: number;
  surface: Surface;
  variant: number;
};
// Provisional waves: the live game uses this only for phases 2/3. Phase 1 has its C++ timeline.
export function makeWaves(phase: number, seed = 17): Spawn[] {
  const rng = seeded(seed + phase * 911),
    waves: Spawn[] = [];
  for (let at = 220; at < 7190; at += 230) {
    const formation = Math.floor(rng() * 3),
      count = at < 1000 ? 2 : 3 + Math.floor(rng() * 2);
    for (let j = 0; j < count; j++)
      waves.push({
        at: at + j * 26,
        kind:
          at > 4600 && formation === 2
            ? "medium"
            : formation === 1
              ? "wasp"
              : "scout",
        x: 70 + j * (380 / Math.max(1, count - 1)),
        surface: "air",
        variant: formation,
      });
    if (at % 3 !== 0)
      waves.push({
        at: at + 105,
        kind:
          phase === 1
            ? rng() > 0.45
              ? "crab"
              : "boat"
            : phase === 2
              ? "boat"
              : rng() > 0.5
                ? "car"
                : "tank",
        x:
          phase === 1
            ? 120
            : phase === 2
              ? rng() > 0.5
                ? 35
                : 470
              : 140 + Math.floor(rng() * 3) * 80,
        surface: phase === 1 ? "water" : phase === 2 ? "water" : "road",
        variant: Math.floor(rng() * 4),
      });
    if (phase === 2)
      waves.push({
        at: at + 150,
        kind: rng() > 0.7 ? "tank" : "car",
        x: 475,
        surface: "road",
        variant: Math.floor(rng() * 4),
      });
    if (at > 1100 && rng() > 0.35)
      waves.push({
        at: at + 160,
        kind: phase === 1 ? "gull" : "heli",
        x: rng() > 0.5 ? 70 : 450,
        surface: "air",
        variant: 0,
      });
  }
  for (let at = 1500; at < 7000; at += 1700)
    waves.push({
      at,
      kind: "zeppelin",
      x: 180 + Math.floor(rng() * 160),
      surface: "air",
      variant: 0,
    });
  if (phase === 1)
    for (let at = 3300; at < 4300; at += 110)
      waves.push({
        at,
        kind: "mine",
        x: 50 + rng() * 420,
        surface: "air",
        variant: 0,
      });
  return waves.sort((a, b) => a.at - b.at);
}
export function circleHit(
  ax: number,
  ay: number,
  ar: number,
  bx: number,
  by: number,
  br: number,
) {
  return (ax - bx) ** 2 + (ay - by) ** 2 <= (ar + br) ** 2;
}
