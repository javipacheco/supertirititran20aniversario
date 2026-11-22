import { readdir, readFile, writeFile, mkdir, cp, rm } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { XMLParser } from "fast-xml-parser";
const root = process.cwd(),
  dest = path.join(root, "public/generated");
await mkdir(dest, { recursive: true });
for (const file of await readdir(dest))
  if (/^atlas(?:-|\.)/.test(file)) await rm(path.join(dest, file));
await rm("public/assets", { recursive: true, force: true });
await cp("assets/audio", "public/assets/audio", {
  recursive: true,
  filter: (p) => !p.endsWith(".DS_Store"),
});
for (const dir of [
  "vs_fase1",
  "vs_fase2",
  "vs_fase3",
  "diario_fase1",
  "diario_fase2",
  "diario_fase3",
  "final1",
  "final2",
  "final3",
  "fondos",
  "portada",
  "intercom",
  "miscelanea",
])
  await cp(`assets/images/${dir}`, `public/assets/images/${dir}`, {
    recursive: true,
    filter: (p) => !p.endsWith(".DS_Store"),
  });
const atlasDirs = [
  "agregadores",
  "balas",
  "carrozas",
  "elcano",
  "ene_fase",
  "ene_generales",
  "explosiones",
  "intercom",
  "jefe1",
  "jefe2",
  "jefe3",
  "miscelanea",
  "nubes",
  "mapaagua",
  "tiempo",
  "tirititran",
];
const textures = [],
  sprites = {};
for (const dir of atlasDirs)
  for (const file of await readdir(`assets/images/${dir}`)) {
    if (!file.endsWith(".png")) continue;
    // Full frames are preserved in the source. Large death sequences not used are excluded from the GPU atlas.
    if (dir === "explosiones" && /^expgr0_/.test(file)) continue;
    if (dir === "carrozas" && /^demonio_/.test(file)) continue;
    const input = `assets/images/${dir}/${file}`,
      m = await sharp(input).metadata();
    sprites[`${dir}/${file.slice(0, -4)}`] = {
      width: m.width,
      height: m.height,
    };
    textures.push({
      input,
      key: `${dir}/${file.slice(0, -4)}`,
      w: m.width,
      h: m.height,
    });
  }
// Keep exclusive stage graphics out of the shared download. Sources stay untouched.
const atlasGroups = {
  common: textures.filter(
    (t) => !/^(jefe[123]|elcano|carrozas|nubes)\//.test(t.key),
  ),
  phase1: textures.filter((t) => /^(jefe1|nubes)\//.test(t.key)),
  phase2: textures.filter((t) => /^(jefe2|elcano)\//.test(t.key)),
  phase3: textures.filter((t) => /^(jefe3|carrozas)\//.test(t.key)),
};
let pageCount = 0;
for (const [group, textures] of Object.entries(atlasGroups)) {
  textures.sort((a, b) => b.h - a.h || b.w - a.w);
  const size = 2048,
    pages = [];
  let page = { items: [], x: 2, y: 2, row: 0 };
  for (const item of textures) {
    if (page.x + item.w + 2 > size) {
      page.x = 2;
      page.y += page.row + 4;
      page.row = 0;
    }
    if (page.y + item.h + 2 > size) {
      pages.push(page);
      page = { items: [], x: 2, y: 2, row: 0 };
    }
    page.items.push({ ...item, x: page.x, y: page.y });
    page.x += item.w + 4;
    page.row = Math.max(page.row, item.h);
  }
  pages.push(page);
  const atlas = { textures: [] };
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i],
      height = p.y + p.row + 2;
    await sharp({
      create: {
        width: size,
        height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite(p.items.map((a) => ({ input: a.input, left: a.x, top: a.y })))
      .png({ palette: true, colours: 256, dither: 0, compressionLevel: 9 })
      .toFile(`${dest}/atlas-${group}-${i}.png`);
    atlas.textures.push({
      image: `atlas-${group}-${i}.png`,
      format: "RGBA8888",
      size: { w: size, h: height },
      scale: 1,
      frames: p.items.map((a) => ({
        filename: a.key,
        rotated: false,
        trimmed: false,
        frame: { x: a.x, y: a.y, w: a.w, h: a.h },
        spriteSourceSize: { x: 0, y: 0, w: a.w, h: a.h },
        sourceSize: { w: a.w, h: a.h },
      })),
    });
  }
  await writeFile(`${dest}/atlas-${group}.json`, JSON.stringify(atlas));
  pageCount += pages.length;
}
const maps = [];
for (let phase = 1; phase <= 3; phase++) {
  const bytes = await readFile(`assets/data/mapa${phase}/mapa.map`),
    cells = [...bytes.subarray(0, 2600)];
  const tiles = new Map();
  for (const id of new Set(cells))
    tiles.set(id, await readFile(`assets/images/mapa${phase}/tile${id}.png`));
  // Segments avoid the maximum GPU texture height while keeping exact original tile placement.
  for (let segment = 0; segment < 4; segment++) {
    const parts = [];
    for (let row = segment * 50; row < (segment + 1) * 50; row++)
      for (let col = 0; col < 13; col++)
        parts.push({
          input: tiles.get(cells[row * 13 + col]),
          left: col * 40,
          top: (row - segment * 50) * 40,
        });
    await sharp({
      create: { width: 520, height: 2000, channels: 4, background: "#07274b" },
    })
      .composite(parts)
      .png({ palette: true, colours: 256, dither: 0, compressionLevel: 9 })
      .toFile(`${dest}/map${phase}-${segment}.png`);
  }
  const tileMasks = {};
  for (const [id, buf] of tiles) {
    const { data, info } = await sharp(buf)
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true }),
      mask = [];
    for (let y = 0; y < 40; y += 4)
      for (let x = 0; x < 40; x += 4) {
        const off = (y * 40 + x) * info.channels,
          r = data[off],
          g = data[off + 1],
          b = data[off + 2];
        const water = b > 55 && b > r * 1.3 && b > g * 1.12;
        const road =
          phase === 2
            ? [
                46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 69, 70, 71, 74, 75, 76,
                77, 78, 79, 80, 81,
              ].includes(id)
            : phase === 3
              ? id <= 14 || (id >= 35 && id <= 39)
              : false;
        const sand = phase === 1 && r > 120 && g > 110 && b < g * 0.83;
        mask.push(water ? 1 : road ? 2 : sand ? 3 : 0);
      }
    tileMasks[id] = mask;
  }
  maps.push({ phase, columns: 13, rows: 200, tileSize: 40, cells, tileMasks });
}
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  isArray: (n) =>
    [
      "object",
      "motion",
      "frame",
      "sound",
      "stop",
      "play-animation",
      "stop-animation",
    ].includes(n),
});
const scripts = {};
for (const dir of await readdir("assets/data", { withFileTypes: true }))
  if (dir.isDirectory())
    for (const f of await readdir(`assets/data/${dir.name}`))
      if (f.endsWith(".xml")) {
        const buf = await readFile(`assets/data/${dir.name}/${f}`);
        const source = buf.toString(
          buf[0] !== 0xef &&
            buf.subarray(0, 100).toString().includes("iso-8859-1")
            ? "latin1"
            : "utf8",
        );
        scripts[`${dir.name}/${f.slice(0, -4)}`] = parser.parse(source).anim;
      }
// Preserve recovered archive members; only public/ receives decoded web images.
const introImages = [];
for (let phase = 1; phase <= 3; phase++) {
  const folder = `intro_fase${phase}`,
    source = `assets/recovered/${folder}`;
  await mkdir(`public/assets/images/${folder}`, { recursive: true });
  await mkdir(`public/assets/audio/${folder}`, { recursive: true });
  for (const file of await readdir(source)) {
    if (file.endsWith(".timp")) {
      const stem = `${folder}/${file.slice(0, -5)}`;
      await sharp(`${source}/${file}`)
        .png()
        .toFile(`public/assets/images/${stem}.png`);
      introImages.push(stem);
    } else if (file.endsWith(".tsog")) {
      await cp(
        `${source}/${file}`,
        `public/assets/audio/${folder}/${file.slice(0, -5)}.ogg`,
      );
    }
  }
}
await writeFile(
  `${dest}/content.json`,
  JSON.stringify({ maps, scripts, sprites, introImages }),
);
console.log(
  `Recursos preparados: ${textures.length} sprites, ${pageCount} atlas, 3 mapas y ${Object.keys(scripts).length} guiones.`,
);
