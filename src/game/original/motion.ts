// Port of elementos.cpp: GeneralNivel1/2/3. Units are original pixels/cycles.
export const ORIGINAL_STEP = 0.045;
export const ORIGINAL_HEIGHT = 480;
export const PHASE1_END = 4780;
export const PHASE1_PORTED_THROUGH = 4780;
export type Family =
  | "gaviota1"
  | "gaviota2"
  | "small"
  | "medium"
  | "gavibot"
  | "large"
  | "caseta"
  | "crab"
  | "mine"
  | "boat"
  | "zeppelin"
  | "wasp"
  | "helicopter"
  | "car"
  | "police"
  | "tank"
  | "yacht"
  | "shell"
  | "barrier"
  | "octopus"
  | "rascasio"
  | "taxi"
  | "barrierLeft"
  | "fenceLeft"
  | "float";
export type Move = [
  mode: number,
  cycles: number,
  dx: number,
  dy: number,
  frame?: number,
];
export type Segment = {
  mode: number;
  end: number;
  dx: number;
  dy: number;
  frame: number;
};
export type Motion = {
  vulnerable?: boolean;
  wreck?: boolean;
  floatEffects?: number[];
  animationDirection?: number;
  x: number;
  y: number;
  age: number;
  frame: number;
  current: number;
  segments: Segment[];
  facing: number;
};
export const group = (family: Family) =>
  ["medium", "gavibot", "wasp"].includes(family)
    ? 2
    : ["large", "zeppelin", "rascasio"].includes(family)
      ? 3
      : 1;
export function direction(dx: number, dy: number): number {
  if (!dx && !dy) return 16;
  if (!dx) return dy > 0 ? 12 : 4;
  if (!dy) return dx > 0 ? 0 : 8;
  return dx > 0 ? (dy > 0 ? 14 : 2) : dy > 0 ? 10 : 6;
}
export function compileMoves(family: Family, moves: Move[]): Segment[] {
  const result: Segment[] = [];
  if (["car", "shell"].includes(family)) {
    let end = 0;
    return moves.map(([mode, cycles, dx, dy, frame = -1]) => ({
      mode,
      end: (end = cycles === -1 ? 9999 : end + cycles),
      dx,
      dy,
      frame,
    }));
  }
  const turret = family === "tank" || family === "yacht";
  const traffic = family === "police" || family === "taxi";
  const level = group(family);
  function add([mode, cycles, dx, dy, frame = -1]: Move) {
    if (result.length >= 50) return;
    let end = cycles === -1 ? 9999 : (result.at(-1)?.end ?? 0) + cycles;
    const previous = result.at(-1);
    if (level === 1) {
      const target = direction(dx, dy);
      if (
        frame === -1 &&
        (turret ? mode !== 6 : traffic || ![2, 3, 4, 5].includes(mode)) &&
        previous
      ) {
        let facing = previous.frame;
        // Invalid historical orientation must never enter the circular loop.
        if (facing < 16 && target < 16) {
          const forward = (target - facing + 16) % 16;
          const backward = (facing - target + 16) % 16;
          const step = forward <= backward ? 1 : -1;
          const ax = dx === 0 ? Math.trunc(previous.dx / 2) : dx;
          const rawY = dx === 0 ? dy : Math.trunc(previous.dy / 2);
          const ay =
            turret || traffic ? (rawY >= 2 || rawY < 0 ? rawY : 2) : rawY;
          while (facing !== target && result.length < 50) {
            facing = (facing + step + 16) % 16;
            add([0, 3, ax, ay, facing]);
          }
        }
      }
      if (mode === 2 && previous && !turret && !traffic) {
        add([4, 10, previous.dx, previous.dy]);
        end += 5;
      }
    } else {
      if (mode === 2 && previous) add([4, 10, previous.dx, previous.dy]);
      if (mode === 0 && previous?.mode === 2 && frame !== 0)
        add([5, 10, dx, dy]);
      end = cycles === -1 ? 9999 : (result.at(-1)?.end ?? 0) + cycles;
    }
    if (result.length < 50)
      result.push({
        mode,
        end,
        dx,
        dy: traffic && dx !== 0 && dy === 0 ? 2 : dy,
        frame: frame === -1 ? direction(dx, dy) : frame,
      });
  }
  moves.forEach(add);
  return result;
}
export function createMotion(
  family: Family,
  x: number,
  y: number,
  moves: Move[],
): Motion {
  const first = moves[0];
  const facing = first
    ? first[3] > 0
      ? 0
      : first[3] < 0
        ? 2
        : first[2] < 0
          ? 1
          : 3
    : 0;
  return {
    x,
    y,
    age: 0,
    frame: 0,
    current: 0,
    segments: compileMoves(family, moves),
    facing,
  };
}
export function followMotion(
  family: Family,
  leader: Motion,
  delay: number,
  dx: number,
  dy: number,
): Motion {
  // duplicarEnFila rebuilds the already expanded path with explicit orientations.
  const moves: Move[] = [[2, delay, 1, 1]];
  leader.segments.forEach((s, i) =>
    moves.push([
      s.mode,
      i ? s.end - leader.segments[i - 1].end : s.end,
      s.dx,
      s.dy,
      s.frame,
    ]),
  );
  return createMotion(family, leader.x + dx, leader.y + dy, moves);
}
export function tickMotion(
  m: Motion,
  family: Family,
  playerX: number,
  width: number,
) {
  m.age++;
  if (family === "float") {
    m.y += m.age > 90 && m.age < 190 ? 1 : 3;
    if (m.wreck) m.frame = 3;
    else if (m.age % 8 === 0) {
      m.animationDirection ??= 1;
      m.frame += m.animationDirection;
      if (m.frame === 2) m.animationDirection = -1;
      if (m.frame === 0) m.animationDirection = 1;
    }
    return;
  }
  if (family === "mine") {
    m.x += m.segments[0]?.dx ?? 2;
    // Mina::dibujar sets fantasma before advancing the growth frame.
    m.vulnerable = m.frame === 9;
    if (m.age % 4 === 0)
      m.frame = m.age > 100 ? m.frame - 1 : Math.min(9, m.frame + 1);
    return;
  }
  if (
    [
      "caseta",
      "crab",
      "octopus",
      "barrier",
      "barrierLeft",
      "fenceLeft",
    ].includes(family)
  ) {
    m.y += 2;
    if (["crab", "octopus"].includes(family) && m.age % 5 === 0)
      m.frame = m.frame > 5 ? 4 : m.frame + 1;
    else if (
      (family === "caseta" && m.age % 3 === 0) ||
      (["barrier", "barrierLeft", "fenceLeft"].includes(family) &&
        m.age % 7 === 0)
    )
      m.frame = m.frame === 0 ? 1 : 0;
    return;
  }
  m.segments.forEach((s, i) => {
    if (m.age > (m.segments[i - 1]?.end ?? 0) && m.age < s.end) m.current = i;
  });
  const s = m.segments[m.current];
  if (!s) return;
  if (family === "car" || family === "shell") {
    if (s.mode === 0) {
      m.x += s.dx;
      m.y += s.dy;
    }
    if (family === "car") m.frame = m.segments[0].dy > 0 ? 0 : 1;
    else {
      m.vulnerable = s.mode !== 2;
      if (s.mode === 2) m.y += 2;
      if (m.age % 4 === 0) {
        if (s.mode === 2) m.frame = Math.min(4, m.frame + 1);
        else {
          if (m.frame > 3) {
            m.frame = 0;
            m.animationDirection = 1;
          }
          m.animationDirection ??= 1;
          m.frame += m.animationDirection;
          if (m.frame === 3) m.animationDirection = -1;
          if (m.frame === 0) m.animationDirection = 1;
        }
      }
    }
    return;
  }
  const level = group(family);
  const aim = () => {
    const d = playerX - (m.x + width / 2);
    return d < -90 ? 10 : d > 90 ? 14 : d < -25 ? 11 : d > 25 ? 13 : 12;
  };
  if (s.mode === 0 || (level === 1 && s.mode === 3)) {
    m.x += s.dx;
    m.y += s.dy;
    if (level === 1) m.frame = s.mode === 3 ? aim() : s.frame;
  } else if (s.mode === 1 && level === 1) {
    const d = playerX - (m.x + width / 2);
    m.x += d < -25 ? -3 : d > 25 ? 3 : 0;
    m.y += 6;
    m.frame = d < -25 ? 16 : d > 25 ? 17 : 12;
  } else if (s.mode === 2 && level === 1) m.frame = aim();
  else if (s.mode === 4 || s.mode === 5) {
    const early = m.age - (m.segments[m.current - 1]?.end ?? 0) < 5;
    const divisor = s.mode === 4 ? (early ? 2 : 3) : early ? 3 : 2;
    m.x += Math.trunc(s.dx / divisor);
    m.y += Math.trunc(s.dy / divisor);
    if (level === 1) m.frame = aim();
  }
  if (level === 2 && m.age % 3 === 0)
    m.frame = m.frame === m.facing * 3 ? m.facing * 3 + 1 : m.facing * 3;
  if (level === 3) m.frame = m.frame === 0 ? 1 : 0;
  if (
    (family === "boat" && m.age % 4 >= 2) ||
    (family === "helicopter" && m.age % 2 >= 1) ||
    (family === "police" && m.age % 16 >= 8)
  )
    m.frame += 16;
}
export function originalFrame(family: Family, frame = 0): string {
  if (family === "float") return `carrozas/c_castillo${frame}`;
  if (family === "taxi") return `ene_fase/taxi_${frame}`;
  if (family === "barrierLeft") return `ene_fase/barrera2_${frame}`;
  if (family === "fenceLeft") return `ene_fase/barrera0_${frame}`;
  if (family === "car") return `ene_fase/cpicasso_vi${frame}`;
  if (family === "shell") return `ene_fase/konsha_${frame}`;
  if (family === "barrier") return `ene_fase/barrera3_${frame}`;
  if (family === "octopus") return `ene_fase/purpito_${frame}`;
  if (family === "rascasio") return `ene_generales/rascasio_${frame}`;
  if (family === "tank") return `ene_fase/tanquecuerpo_${frame}`;
  if (family === "yacht") return `ene_fase/barkito_${frame}`;
  if (family === "police")
    return `ene_fase/cpolicia_${frame % 16}${frame >= 16 ? "b" : ""}`;
  if (family === "helicopter")
    return `ene_generales/helicoptero_${frame % 16}${frame >= 16 ? "b" : "a"}`;
  if (family === "wasp")
    return `ene_generales/abispa_${Math.floor(frame / 3)}${["a", "b", "c"][frame % 3]}`;
  if (family === "boat")
    return `ene_fase/lancha_${frame % 16}${frame >= 16 ? "b" : ""}`;
  if (family === "zeppelin") return `ene_generales/zepelin_${frame}`;
  if (family === "mine") return `ene_fase/mina${frame}`;
  if (family === "small") return `ene_generales/navepeq_${frame}`;
  if (family.startsWith("gaviota")) return `ene_generales/${family}_${frame}`;
  if (family === "large") return `ene_generales/navegrande_${frame}`;
  if (family === "medium" || family === "gavibot")
    return `ene_generales/mediana${family === "medium" ? 1 : 2}_${Math.floor(frame / 3)}${["a", "b", "c"][frame % 3]}`;
  return `ene_fase/${family === "crab" ? "cangrebot" : "caseta"}_${frame}`;
}
export function mapCamera(cycle: number): number {
  // mapa.cpp excludes row zero at wrap: 187 rows × 20 cycles per row.
  return 7520 - (cycle % 3740) * 2;
}

export function motionVulnerable(family: Family, motion: Motion): boolean {
  if (family === "float") return !motion.wreck;
  return family === "mine"
    ? !!motion.vulnerable
    : family === "shell"
      ? motion.vulnerable !== false
      : family === "crab" || family === "octopus"
        ? motion.frame >= 3
        : true;
}
