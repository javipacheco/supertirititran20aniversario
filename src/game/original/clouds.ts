// tiempo.cpp:435–507 and pantalla.cpp:840. Clouds are drawn after the map,
// before ground enemies; their scroll is independent from the terrain.
export const CLOUDS_START = 2300;
export const CLOUDS_END = 3410;
export const CLOUD_POSITIONS: readonly (readonly [number, number])[] = [
  [-50, -400],
  [240, -400],
  [-60, -700],
  [220, -720],
  [-80, -1020],
  [240, -1000],
  [-60, -1300],
  [220, -1310],
  [-90, -1600],
  [210, -1590],
  [-50, -1900],
  [240, -1910],
  [-60, -2090],
  [230, -2080],
  [-70, -2270],
  [220, -2240],
  [-60, -2540],
  [220, -2550],
  [-50, -2820],
  [210, -2850],
];
export function cloudOffset(cycle: number): number | null {
  return cycle < CLOUDS_START || cycle > CLOUDS_END
    ? null
    : (cycle - CLOUDS_START + 1) * 3;
}
