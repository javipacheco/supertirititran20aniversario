// juego.cpp:123–149, intercom.cpp:38–113/135–169 and niveles.cpp.
export const RANDOM_CALL_CYCLES = [1000, 1300, 1700, 3000, 3400] as const;
export const MISSION_CALL_WINDOWS = [
  [150, 350, 1520, 1710],
  [170, 360, 1830, 2030],
  [160, 360, 2010, 2200],
] as const;
export const INTERCOM_RING_CYCLES = 200;
export type CallEvent = { cycle: number; name: string | null };
export class OriginalIntercom {
  randomCycle: number;
  private cycle = 0;
  private phase: number;
  private random: () => number;
  private mission: number;
  constructor(phase: number, random: () => number = Math.random, mission = 1) {
    this.phase = phase;
    this.random = random;
    this.mission = mission;
    this.randomCycle = RANDOM_CALL_CYCLES[Math.floor(this.random() * 5)];
  }
  advanceTo(cycle: number): CallEvent[] {
    const [start, end, secondStart, secondEnd] =
      MISSION_CALL_WINDOWS[this.phase - 1];
    const events: {
      cycle: number;
      kind: "random" | "mission" | "close";
      mission?: number;
    }[] = [
      { cycle: this.randomCycle, kind: "random" },
      { cycle: this.randomCycle + 200, kind: "close" },
      { cycle: end, kind: "close" },
      { cycle: secondEnd, kind: "close" },
      {
        cycle: this.mission === 1 ? start : secondStart,
        kind: "mission",
        mission: this.mission,
      },
    ];
    const result: CallEvent[] = [];
    for (const e of events
      .filter((e) => e.cycle > this.cycle && e.cycle <= cycle)
      .sort((a, b) => a.cycle - b.cycle)) {
      result.push({
        cycle: e.cycle,
        name:
          e.kind === "close"
            ? null
            : e.kind === "random"
              ? `aleatoria${Math.floor(this.random() * 5)}`
              : `fase${this.phase}_${e.mission}_${Math.floor(this.random() * 3)}`,
      });
    }
    this.cycle = cycle;
    return result;
  }
  skipTo(cycle: number) {
    this.cycle = cycle;
  }
}
export type DialogueLine = {
  text: string;
  speaker: string;
  portrait: string;
  voice?: string;
};
const list = (v: any): any[] => (v == null ? [] : Array.isArray(v) ? v : [v]);
// Single separators are original fixed-width layout, blank lines are paragraphs.
export function conversationText(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .replaceAll("|", "\n")
    .split(/\n[ \t]*\n+/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
}
export function readConversation(script: any) {
  const objects = list(script?.objects?.object);
  const texts = objects.filter((o) => o.type === "text" && o.data?.text);
  const name = String(texts[0]?.data.text ?? "Paco Alba");
  const portrait = name.includes("Mamá")
    ? "mare_0"
    : name.includes("Super")
      ? "superman_0"
      : /Bi[sz]cone/.test(name)
        ? "bizcone0"
        : "paco0";
  const voices = objects
    .filter((o) => o.type === "sound")
    .flatMap((o) =>
      list(o.sounds?.sound).map((s) => ({
        cycle: Number(s["cycle-in"]),
        file: String(o.data.file).replace(/\.tsog$/, ""),
      })),
    )
    .sort((a, b) => a.cycle - b.cycle);
  const lines: DialogueLine[] = texts
    .slice(2)
    .sort(
      (a, b) =>
        Number(list(a.motion)[0]?.cycle?.begin ?? 0) -
        Number(list(b.motion)[0]?.cycle?.begin ?? 0),
    )
    .map((o, i) => {
      const hero = Number(list(o.motion)[0]?.["coord-begin"]?.x ?? 140) >= 260;
      return {
        text: conversationText(String(o.data.text)),
        speaker: hero ? "Tirititran" : name,
        portrait: hero ? "tirititran0" : portrait,
        voice: voices[i]?.file,
      };
    });
  return { name, portrait, lines };
}
