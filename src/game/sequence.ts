import Phaser from "phaser";
import { audio } from "./audio";
import { H, W } from "./model";
type Data = Record<string, any>;
const array = (v: any): any[] => (v == null ? [] : Array.isArray(v) ? v : [v]);
/** Original XML timelines, preserving persistent images after their movement ends. */
export class Sequence {
  cycle = 0;
  private records: {
    object: Data;
    sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Text;
    mask?: Phaser.GameObjects.Graphics;
  }[] = [];
  private played = new Set<string>();
  private root: Phaser.GameObjects.Container;
  private done = false;
  private waiting = false;
  private stopsUsed = new Set<number>();
  private scale = 1;
  private offset = 80;
  private intro = false;
  private stopText?: Phaser.GameObjects.Text;
  private cues = new Map<string, { gain(value: number): void; stop(): void }>();
  end = 0;
  constructor(
    private scene: Phaser.Scene,
    private script: Data,
    private folder: string,
    private finished: () => void,
  ) {
    this.intro = folder.startsWith("intro_fase");
    this.root = scene.add.container(0, 0).setDepth(100);
    const height = this.intro ? scene.scale.height : H;
    this.root.add(
      scene.add.rectangle(
        W / 2,
        height / 2,
        W,
        height,
        this.intro ? 0x000000 : 0x050d18,
      ),
    );
    if (this.intro || folder === "diario_fase3" || folder === "portada") {
      this.scale = W / 640;
      this.offset = (height - 480 * this.scale) / 2;
    }
    for (const o of array(script.objects?.object)) {
      const d = o.data ?? {},
        motions = array(o.motion),
        first = motions[0];
      if (o.type === "sound") continue;
      if (o.type === "background") continue;
      let sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Text;
      if (o.type === "text")
        sprite = scene.add.text(
          0,
          0,
          String(d.text ?? "").replaceAll("|", "\n"),
          {
            fontFamily: "Arial",
            fontSize: Math.round((d["font-size"] ?? 14) * this.scale),
            color: `rgb(${d.fgR ?? 255},${d.fgG ?? 255},${d.fgB ?? 255})`,
            align: d["text-align"] ?? "left",
          },
        );
      else {
        const file = d.file ?? array(o.frames?.frame)[0]?.file;
        if (!file || file.includes("$")) continue;
        const [key, frame] = this.resolve(file);
        if (!scene.textures.exists(key)) continue;
        sprite = scene.add.image(0, 0, key, frame);
        sprite.setScale(this.scale);
      }
      sprite.setOrigin(
        d.align === "center" ? 0.5 : d.align === "right" ? 1 : 0,
        d.valign === "center" ? 0.5 : d.valign === "bottom" ? 1 : 0,
      );
      sprite.setVisible(false);
      this.root.add(sprite);
      this.records.push({ object: o, sprite });
      for (const m of motions)
        this.end = Math.max(this.end, Number(m.cycle?.end ?? 0));
      if (!first) sprite.setVisible(true);
    }
    this.end = Math.max(this.end, Number(script.control?.end?.cycle ?? 0));
    const prompt = script.control?.["text-stop"];
    if (this.intro && prompt) {
      this.stopText = scene.add
        .text(
          Number(prompt.x) * this.scale,
          Number(prompt.y) * this.scale + this.offset,
          prompt.text,
          {
            fontFamily: "Arial",
            fontSize: Number(prompt["font-size"]) * this.scale,
            color: `rgb(${prompt.fgR},${prompt.fgG},${prompt.fgB})`,
          },
        )
        .setOrigin(
          prompt.align === "right" ? 1 : prompt.align === "center" ? 0.5 : 0,
          prompt.valign === "bottom" ? 1 : prompt.valign === "center" ? 0.5 : 0,
        )
        .setVisible(false);
      this.root.add(this.stopText);
    }
  }
  private resolve(file: string): [string, string?] {
    const stem = file.replace(/\.timp$/, "");
    if (this.folder === "conversaciones") return ["atlas", `intercom/${stem}`];
    return [`scene:${this.folder}/${stem}`];
  }
  update(dt: number) {
    if (this.done) return;
    const previous = this.cycle;
    if (!this.waiting) this.cycle += this.intro ? dt / 0.045 : dt * 25;
    for (const stop of array(this.script.control?.stop)) {
      const at = Number(stop.cycle);
      if (!this.stopsUsed.has(at) && previous < at && this.cycle >= at) {
        this.cycle = at;
        this.waiting = true;
        this.stopsUsed.add(at);
        break;
      }
    }
    for (const o of array(this.script.objects?.object))
      if (o.type === "sound")
        for (const s of array(o.sounds?.sound)) {
          const id = `${o.data.file}:${s["cycle-in"]}`;
          if (this.intro) {
            const start = Number(s["cycle-in"]),
              out = Number(s["cycle-out"] ?? Infinity);
            const fadeIn = Number(s["time-fadein"] ?? 0) / 45;
            const fadeOut = Number(s["time-fadeout"] ?? 0) / 45;
            const volume = Number(o.data.volumen ?? 100) / 128;
            if (this.cycle >= start && !this.played.has(id)) {
              this.played.add(id);
              if (this.cycle < out + fadeOut)
                this.cues.set(
                  id,
                  audio.cue(
                    String(o.data.file).replace(".tsog", ""),
                    this.folder,
                    fadeIn ? 0 : volume,
                    Number(s.loops ?? 0),
                  ),
                );
            }
            const cue = this.cues.get(id);
            if (cue) {
              if (this.cycle >= out + fadeOut) {
                cue.stop();
                this.cues.delete(id);
              } else
                cue.gain(
                  volume *
                    Math.min(1, fadeIn ? (this.cycle - start) / fadeIn : 1) *
                    (this.cycle < out
                      ? 1
                      : Math.max(0, 1 - (this.cycle - out) / fadeOut)),
                );
            }
          } else if (
            this.cycle >= Number(s["cycle-in"]) &&
            !this.played.has(id)
          ) {
            this.played.add(id);
            audio.sfx(
              String(o.data.file).replace(".tsog", ""),
              Math.min(1, Number(o.data.volumen ?? 100) / 128),
              this.folder === "conversaciones" ? "intercom" : this.folder,
              0,
            );
          }
        }
    for (const r of this.records) {
      const o = r.object,
        d = o.data ?? {},
        motions = array(o.motion);
      let m = motions
        .filter((m) => this.cycle >= Number(m.cycle?.begin ?? 0))
        .at(-1);
      if (!m) {
        r.sprite.setVisible(false);
        continue;
      }
      const begin = Number(m.cycle?.begin ?? 0),
        end = Number(m.cycle?.end ?? this.end),
        t = Phaser.Math.Clamp(
          (this.cycle - begin) / Math.max(1, end - begin),
          0,
          1,
        );
      const disappears = Number(o.disappear?.cycle ?? Infinity);
      r.sprite.setVisible(
        !(
          this.cycle >= disappears ||
          (this.cycle > end && String(m["disappear-to-end"]?.value) === "true")
        ),
      );
      const from = m["coord-begin"] ?? { x: 0, y: 0 },
        to = m["coord-end"] ?? from;
      r.sprite.setPosition(
        (Number(from.x) + (Number(to.x) - Number(from.x)) * t) * this.scale,
        (Number(from.y) + (Number(to.y) - Number(from.y)) * t) * this.scale +
          this.offset,
      );
      let alpha = 1;
      const fi = m["fade-in"],
        fo = m["fade-out"];
      if (fi) {
        const z = Phaser.Math.Clamp(
          (this.cycle - begin) / Number(fi.cycles),
          0,
          1,
        );
        alpha = Phaser.Math.Linear(
          Number(fi["opacity-begin"] ?? 0) / 100,
          Number(fi["opacity-end"] ?? 100) / 100,
          z,
        );
      }
      if (fo && this.cycle > end - Number(fo.cycles))
        alpha *= Phaser.Math.Clamp(
          (end - this.cycle) / Number(fo.cycles),
          0,
          1,
        );
      r.sprite.setAlpha(alpha);
      const zoom = m["zoom-in"] ?? m["zoom-out"];
      if (zoom)
        r.sprite.setScale(
          this.scale *
            Phaser.Math.Linear(
              Number(zoom["factor-begin"] ?? 1),
              Number(zoom["factor-end"] ?? 1),
              Phaser.Math.Clamp(
                (this.cycle - begin) / Number(zoom.cycles),
                0,
                1,
              ),
            ),
        );

      const curtain = m["curtain-in-horizontal"] ?? m["curtain-in-vertical"];
      if (curtain) {
        if (!r.mask) {
          r.mask = this.scene.add.graphics();
          r.sprite.setMask(r.mask.createGeometryMask());
        }
        const bounds = r.sprite.getBounds(),
          z = Phaser.Math.Clamp(
            (this.cycle - begin) / Number(curtain.cycles),
            0,
            1,
          ),
          vertical = !!m["curtain-in-vertical"];
        r.mask
          .clear()
          .fillStyle(0xffffff)
          .fillRect(
            bounds.x,
            bounds.y,
            bounds.width * (vertical ? 1 : z),
            bounds.height * (vertical ? z : 1),
          );
      }
      if (
        o.type === "animation" &&
        r.sprite instanceof Phaser.GameObjects.Image
      ) {
        const frames = array(o.frames?.frame);
        let index =
          Math.floor(
            (this.cycle - begin) / Number(d["cycles-between-frames"] ?? 3),
          ) % frames.length;
        if (this.intro && frames.length > 1) {
          // SDL advances on global cycle multiples, but only while the object is active.
          const interval = Number(d["cycles-between-frames"] ?? 3);
          const birth = Math.min(
            ...motions.map((m) => Number(m.cycle?.begin ?? 0)),
          );
          const step = Math.max(
            0,
            Math.floor((Math.floor(this.cycle) + 1) / interval) -
              Math.floor((birth + 1) / interval),
          );
          if (String(d["rotation-circle"]) === "true")
            index = step % frames.length;
          else {
            const period = 2 * (frames.length - 1),
              frame = step % period;
            index = frame < frames.length ? frame : period - frame;
          }
        }
        const stop = array(o["stop-animation"])
            .filter((s) => Number(s.cycle) <= this.cycle)
            .at(-1),
          play = array(o["play-animation"])
            .filter((s) => Number(s.cycle) <= this.cycle)
            .at(-1);
        if (stop && (!play || Number(stop.cycle) > Number(play.cycle)))
          index = Number(stop.frame ?? 0);
        const [key, frame] = this.resolve(
          frames[Math.min(index, frames.length - 1)].file,
        );
        r.sprite.setTexture(key, frame);
      }
    }
    this.stopText?.setVisible(this.waiting);
    if (this.cycle >= this.end + (this.intro ? 0 : 25)) this.finish();
  }
  advance() {
    if (this.intro) {
      this.finish();
      return;
    }
    if (this.waiting) {
      this.waiting = false;
      return;
    }
    if (this.cycle < 50) return;
    const points = [
      ...new Set(
        this.records
          .flatMap((r) =>
            array(r.object.motion).map((m) => Number(m.cycle?.begin ?? 0)),
          )
          .filter((c) => c > this.cycle + 10),
      ),
    ].sort((a, b) => a - b);
    if (this.folder.startsWith("vs_")) this.finish();
    else if (points.length) this.cycle = points[0] + 1;
    else this.finish();
  }
  finish() {
    if (this.done) return;
    this.done = true;
    this.destroy();
    this.finished();
  }
  destroy() {
    this.done = true;
    for (const cue of this.cues.values()) cue.stop();
    this.cues.clear();
    for (const r of this.records) r.mask?.destroy();
    this.root.destroy(true);
  }
}
