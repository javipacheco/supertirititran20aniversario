import Phaser from "phaser";
import type { Content } from "./types";

const base = import.meta.env.BASE_URL;
const sceneFiles = Object.keys(
  import.meta.glob(
    "../../assets/images/{vs_fase1,vs_fase2,vs_fase3,diario_fase1,diario_fase2,diario_fase3,final1,final2,final3,fondos,portada}/*.png",
  ),
).map((file) => file.split("/images/")[1].slice(0, -4));

export function queueSceneImages(
  scene: Phaser.Scene,
  content: Content,
  phase?: number,
) {
  for (const image of [...sceneFiles, ...content.introImages]) {
    const folder = image.split("/")[0];
    const match = /(?:fase)?([123])$/.exec(folder);
    if ((match ? Number(match[1]) : undefined) !== phase) continue;
    const key = `scene:${image}`;
    if (!scene.textures.exists(key))
      scene.load.image(key, `${base}assets/images/${image}.png`);
  }
}

/** Add untrimmed stage frames to the shared texture without changing sprite keys. */
export function mergePhaseAtlas(scene: Phaser.Scene, phase: number) {
  const target = scene.textures.get("atlas");
  const source = scene.textures.get(`atlas-phase${phase}`);
  const offset = target.source.length;
  target.source.push(...source.source);
  for (const name of source.getFrameNames()) {
    const frame = source.get(name);
    target.add(
      name,
      offset + frame.sourceIndex,
      frame.cutX,
      frame.cutY,
      frame.cutWidth,
      frame.cutHeight,
    );
  }
}

export function queuePhaseAssets(
  scene: Phaser.Scene,
  content: Content,
  phase: number,
) {
  scene.load.multiatlas(
    `atlas-phase${phase}`,
    `${base}generated/atlas-phase${phase}.json`,
    `${base}generated/`,
  );
  for (let segment = 0; segment < 4; segment++) {
    const key = `map${phase}-${segment}`;
    if (!scene.textures.exists(key))
      scene.load.image(key, `${base}generated/${key}.png`);
  }
  queueSceneImages(scene, content, phase);
}
