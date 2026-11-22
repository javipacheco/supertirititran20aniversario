import {
  queueSceneImages,
  queuePhaseAssets,
  mergePhaseAtlas,
} from "./phase-assets";
import {
  OriginalGodEncounter,
  GOD_CONFIGS,
  godFrame,
  bioPicFrame,
} from "./original/boss3";
import {
  PHASE3_TIMELINE,
  PHASE3_PICKUPS,
  PHASE3_END,
  createConfetti,
  tickConfetti,
} from "./original/phase3";
import type { Confetti } from "./original/phase3";
import { OriginalPurpoBoss, PURPO_PARTS } from "./original/boss2";
import waterData from "./original/water-data.json" with { type: "json" };
import {
  PHASE2_TIMELINE,
  PHASE2_PICKUPS,
  PHASE2_END,
  OriginalElcano,
  phase2Scroll,
  phase2Distance,
} from "./original/phase2";
import { spriteContact, pickupContact } from "./collision";
import type { SpritePose, AlphaMask } from "./collision";
import { OriginalPowers, OriginalWeapon, createBall } from "./original/powers";
import type { PowerId, PlayerShot } from "./original/powers";
import { OriginalIntercom, readConversation } from "./original/intercom";
import type { DialogueLine } from "./original/intercom";
import { HeroFall } from "./original/hero-death";
import {
  OriginalCrabBoss,
  CRAB_PARTS,
  arenaTower,
  arenaCrab,
  tickArenaEnemy,
} from "./original/boss1";
import type { CrabAttack, CrabBullet, ArenaEnemy } from "./original/boss1";
import Phaser from "phaser";
import { isDebugMode } from "./debug";
import {
  ORIGINAL_STEP,
  ORIGINAL_HEIGHT,
  PHASE1_END,
  createMotion,
  followMotion,
  tickMotion,
  originalFrame,
  mapCamera,
  motionVulnerable,
} from "./original/motion";
import type { Family, Motion } from "./original/motion";
import {
  PHASE1_TIMELINE,
  PHASE1_PICKUPS,
  ORIGINAL_SPECS,
} from "./original/phase1";
import {
  CLOUDS_START,
  CLOUDS_END,
  CLOUD_POSITIONS,
  cloudOffset,
} from "./original/clouds";
import type { Entry, Shot } from "./original/phase1";
import { audio } from "./audio";
import { Sequence } from "./sequence";
import {
  H,
  W,
  PHASES,
  POWERS,
  Terrain,
  makeWaves,
  circleHit,
  seeded,
} from "./model";
import type { Spawn } from "./model";
import { emit } from "./types";
import type {
  Boss,
  Bullet,
  Command,
  Content,
  Enemy,
  Mode,
  Pickup,
  Settings,
} from "./types";
const base = import.meta.env.BASE_URL;
const clamp = Phaser.Math.Clamp;
const keys = (
  dir: string,
  prefix: string,
  start: number,
  end: number,
  pad = 0,
  suffix = "",
) =>
  Array.from(
    { length: end - start + 1 },
    (_, i) =>
      `${dir}/${prefix}${String(i + start).padStart(pad, "0")}${suffix}`,
  );
const animations = {
  scout: keys("ene_generales", "navepeq_", 12, 12),
  wasp: [
    "ene_generales/abispa_0a",
    "ene_generales/abispa_0b",
    "ene_generales/abispa_0c",
  ],
  gull: keys("ene_generales", "gaviota1_", 10, 12),
  heli: ["ene_generales/helicoptero_12a", "ene_generales/helicoptero_12b"],
  medium: ["ene_generales/mediana1_2a", "ene_generales/mediana1_2b"],
  zeppelin: ["ene_generales/zepelin_0", "ene_generales/zepelin_1"],
  boat: ["ene_fase/lancha_12", "ene_fase/lancha_12b"],
  crab: keys("ene_fase", "cangrebot_", 3, 6),
  octopus: keys("ene_fase", "purpito_", 3, 6),
  car: ["ene_fase/ckadett_rj0"],
  tank: ["ene_fase/tanquecuerpo_12"],
  float: keys("carrozas", "c_barco", 0, 2),
  mine: keys("ene_fase", "mina", 0, 9),
  turret: keys("final1", "torre", 0, 6),
};
const specs = {
  scout: { hp: 28, r: 18, speed: 96, score: 100, scale: 0.85 },
  wasp: { hp: 38, r: 19, speed: 82, score: 150, scale: 0.75 },
  gull: { hp: 22, r: 14, speed: 116, score: 90, scale: 0.8 },
  heli: { hp: 95, r: 28, speed: 57, score: 300, scale: 0.72 },
  medium: { hp: 86, r: 25, speed: 66, score: 250, scale: 0.75 },
  zeppelin: { hp: 210, r: 35, speed: 36, score: 600, scale: 0.72 },
  boat: { hp: 62, r: 20, speed: 52, score: 180, scale: 0.72 },
  crab: { hp: 72, r: 22, speed: 30, score: 200, scale: 0.7 },
  octopus: { hp: 60, r: 20, speed: 35, score: 180, scale: 0.65 },
  car: { hp: 48, r: 16, speed: 60, score: 120, scale: 0.8 },
  tank: { hp: 140, r: 25, speed: 27, score: 350, scale: 0.9 },
  float: { hp: 250, r: 40, speed: 24, score: 650, scale: 0.64 },
  mine: { hp: 18, r: 14, speed: 110, score: 80, scale: 0.8 },
  turret: { hp: 115, r: 21, speed: 0, score: 300, scale: 0.8 },
};
export class Boot extends Phaser.Scene {
  private failed = false;
  constructor(private content: Content) {
    super("Boot");
  }
  preload() {
    this.load.multiatlas(
      "atlas",
      `${base}generated/atlas-common.json`,
      `${base}generated/`,
    );
    queueSceneImages(this, this.content);
    this.load.on("progress", (n: number) => emit("load", n));
    this.load.on("loaderror", (f: Phaser.Loader.File) => {
      this.failed = true;
      emit("error", `No se pudo cargar ${f.key}`);
    });
  }
  create() {
    if (this.failed) return;
    this.scene.add("Game", new GameScene(this.content), true);
    this.scene.stop();
  }
}
export class GameScene extends Phaser.Scene {
  mode: Mode = "menu";
  phase = 1;
  settings: Settings = {
    music: 0.45,
    effects: 0.55,
    reduced: false,
    autoFire: true,
  };
  score = 0;
  highScore = 0;
  lives = 3;
  health = 3;
  private originalPowers = new OriginalPowers();
  private originalWeapon = new OriginalWeapon();
  private powerAccumulator = 0;
  private fireAccumulator = 0;
  private bombWave?: Phaser.GameObjects.Image;
  private powerFlare!: Phaser.GameObjects.Image;
  private powerWash!: Phaser.GameObjects.Rectangle;
  get weapon() {
    return this.originalWeapon.level;
  }
  set weapon(value: number) {
    this.originalWeapon.level = value;
  }
  get uses() {
    return this.originalPowers.uses;
  }
  set uses(value: number) {
    this.originalPowers.uses = value;
  }
  get charge() {
    return Math.min(1, this.originalPowers.chargeSegments / 3);
  }
  power = 0;
  combo = 0;
  bestCombo = 0;
  distance = 0;
  cameraY = 7360;
  elapsed = 0;
  timer = 0;
  invulnerable = 0;
  get shield() {
    return this.originalPowers.active === 0 ? this.originalPowers.remaining : 0;
  }
  get clones() {
    return this.originalPowers.active === 2 ? this.originalPowers.remaining : 0;
  }
  get balls() {
    return this.bullets.filter((b) => b.active && b.powerBall).length;
  }
  paused = false;
  call: string | null = null;
  private heroDirection = 0;
  private heroAnimationTime = 0;
  private player!: Phaser.GameObjects.Image;
  private playerShadow!: Phaser.GameObjects.Image;
  private shieldSprite!: Phaser.GameObjects.Image;
  private cloneSprites: Phaser.GameObjects.Image[] = [];
  private sea?: Phaser.GameObjects.TileSprite;
  private seaMask!: Phaser.GameObjects.Graphics;
  private eventSea?: Phaser.GameObjects.Image;
  private victoryDelay = 0;
  private victoryPending = false;
  private maps: Phaser.GameObjects.Image[] = [];
  private arena: Phaser.GameObjects.Image[] = [];
  private terrain!: Terrain;
  private weather: Phaser.GameObjects.Image[] = [];
  private clouds: Phaser.GameObjects.Image[] = [];
  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private pickups: Pickup[] = [];
  private effects: {
    sprite: Phaser.GameObjects.Image;
    frames: string[];
    age: number;
    life: number;
    scale: number;
  }[] = [];
  private boss?: Boss;
  private gods: Boss[] = [];
  private godEncounter?: OriginalGodEncounter;
  private bioPic?: Phaser.GameObjects.Image;
  private sequence?: Sequence;
  private waves: Spawn[] = [];
  private waveIndex = 0;
  private eventStarted = false;
  private eventEnded = false;
  private ship?: Phaser.GameObjects.Image;
  private deckCooldown = 0;
  private elcano?: OriginalElcano;
  private ramp?: Phaser.GameObjects.Image;
  private press = new Set<string>();
  private held = new Set<string>();
  private mobileStick = { x: 0, y: 0 };
  private orientationPaused = false;
  private pointer?: { x: number; y: number };
  private joystick?: { startX: number; startY: number; x: number; y: number };
  private comboTimer = 0;
  private emitTimer = 0;
  private scrollSpeed = 86;
  private rng = seeded(92);
  private shotsFired = 0;
  private kills = 0;
  private hits = 0;
  private shotsHit = 0;
  private dialogue: DialogueLine[] = [];
  private intercomSchedule?: OriginalIntercom;
  private callCycle = 0;
  private callAge = 0;
  private callAnswered = false;
  private dialogueIndex = 0;
  private stageTime = 0;
  private unlocked = 3;
  private wonGods = 0;
  private bestSaved = 0;
  private lastPhase = 1;
  private padButtons: boolean[] = [];
  private eventLabel = "";
  private warning!: Phaser.GameObjects.Graphics;
  private collisionPrevious = new Map<Phaser.GameObjects.Image, SpritePose>();
  private collisionCurrent = new Map<Phaser.GameObjects.Image, SpritePose>();
  // Weak keys let destroyed sprites and their reusable poses be collected together.
  private previousPoses = new WeakMap<Phaser.GameObjects.Image, SpritePose>();
  private currentPoses = new WeakMap<Phaser.GameObjects.Image, SpritePose>();
  private poseMatrix = new Phaser.GameObjects.Components.TransformMatrix();
  private poseParentMatrix =
    new Phaser.GameObjects.Components.TransformMatrix();
  private poseBounds = new Phaser.Geom.Rectangle();
  private collisionMasks = new Map<string, AlphaMask>();
  private collisionCanvas?: HTMLCanvasElement;
  private processingBulletContacts = false;
  private developmentTest = false;
  private testGod = false;
  private originalPoolState: Partial<
    Record<Family, { x: number; y: number }[]>
  > = {};
  private heroFall?: HeroFall;
  private heroLifeAccumulator = 0;
  private heroLifeCycle = 0;
  private heroEntering = 0;
  private crabBoss?: OriginalCrabBoss;
  private purpoBoss?: OriginalPurpoBoss;
  private bossRemains?: Phaser.GameObjects.Image;
  private purpoTar: Phaser.GameObjects.Image[] = [];
  private arenaWater: Phaser.GameObjects.Image[] = [];
  private bridgeFoam?: Phaser.GameObjects.Image;
  private foamStep = 0;
  private versusCycles = 0;
  private crabPending: { at: number; x: number; y: number }[] = [];
  private originalCycle = 0;
  private confetti: Confetti[] = [];
  private originalAccumulator = 0;
  private originalShots: {
    cycle: number;
    x: number;
    y: number;
    direction: number;
    type: Shot["type"];
  }[] = [];
  private get originalStage() {
    return this.mode === "playing" || this.mode === "boss";
  }
  private get playHeight() {
    return this.originalStage || this.mode === "intro" ? ORIGINAL_HEIGHT : H;
  }
  private resizePlayfield(height: number) {
    this.scale.resize(W, height);
    document
      .querySelector<HTMLElement>(".cabinet")
      ?.style.setProperty("--play-height", String(height));
    emit("viewport", height);
    this.sea?.setPosition(W / 2, height / 2).setSize(W, height);
  }
  constructor(private content: Content) {
    super("Game");
  }
  create() {
    this.developmentTest =
      import.meta.env.DEV && new URLSearchParams(location.search).has("test");
    try {
      const save = JSON.parse(localStorage.getItem("tirititran-save") ?? "{}");
      audio.muted = save.muted === true;
      if ([1, 2, 3].includes(save.lastPhase)) this.lastPhase = save.lastPhase;
      this.highScore = save.highScore ?? 0;
      this.unlocked = 3; // All phases are selectable, including older saves.
      this.bestSaved = save.bestCombo ?? 0;
      const { difficulty: _removedDifficulty, ...settings } =
        save.settings ?? {};
      Object.assign(this.settings, settings);
    } catch {}
    audio.musicVolume = this.settings.music;
    audio.effectsVolume = this.settings.effects;
    this.warmCollisionMasks();
    this.playerShadow = this.add
      .image(260, 566, "atlas", "tirititran/sombra0")
      .setAlpha(0.35)
      .setDepth(5)
      .setScale(1.3);
    this.player = this.add
      .image(260, 540, "atlas", "tirititran/tirititran0")
      .setScale(0.64)
      .setDepth(20);
    this.sea = this.add
      .tileSprite(W / 2, H / 2, W, H, "atlas", "mapaagua/tile0")
      .setDepth(2)
      .setAlpha(0.15);
    this.seaMask = this.add.graphics();
    this.sea.setMask(this.seaMask.createGeometryMask());
    this.shieldSprite = this.add
      .image(260, 540, "atlas", "tirititran/barrera0")
      .setScale(0.6)
      .setDepth(21)
      .setVisible(false);
    for (let i = 0; i < 2; i++)
      this.cloneSprites.push(
        this.add
          .image(260, 540, "atlas", "tirititran/clon")
          .setDepth(19)
          .setAlpha(0.8)
          .setVisible(false),
      );
    this.powerWash = this.add
      .rectangle(W / 2, H / 2, W, H, 0xffffff, 0)
      .setDepth(27)
      .setVisible(false);
    this.powerFlare = this.add
      .image(260, 420, "atlas", "tirititran/flare0")
      .setDepth(22)
      .setVisible(false);
    this.warning = this.add.graphics().setDepth(15);
    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.matches("input,select,textarea"))
        return;
      if (
        [
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "Space",
          "ControlLeft",
          "ControlRight",
          "ShiftLeft",
          "AltLeft",
          "KeyP",
          "KeyZ",
          "KeyX",
          "KeyC",
        ].includes(event.code)
      )
        event.preventDefault();
      if (!this.held.has(event.code)) this.press.add(event.code);
      this.held.add(event.code);
    });
    this.input.keyboard?.on("keyup", (e: KeyboardEvent) =>
      this.held.delete(e.code),
    );
    window.addEventListener("blur", () => {
      this.held.clear();
      this.pointer = undefined;
      this.joystick = undefined;
      if (this.isAction() && !this.paused) this.togglePause();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.isAction() && !this.paused)
        this.togglePause();
    });
    this.orientationPaused =
      document.body.classList.contains("mobile-portrait");
    document.addEventListener("game:stick", (e) => {
      this.mobileStick = (e as CustomEvent).detail;
    });
    document.addEventListener("game:orientation", (e) => {
      this.orientationPaused = (e as CustomEvent).detail;
      this.mobileStick = { x: 0, y: 0 };
      this.held.clear();
      this.press.clear();
      if (this.orientationPaused) {
        if (this.isAction() && !this.paused) this.togglePause();
        audio.pause();
      } else if (
        !this.paused &&
        !document.body.classList.contains("intro-open")
      )
        audio.resume();
    });
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      audio.unlock();
      if (document.body.classList.contains("mobile-game") || !this.isAction())
        return;
      if (p.wasTouch)
        this.joystick = { startX: p.x, startY: p.y, x: p.x, y: p.y };
      else this.pointer = { x: p.x, y: p.y };
    });
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (p.isDown && !document.body.classList.contains("mobile-game")) {
        if (this.joystick) {
          this.joystick.x = p.x;
          this.joystick.y = p.y;
        } else this.pointer = { x: p.x, y: p.y };
      }
    });
    this.input.on("pointerup", () => {
      this.pointer = undefined;
      this.joystick = undefined;
    });
    document.addEventListener("game:debugchange", () => this.publish());
    document.addEventListener("game:command", (e) =>
      this.command((e as CustomEvent<Command>).detail),
    );
    this.loadStage(1, false);
    this.mode = "menu";
    this.call = null;
    this.player.setVisible(false);
    this.playerShadow.setVisible(false);
    audio.song("opciones", "sonidos", true);
    emit("ready", {
      settings: this.settings,
      unlocked: this.unlocked,
      highScore: this.highScore,
      lastPhase: this.lastPhase,
    });
    this.publish();
    if (this.developmentTest)
      (window as any).__game = {
        snapshot: () => this.snapshot(),
        step: (dt: number) => this.step(dt),
        command: (type: string, value?: unknown) =>
          this.command({ type, value }),
        god: (v: boolean) => (this.testGod = v),
        fastForward: (seconds: number) => {
          for (let i = 0; i < seconds * 60; i++) this.step(1 / 60);
        },
        aim: (x: number, y: number) => this.player.setPosition(x, y),
        spawn: (kind: string, x = 260, y = 150) =>
          this.spawn(
            { at: 0, kind: kind as any, x, surface: "air", variant: 0 },
            y,
          ),
        damage: () => {
          this.invulnerable = 0;
          this.originalPowers.active = null;
          this.damagePlayer();
        },
        boss: () => this.beginVS(),
        getScene: () => this,
      };
  }
  private sprite(x: number, y: number, frame: string, depth = 10, scale = 1) {
    return this.add.image(x, y, "atlas", frame).setDepth(depth).setScale(scale);
  }
  private isAction() {
    return this.mode === "playing" || this.mode === "boss";
  }
  private texture(sprite: Phaser.GameObjects.Image, frame: string) {
    if (frame.startsWith("final")) sprite.setTexture(`scene:${frame}`);
    else sprite.setTexture("atlas", frame);
  }
  command(c: Command) {
    if (this.loadingPhase) return;
    if (c.type === "select-phase") {
      if ([1, 2, 3].includes(Number(c.value))) {
        this.lastPhase = Number(c.value);
        this.save();
      }
    } else if (c.type === "start") {
      const data = c.value ?? {};
      audio.unlock();
      this.start(
        clamp(Number(data.phase ?? 1), 1, 3),
        isDebugMode() && data.debugBoss === true,
      );
    } else if (c.type === "pause") this.togglePause();
    else if (c.type === "power") {
      this.usePower();
    } else if (c.type === "select") {
      if (
        !document.body.classList.contains("mobile-game") &&
        (this.originalPowers.active !== null || this.uses <= 0)
      )
        return;
      this.power = clamp(Number(c.value), 0, 3);
      audio.sfx("click", 0.4);
      this.publish();
    } else if (c.type === "intercom") {
      this.openCall();
    } else if (c.type === "continue") {
      if (this.dialogue.length) this.advanceDialogue();
      else this.sequence?.advance();
    } else if (c.type === "menu") {
      this.toMenu();
    } else if (c.type === "retry") {
      this.start(this.phase);
    } else if (c.type === "next" && this.mode === "victory") {
      this.enterStage(this.phase + 1);
    } else if (c.type === "settings") {
      const { difficulty: _removedDifficulty, ...settings } = c.value ?? {};
      Object.assign(this.settings, settings);
      audio.musicVolume = this.settings.music;
      audio.effectsVolume = this.settings.effects;
      audio.apply();
      this.save();
    } else if (c.type === "mute") {
      audio.muted = !audio.muted;
      audio.apply();
      emit("mute", audio.muted);
      this.save();
    } else if (c.type === "unlock") {
      const code = String(c.value).toLowerCase().trim();
      const phase = code === "alikindoi" ? 2 : code === "wachisnai" ? 3 : 0;
      if (phase) {
        this.unlocked = Math.max(this.unlocked, phase);
        this.save();
        emit("unlocked", this.unlocked);
      } else emit("badcode", null);
    }
  }
  private start(phase: number, debugBoss = false) {
    this.paused = false;
    this.dialogue = [];
    this.call = null;
    this.score = 0;
    this.lives = 3;
    this.health = 3;
    this.originalPowers = new OriginalPowers();
    this.originalWeapon.reset();
    this.power = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.kills = 0;
    this.hits = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.elapsed = 0;
    audio.resume();
    this.save();
    this.enterStage(phase, debugBoss);
  }
  private beginRoute(phase: number, debugBoss = false) {
    this.loadStage(phase);
    if (debugBoss) {
      // Enter the last second of the route; the normal end condition runs VS.
      this.clearAction();
      this.call = null;
      this.eventStarted = true;
      this.eventEnded = true;
      this.eventLabel = "";
      this.waveIndex = this.waves.length;
      if (phase <= 3) {
        this.originalCycle =
          (phase === 1 ? PHASE1_END : phase === 2 ? PHASE2_END : PHASE3_END) -
          22;
        this.distance =
          phase !== 2
            ? this.originalCycle * 2
            : phase2Distance(this.originalCycle);
        this.cameraY = 7520 - (this.distance % 7480);
        this.stageTime = this.originalCycle * 0.045;
      } else {
        this.distance = 7360 - this.scrollSpeed;
        this.cameraY = 7360 - this.distance;
        this.stageTime = this.distance / this.scrollSpeed;
      }
      this.callCycle =
        phase <= 3
          ? this.originalCycle
          : Math.floor(this.stageTime / ORIGINAL_STEP);
      this.intercomSchedule?.skipTo(this.callCycle);
      this.updateMap();
      this.publish();
    }
  }
  private loadedPhases = new Set<number>();
  private loadingPhase = false;
  private enterStage(phase: number, debugBoss = false) {
    if (this.loadingPhase) return;
    if (!this.loadedPhases.has(phase)) {
      this.loadingPhase = true;
      this.paused = true;
      this.held.clear();
      this.press.clear();
      this.sequence?.destroy();
      this.sequence = undefined;
      audio.stopIntercom();
      audio.stopMusic();
      audio.stopEffects();
      emit("phase-loading", phase);
      emit("load", 0);
      let failed = false;
      const progress = (value: number) => emit("load", value);
      const failure = (file: Phaser.Loader.File) => {
        failed = true;
        emit("error", `No se pudo cargar ${file.key}`);
      };
      this.load.on("progress", progress);
      this.load.on("loaderror", failure);
      this.load.once("complete", () => {
        this.load.off("progress", progress);
        this.load.off("loaderror", failure);
        if (failed) return; // Keep the retry screen visible; never enter an incomplete phase.
        mergePhaseAtlas(this, phase);
        this.loadedPhases.add(phase);
        this.loadingPhase = false;
        emit("phase-loaded", phase);
        this.enterStage(phase, debugBoss);
      });
      queuePhaseAssets(this, this.content, phase);
      this.load.start();
      return;
    }
    this.clearAction();
    this.sequence?.destroy();
    this.call = null;
    audio.stopIntercom();
    this.phase = phase;
    this.lastPhase = phase;
    this.save();
    this.mode = "intro";
    this.originalCycle = 0;
    this.elapsed = 0;
    this.paused = false;
    this.resizePlayfield(480);
    this.player.setVisible(false);
    this.playerShadow.setVisible(false);
    this.shieldSprite.setVisible(false);
    this.powerFlare?.setVisible(false);
    this.cloneSprites.forEach((s) => s.setVisible(false));
    audio.stopEffects();
    audio.stopMusic();
    // Intro 2 has no sound objects: the original options music remains underneath.
    if (phase === 2) audio.song("opciones");
    this.sequence = new Sequence(
      this,
      this.content.scripts[`intro_fase${phase}/intro`],
      `intro_fase${phase}`,
      () => {
        this.sequence = undefined;
        audio.stopMusic();
        this.beginRoute(phase, debugBoss);
      },
    );
    this.sequence.update(0);
    emit("overlay", {
      type: "sequence",
      hint: "Saltar presentación · Esc / Espacio / Enter",
    });
    this.publish();
  }
  private loadStage(phase: number, playMusic = true) {
    if (playMusic) {
      this.lastPhase = phase;
      this.save();
    }
    this.clearAction();
    this.sequence?.destroy();
    this.sequence = undefined;
    this.phase = phase;
    this.paused = false;
    emit("overlay", null);
    this.mode = "playing";
    this.distance = 0;
    this.originalPoolState = {};
    this.originalCycle = 0;
    this.originalAccumulator = 0;
    this.collisionPrevious.clear();
    this.collisionCurrent.clear();
    this.originalShots = [];
    this.crabBoss = undefined;
    this.purpoBoss = undefined;
    this.purpoTar = [];
    this.arenaWater = [];
    this.bridgeFoam = undefined;
    this.foamStep = 0;
    this.crabPending = [];
    this.heroFall = undefined;
    this.heroLifeAccumulator = 0;
    this.heroEntering = 0;
    this.cameraY = mapCamera(0);
    this.resizePlayfield(ORIGINAL_HEIGHT);
    this.timer = 0;
    this.stageTime = 0;
    this.intercomSchedule = new OriginalIntercom(phase);
    this.callCycle = 0;
    this.cancelCall();
    this.waveIndex = 0;
    this.eventStarted = false;
    this.eventEnded = false;
    this.eventLabel = "";
    this.wonGods = 0;
    this.victoryPending = false;
    this.victoryDelay = 0;
    this.eventSea?.destroy();
    this.eventSea = undefined;
    this.originalPowers.clearActive();
    this.originalPowers.cycle = 0;
    this.originalWeapon.reset();
    this.powerAccumulator = 0;
    this.fireAccumulator = 0;
    this.bombWave?.destroy();
    this.bombWave = undefined;
    this.powerFlare?.setVisible(false);
    this.powerWash?.setVisible(false);
    this.invulnerable = 2.8;
    this.combo = 0;
    this.rng = seeded(912 + phase);
    for (const s of [...this.maps, ...this.arena, ...this.weather]) s.destroy();
    this.maps = [];
    this.arena = [];
    this.weather = [];
    this.ship?.destroy();
    this.ship = undefined;
    this.ramp?.destroy();
    this.ramp = undefined;
    this.terrain = new Terrain(this.content.maps[phase - 1]);
    // Phase 1 uses its original static map; a coarse water mask flickers over shore/boats.
    this.sea?.setVisible(false);
    for (let s = 0; playMusic && s < 4; s++)
      this.maps.push(
        this.add
          .image(0, s * 2000 - this.cameraY, `map${phase}-${s}`)
          .setOrigin(0)
          .setDepth(0),
      );
    this.player
      .setPosition(260, 422.5)
      .setScale(1)
      .setVisible(true)
      .setAlpha(1);
    this.heroDirection = 0;
    this.heroAnimationTime = 0;
    this.playerShadow.setVisible(true);
    this.waves = [];
    this.confetti = [];
    this.elcano =
      phase === 2
        ? new OriginalElcano(this.content.sprites["elcano/elcano"].height)
        : undefined;
    this.updateMap();
    this.shieldSprite.setVisible(false);
    this.powerFlare?.setVisible(false);
    this.cloneSprites.forEach((s) => s.setVisible(false));
    if (playMusic) {
      audio.song(`fase${phase}`);
      audio.sfx(`fase${phase}`, 0);
    }
    this.notice(`FASE ${phase}`, PHASES[phase - 1].name, 3);
    this.publish();
  }
  private clearAction() {
    if (this.bossRemains) {
      this.tweens.killTweensOf(this.bossRemains);
      this.bossRemains.destroy();
      this.bossRemains = undefined;
    }
    this.clouds.forEach((cloud) => cloud.destroy());
    this.clouds = [];
    for (const e of this.enemies) {
      e.sprite.destroy();
      e.shadow?.destroy();
      e.parts.forEach((p) => p.destroy());
    }
    this.enemies = [];
    for (const b of this.bullets) b.sprite.destroy();
    this.bullets = [];
    for (const p of this.pickups) p.sprite.destroy();
    this.pickups = [];
    for (const e of this.effects) e.sprite.destroy();
    this.effects = [];
    for (const root of new Set([
      this.boss?.root,
      ...this.gods.map((b) => b.root),
    ]))
      root?.destroy(true);
    this.gods = [];
    this.godEncounter = undefined;
    this.bioPic?.destroy();
    this.bioPic = undefined;
    this.boss = undefined;
    this.originalShots = [];
    this.warning?.clear();
  }
  private toMenu() {
    this.clearAction();
    this.sequence?.destroy();
    this.sequence = undefined;
    this.dialogue = [];
    this.call = null;
    this.paused = false;
    this.loadStage(1, false);
    this.mode = "menu";
    this.call = null;
    this.player.setVisible(false);
    this.playerShadow.setVisible(false);
    audio.resume();
    audio.song("opciones", "sonidos", true);
    emit("overlay", { type: "menu" });
    this.publish();
  }
  private save() {
    this.highScore = Math.max(this.highScore, this.score);
    this.bestSaved = Math.max(this.bestSaved, this.bestCombo);
    try {
      localStorage.setItem(
        "tirititran-save",
        JSON.stringify({
          highScore: this.highScore,
          lastPhase: this.lastPhase,
          unlocked: this.unlocked,
          bestCombo: this.bestSaved,
          muted: audio.muted,
          settings: this.settings,
        }),
      );
    } catch {}
  }
  private notice(title: string, text: string, duration = 2.7) {
    emit("notice", { title, text, duration });
  }
  update(_time: number, delta: number) {
    this.step(Math.min(delta / 1000, 0.25));
  }
  step(dt: number) {
    if (this.loadingPhase) {
      this.press.clear();
      return;
    }
    if (this.orientationPaused) {
      audio.pause();
      this.press.clear();
      return;
    }
    this.pollGamepad();
    this.warning.clear();
    if (
      this.press.has("KeyP") ||
      (this.press.has("Escape") && !this.dialogue.length && this.isAction())
    ) {
      this.togglePause();
      this.press.delete("KeyP");
      this.press.delete("Escape");
    }
    if (this.dialogue.length) {
      if (this.press.has("Space") || this.press.has("Enter"))
        this.advanceDialogue();
      else if (this.press.has("Escape")) this.closeDialogue();
      this.press.clear();
      return;
    }
    if (this.paused) {
      this.press.clear();
      return;
    }
    if (this.press.has("Space") && this.isAction()) this.openCall();
    if (this.dialogue.length) {
      this.press.clear();
      return;
    }
    if (this.sequence) {
      if (this.phase >= 2 && this.mode === "vs")
        this.versusCycles += dt / ORIGINAL_STEP;
      if (this.mode === "intro" && this.press.has("Escape"))
        this.sequence.finish();
      else if (this.press.has("Space") || this.press.has("Enter"))
        this.sequence.advance();
      this.sequence?.update(dt);
      this.updateEffects(dt);
      this.press.clear();
      return;
    }
    if (!this.isAction()) {
      if (this.victoryPending) {
        this.victoryDelay -= dt;
        if (this.victoryDelay <= 0) {
          this.victoryPending = false;
          this.playVictory();
        }
      }
      if (this.mode === "menu") {
        this.cameraY -= dt * 15;
        if (this.cameraY < 6500) this.cameraY = 7360;
        this.updateMap();
      }
      this.updateEffects(dt);
      this.press.clear();
      return;
    }
    if (this.originalStage) {
      this.originalAccumulator += dt;
      while (
        this.originalAccumulator + 1e-9 >= ORIGINAL_STEP &&
        this.isAction() &&
        !this.paused &&
        !this.dialogue.length
      ) {
        this.originalAccumulator -= ORIGINAL_STEP;
        this.actionStep(ORIGINAL_STEP);
        if (!this.originalStage) {
          this.originalAccumulator = 0;
          break;
        }
      }
      return;
    }
    this.actionStep(dt);
  }
  private actionStep(dt: number) {
    this.captureCollisionState();
    this.timer += dt;
    if (this.sea) {
      this.sea.tilePositionY -= dt * 22;
      this.sea.tilePositionX = Math.sin(this.timer * 0.3) * 5;
    }
    this.stageTime += dt;
    this.elapsed += dt;
    this.emitTimer += dt;
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.updatePowerClock(dt);
    this.comboTimer -= dt;
    if (this.comboTimer <= 0) this.combo = 0;
    if (
      this.press.has("ShiftLeft") ||
      this.press.has("ShiftRight") ||
      this.press.has("KeyC")
    ) {
      if (this.originalPowers.active === null && this.uses > 0)
        this.power = (this.power + 1) % 4;
      audio.sfx("click", 0.35);
    }
    for (let i = 0; i < 4; i++)
      if (
        this.press.has(`Digit${i + 1}`) &&
        this.originalPowers.active === null &&
        this.uses > 0
      )
        this.power = i;
    if (
      this.press.has("AltLeft") ||
      this.press.has("AltRight") ||
      this.press.has("KeyX")
    )
      this.usePower();
    this.movePlayer(dt);
    this.firePlayer(dt);
    if (this.mode === "playing") {
      if (this.phase <= 3) this.advanceOriginal();
      else {
        this.distance = Math.min(7360, this.distance + dt * this.scrollSpeed);
        this.cameraY = 7360 - this.distance;
      }
      const cycle =
        this.phase <= 3
          ? this.originalCycle
          : Math.floor((this.stageTime + 1e-9) / ORIGINAL_STEP);
      this.callAge += cycle - this.callCycle;
      this.callCycle = cycle;
      for (const event of this.intercomSchedule?.advanceTo(cycle) ?? []) {
        if (event.name) this.offerCall(event.name);
        else this.cancelCall();
      }
      this.updateMap();
      while (
        this.waveIndex < this.waves.length &&
        this.waves[this.waveIndex].at <= this.distance
      )
        this.spawn(this.waves[this.waveIndex++]);

      if (
        !this.heroFall &&
        !this.heroEntering &&
        (this.phase <= 3
          ? this.originalCycle >=
            (this.phase === 1
              ? PHASE1_END
              : this.phase === 2
                ? PHASE2_END
                : PHASE3_END)
          : this.distance >= 7360) &&
        this.stageTime > 3
      )
        this.beginVS();
    }
    if (this.mode === "boss") this.updateBoss(dt);
    this.updateEnemies(dt);
    this.updateBullets(dt);
    this.updatePickups(dt);
    this.updateEffects(dt);
    this.updateWeather(dt);
    if (this.emitTimer > 0.1) {
      this.emitTimer = 0;
      this.publish();
    }
    this.press.clear();
  }
  private movePlayer(dt: number) {
    if (this.heroFall || this.heroEntering > 60) {
      this.updateHeroLife(dt);
      return;
    }
    if (this.heroEntering > 0) this.updateHeroLife(dt);
    let x =
        Number(this.down("ArrowRight", "KeyD")) -
        Number(this.down("ArrowLeft", "KeyA")),
      y =
        Number(this.down("ArrowDown", "KeyS")) -
        Number(this.down("ArrowUp", "KeyW"));
    const pad = navigator.getGamepads?.()[0];
    if (pad) {
      if (Math.abs(pad.axes[0]) > 0.15) x = pad.axes[0];
      if (Math.abs(pad.axes[1]) > 0.15) y = pad.axes[1];
    }
    if (document.body.classList.contains("mobile-game")) {
      x = this.mobileStick.x;
      y = this.mobileStick.y;
    }
    if (this.joystick) {
      x = clamp((this.joystick.x - this.joystick.startX) / 45, -1, 1);
      y = clamp((this.joystick.y - this.joystick.startY) / 45, -1, 1);
    }
    if (this.pointer) {
      const dx = this.pointer.x - this.player.x,
        dy = this.pointer.y - this.player.y,
        l = Math.hypot(dx, dy);
      x = l > 4 ? dx / Math.max(30, l) : 0;
      y = l > 4 ? dy / Math.max(30, l) : 0;
    }
    const length = Math.hypot(x, y);
    if (length > 1 && !this.originalStage) {
      x /= length;
      y /= length;
    }
    const speed = this.originalStage
      ? 8 / ORIGINAL_STEP
      : this.down("ShiftLeft", "ShiftRight")
        ? 205
        : 290;
    this.player.x = clamp(
      this.player.x + x * speed * dt,
      this.originalStage ? this.player.displayWidth / 2 : 24,
      W - (this.originalStage ? this.player.displayWidth / 2 : 24),
    );
    this.player.y = clamp(
      this.player.y + y * speed * dt,
      this.originalStage ? this.player.displayHeight / 2 : 45,
      this.playHeight -
        (this.originalStage ? this.player.displayHeight / 2 : 36),
    );
    const direction = x < -0.15 ? -1 : x > 0.15 ? 1 : 0;
    if (direction !== this.heroDirection) {
      this.heroDirection = direction;
      this.heroAnimationTime = 0;
    } else {
      this.heroAnimationTime += dt;
    }
    const firstFrame = direction > 0 ? 2 : direction < 0 ? 4 : 0;
    const frameOffset =
      direction === 0
        ? this.originalStage
          ? Math.floor(this.originalCycle / 20) % 2
          : Math.floor(this.heroAnimationTime * 7) % 2
        : Number(this.heroAnimationTime >= 0.5);
    this.player.setFrame(`tirititran/tirititran${firstFrame + frameOffset}`);
    this.player.setAlpha(
      this.invulnerable > 0 && Math.floor(this.timer * 14) % 2 === 0 ? 0.35 : 1,
    );
    this.playerShadow.setPosition(this.player.x + 12, this.player.y + 24);
    this.updatePowerVisuals();
  }

  private down(...codes: string[]) {
    return codes.some((c) => this.held.has(c));
  }
  private firePlayer(dt: number) {
    if (!this.isAction() || this.heroFall || this.heroEntering > 60) return;
    const pad = navigator.getGamepads?.()[0];
    const manual =
      this.down("ControlLeft", "ControlRight", "KeyZ") ||
      !!this.pointer ||
      !!this.joystick ||
      !!pad?.buttons[0]?.pressed;
    this.fireAccumulator += dt;
    while (this.fireAccumulator + 1e-9 >= ORIGINAL_STEP) {
      this.fireAccumulator -= ORIGINAL_STEP;
      const shots = this.originalWeapon.tick(
        this.settings.autoFire || manual,
        this.settings.autoFire && !manual,
      );
      if (!shots) continue;
      for (const shot of shots) this.playerShot(shot);
      if (this.clones > 0) {
        this.playerShot({ x: 70, y: 80, dx: 0, dy: -25, frame: 0 });
        this.playerShot({ x: -30, y: 80, dx: 0, dy: -25, frame: 0 });
      }
      audio.sfx("disparo", 0.13, "sonidos", 120);
    }
  }
  private playerShot(shot: PlayerShot) {
    if (
      this.bullets.filter((b) => b.active && b.friendly && !b.powerBall)
        .length >= 40
    )
      return;
    const scale = this.player.scaleX,
      frame = `balas/bala${shot.frame + 1}`,
      size = this.content.sprites[frame];
    const left = this.player.x - this.player.displayWidth / 2,
      top = this.player.y - this.player.displayHeight / 2;
    const b = this.bullet(
      left + shot.x * scale + (size.width * scale) / 2,
      top + shot.y * scale + (size.height * scale) / 2,
      shot.dx / ORIGINAL_STEP,
      shot.dy / ORIGINAL_STEP,
      true,
      frame,
      shot.frame ? 8 : 4,
      13,
    );
    if (b) {
      b.nativePlayer = true;
      b.nativeDelay = true;
      b.sprite.setScale(scale).setRotation(0);
      this.shotsFired++;
    }
  }
  private bullet(
    x: number,
    y: number,
    vx: number,
    vy: number,
    friendly: boolean,
    frame = "balas/balaenemigo1_0",
    r = 6,
    damage = 1,
    homing = false,
  ) {
    if (!friendly && this.originalPowers.shotsBlocked) return;
    let b = this.processingBulletContacts
      ? undefined
      : this.bullets.find((b) => !b.active);
    if (!b) {
      const sprite = this.sprite(x, y, frame, 25);
      b = {
        sprite,
        active: false,
        friendly,
        x,
        y,
        oldY: y,
        vx,
        vy,
        r,
        damage,
        homing,
      };
      this.bullets.push(b);
    }
    Object.assign(b, {
      original: undefined,
      nativePlayer: false,
      nativeDelay: false,
      powerBall: false,
      ballCycles: 0,
      crabType: undefined,
      crabDelay: false,
      active: true,
      friendly,
      x,
      y,
      oldY: y,
      vx,
      vy,
      r,
      damage,
      homing,
    });
    b.sprite
      .setTexture("atlas", frame)
      .setPosition(x, y)
      .setVisible(true)
      .setAlpha(1)
      .setTint(0xffffff);
    if (friendly) {
      b.sprite.setScale(
        this.originalStage
          ? 1
          : frame.includes("balon")
            ? 0.55
            : frame === "balas/bala2"
              ? 0.6
              : 1.8,
      );
    } else {
      b.sprite.setScale(
        frame.includes("pompa")
          ? 0.38
          : frame.includes("alquitran")
            ? 1.25
            : frame.includes("balaenemigo1")
              ? 2.3
              : 1.3,
      );
      b.sprite.setTint(frame.includes("alquitran") ? 0xff95cc : 0xffffff);
    }
    b.sprite
      .setOrigin(0.5)
      .setRotation(friendly ? 0 : Math.atan2(vy, vx) - Math.PI / 2);
    this.collisionPrevious.set(
      b.sprite,
      this.reusePose(b.sprite, this.previousPoses),
    );
    return b;
  }
  private removeBullet(b: Bullet) {
    b.active = false;
    b.sprite.setVisible(false);
  }
  private updateBullets(dt: number) {
    const ready: Bullet[] = [];
    for (const b of this.bullets) {
      if (!b.active) continue;
      if (b.crabDelay || b.nativeDelay) {
        b.crabDelay = false;
        b.nativeDelay = false;
        b.sprite.setVisible(false);
        continue;
      }
      if (b.crabType || b.nativePlayer) b.sprite.setVisible(true);
      if (!b.powerBall) b.oldY = b.y;
      if (b.homing && b.friendly) {
        const target =
          this.boss ??
          this.enemies
            .filter((e) => !e.dead && e.y < b.y)
            .sort((a, c) => Math.abs(a.x - b.x) - Math.abs(c.x - b.x))[0];
        if (target)
          b.vx = Phaser.Math.Linear(
            b.vx,
            clamp((target.x - b.x) * 3, -220, 220),
            dt * 4,
          );
      }
      if (!b.powerBall) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
      }
      b.sprite.setPosition(b.x, b.y);
      if (b.original) {
        const frame =
          b.original === "small"
            ? Math.floor(this.originalCycle / 10) % 2
            : this.originalCycle % 4;
        b.sprite.setFrame(
          b.original === "rotating"
            ? `balas/bala_rotatoria${frame}`
            : `balas/balaenemigo${b.original === "small" ? 1 : b.original === "blue" ? 3 : 2}_${frame}`,
        );
      }
      if (b.crabType) {
        const type = b.crabType;
        const frame =
          type === "bubble"
            ? "pompa_gr"
            : type === "smallBubble"
              ? "pompa_peq"
              : type === "rot"
                ? `bala_rotatoria${this.originalCycle % 4}`
                : `balaenemigo${type === "small" ? 1 : type === "large" ? 2 : 3}_${type === "small" ? Math.floor(this.originalCycle / 10) % 2 : this.originalCycle % 4}`;
        b.sprite.setFrame(`balas/${frame}`);
      }
      if (b.homing) {
        b.sprite.rotation += dt * 6;
        b.sprite.setFrame(`balas/balon${Math.floor(this.timer * 10) % 3}`);
      }
      ready.push(b);
    }
    this.collisionCurrent.clear();
    type Contact = {
      time: number;
      bullet: Bullet;
      enemy?: Enemy;
      boss?: Boss;
      projectile?: Bullet;
      bioPic?: boolean;
      hero?: boolean;
    };
    const contacts: Contact[] = [];
    for (const b of ready) {
      if (b.friendly) {
        if (!b.powerBall && this.originalStage)
          for (const target of ready) {
            if (
              target.friendly ||
              !(
                target.original === "large" ||
                target.original === "blue" ||
                (target.crabType &&
                  target.crabType !== "small" &&
                  target.crabType !== "rot")
              )
            )
              continue;
            const time = this.spriteHitTime(b.sprite, target.sprite);
            if (time !== null)
              contacts.push({ time, bullet: b, projectile: target });
          }
        for (const boss of this.gods.length
          ? this.gods.filter((g) => g.hp > 0)
          : this.boss
            ? [this.boss]
            : []) {
          const part = boss.parts[this.phase === 3 ? 0 : 5];
          const time = this.spriteHitTime(b.sprite, part);
          if (time !== null) contacts.push({ time, bullet: b, boss });
        }
        if (this.bioPic && this.godEncounter?.bio.solid) {
          const time = this.spriteHitTime(b.sprite, this.bioPic);
          if (time !== null) contacts.push({ time, bullet: b, bioPic: true });
        }
        for (const e of this.enemies) {
          if (
            e.dead ||
            (e.arenaEnemy && !e.arenaEnemy.vulnerable) ||
            (e.original &&
              !motionVulnerable(e.original.family, e.original.motion))
          )
            continue;
          const time = this.spriteHitTime(b.sprite, e.sprite);
          if (time !== null) contacts.push({ time, bullet: b, enemy: e });
        }
      } else if (!this.heroFall) {
        const time = this.spriteHitTime(b.sprite, this.player);
        if (time !== null) contacts.push({ time, bullet: b, hero: true });
      }
    }
    contacts.sort((a, b) => a.time - b.time);
    this.processingBulletContacts = true;
    try {
      for (const hit of contacts) {
        const b = hit.bullet;
        if (!b.active) continue;
        if (hit.projectile) {
          const target = hit.projectile;
          if (!target.active) continue;
          const type = target.crabType;
          const now = this.collisionCurrent.get(target.sprite),
            before = this.collisionPrevious.get(target.sprite);
          const x =
            target.x -
            (now && before ? (now.tx - before.tx) * (1 - hit.time) : 0);
          const impactY =
            target.y -
            (now && before ? (now.ty - before.ty) * (1 - hit.time) : 0);
          this.removeBullet(target);
          this.removeBullet(b);
          if (type === "bubble") {
            const y = impactY + target.sprite.height / 2;
            this.crabAttack(
              { type: "smallBubble", pattern: "fixed", target: 450 },
              x,
              y,
            );
            this.crabAttack(
              { type: "smallBubble", pattern: "fixed", target: 50 },
              x,
              y,
            );
          }
          audio.sfx("pop", 0.25);
        } else if (hit.boss) {
          if (
            hit.boss.hp <= 0 ||
            !(this.gods.includes(hit.boss) || this.boss === hit.boss)
          )
            continue;
          if (this.phase === 3) this.hitGod(hit.boss, b.x, b.y);
          else this.hitBoss(b.damage, b.x, b.y);
          this.shotsHit++;
          this.removeBullet(b);
        } else if (hit.bioPic) {
          this.removeBullet(b);
        } else if (hit.enemy) {
          if (hit.enemy.dead) continue;
          this.hurtEnemy(hit.enemy, b.damage);
          this.shotsHit++;
          this.removeBullet(b);
        } else if (hit.hero) {
          this.removeBullet(b);
          if (this.shield > 0) {
            audio.sfx("pop", 0.25);
          } else this.damagePlayer();
        }
      }
    } finally {
      this.processingBulletContacts = false;
    }
    // A projectile may cross a target and leave the screen in the same step.
    // Resolve its path before returning it to the pool.
    for (const b of ready)
      if (
        b.active &&
        (b.x < -40 ||
          b.x > W + 40 ||
          (b.nativePlayer
            ? b.y < -b.sprite.displayHeight / 2
            : !b.powerBall && b.y < -60) ||
          (!b.powerBall && b.y > this.playHeight + 60))
      )
        this.removeBullet(b);
  }
  private spawn(s: Spawn, y = -55, deck = false) {
    if (this.enemies.length > 38) return;
    const spec = specs[s.kind],
      worldY = this.cameraY + y;
    let x = s.x;
    if (
      this.phase === 2 &&
      this.eventStarted &&
      !this.eventEnded &&
      s.surface === "road"
    )
      return;
    if (
      s.surface !== "air" &&
      s.surface !== "deck" &&
      !(
        this.phase === 2 &&
        this.eventStarted &&
        !this.eventEnded &&
        s.surface === "water"
      )
    ) {
      const lane = this.terrain.lane(
        s.surface,
        Math.max(0, worldY),
        x,
        spec.r * 0.85,
      );
      if (lane === null) return;
      x = lane;
    }
    const frames = animations[s.kind];
    let frame = frames[0];
    if (s.kind === "car")
      frame = [
        "ene_fase/ckadett_rj0",
        "ene_fase/csmart_am0",
        "ene_fase/cpicasso_az0",
        "ene_fase/cautobus_0",
      ][s.variant % 4];
    if (s.kind === "float")
      frame = `carrozas/${["c_barco", "c_castillo", "c_demonio", "c_mar"][s.variant % 4]}0`;
    const sprite = frame.startsWith("final")
      ? this.add.image(x, y, `scene:${frame}`).setDepth(10).setScale(spec.scale)
      : this.sprite(x, y, frame, 10, spec.scale);
    const e: Enemy = {
      sprite,
      parts: [],
      kind: s.kind,
      surface: s.surface,
      x,
      y,
      worldY,
      baseX: x,
      hp: spec.hp,
      maxHp: spec.hp,
      r: spec.r,
      age: 0,
      fire: 1.1 + this.rng() * 1.8,
      speed: spec.speed,
      variant: s.variant,
      dead: false,
      warning: 0,
    };
    if (s.surface === "air" && s.kind !== "mine" && s.kind !== "turret")
      e.shadow = this.sprite(x + 14, y + 24, frame, 4, spec.scale)
        .setTint(0x061120)
        .setAlpha(0.2);
    if (s.kind === "tank")
      e.parts.push(this.sprite(x, y, "ene_fase/tanquetorreta_2", 12, 0.9));
    if (s.kind === "float")
      e.parts.push(this.sprite(x, y - 85, "carrozas/tractor", 10, 0.62));
    if (deck) e.speed = 0;
    this.enemies.push(e);
  }
  private updateEnemies(dt: number) {
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (e.arenaEnemy) continue;
      if (e.original) {
        if (
          (e.surface === "air" || e.original.family === "mine") &&
          motionVulnerable(e.original.family, e.original.motion) &&
          this.spriteHitTime(e.sprite, this.player) !== null
        ) {
          if (e.original.family === "mine") this.damagePlayer(true);
          else if (this.shield > 0) this.hurtEnemy(e, 1);
          else this.damagePlayer();
        }
        continue;
      }
      e.age += dt;
      e.fire -= dt;
      if (e.surface === "air") {
        e.y += e.speed * dt;
        if (e.kind === "scout" || e.kind === "wasp")
          e.x = clamp(
            e.baseX + Math.sin(e.age * 1.8 + e.variant) * 28,
            24,
            496,
          );
        if (e.kind === "gull")
          e.x = clamp(e.baseX + Math.sin(e.age * 1.6) * 65, 20, 500);
        if (e.kind === "heli" || e.kind === "medium")
          e.x = clamp(e.baseX + Math.sin(e.age) * 48, 35, 485);
      } else if (e.surface === "deck") {
        if (!this.ship) {
          this.dismissEnemy(e);
          continue;
        }
        e.x = this.ship.x + (e.variant % 2 === 0 ? -40 : 40);
        e.y = this.ship.y + e.worldY;
      } else if (e.kind === "turret") {
        /* fixed arena emplacement */
      } else {
        e.worldY += e.speed * dt;
        e.y = e.worldY - this.cameraY;
        const lane =
          this.phase === 2 &&
          this.eventStarted &&
          !this.eventEnded &&
          e.surface === "water"
            ? clamp(e.x, e.r, W - e.r)
            : this.terrain.lane(e.surface, e.worldY, e.x, e.r * 0.85);
        if (lane === null || Math.abs(lane - e.x) > Math.max(10, 80 * dt)) {
          this.dismissEnemy(e);
          continue;
        }
        e.x = lane;
      }
      e.sprite.setPosition(e.x, e.y);
      e.shadow?.setPosition(e.x + 14, e.y + 24);
      let frame =
        animations[e.kind][
          Math.floor(e.age * (e.kind === "heli" ? 15 : 7)) %
            animations[e.kind].length
        ];
      if (e.kind === "mine") {
        frame = `ene_fase/mina${Math.min(9, Math.floor(e.age * 6))}`;
        e.r = 12 + Math.min(8, e.age * 5);
      }
      if (e.kind === "car") frame = e.sprite.frame.name;
      if (e.kind === "float")
        frame = `carrozas/${["c_barco", "c_castillo", "c_demonio", "c_mar"][e.variant % 4]}${Math.floor(e.age * 5) % 3}`;
      this.texture(e.sprite, frame);
      e.parts.forEach((p) =>
        p
          .setPosition(e.x, e.y + (e.kind === "float" ? -85 : 0))
          .setDepth(e.kind === "tank" ? 12 : 10),
      );
      if (e.kind === "tank" && e.parts[0]) {
        const angle = Math.atan2(this.player.y - e.y, this.player.x - e.x),
          direction = ((Math.round((-angle / (Math.PI * 2)) * 8) % 8) + 8) % 8;
        e.parts[0].setFrame(`ene_fase/tanquetorreta_${direction}`);
      }
      if (e.warning > 0) {
        e.warning -= dt;
        this.warning
          .lineStyle(2, 0xffd05e, 0.6)
          .strokeCircle(e.x, e.y, e.r + 7);
      }
      if (
        e.fire < 0.5 &&
        e.y > 20 &&
        e.y < 450 &&
        e.kind !== "mine" &&
        e.kind !== "gull"
      )
        e.warning = 0.04;
      if (e.fire <= 0 && e.y > 25 && e.y < 470) {
        e.fire =
          e.kind === "zeppelin"
            ? 2
            : e.kind === "float"
              ? 1.7
              : 2.4 + this.rng() * 1.2;
        if (e.kind !== "mine" && e.kind !== "gull") {
          const count = ["medium", "zeppelin", "tank", "float"].includes(e.kind)
            ? 3
            : 1;
          this.aimed(
            e.x,
            e.y + 15,
            count,
            105 + this.phase * 16,
            e.kind === "crab" ? "balas/pompa_peq" : "balas/balaenemigo2_2",
            0.22,
          );
        }
      }
      if (e.y > this.playHeight + 180 || (e.y < -250 && e.age > 4)) {
        this.dismissEnemy(e);
        continue;
      }
      if (
        circleHit(e.x, e.y, e.r * 0.85, this.player.x, this.player.y + 6, 8)
      ) {
        if (this.shield > 0) this.hurtEnemy(e, 1);
        else this.damagePlayer();
      }
    }
    this.enemies = this.enemies.filter((e) => !e.dead);
  }
  private spawnOriginal(entry: Entry, motion?: Motion) {
    const family = entry.family;
    const spec = ORIGINAL_SPECS[family];
    const slots = (this.originalPoolState[family] ??= []);
    const slot = Array.from({ length: spec.pool }, (_, i) => i).find(
      (i) =>
        !this.enemies.some(
          (e) =>
            !e.dead && e.original?.family === family && e.original.slot === i,
        ),
    );
    if (slot === undefined) return;
    const firstFrame = entry.float
      ? `carrozas/${entry.float}0`
      : entry.car
        ? `ene_fase/${entry.car}0`
        : originalFrame(family);
    const size = this.content.sprites[firstFrame];
    const x =
      entry.x === "left"
        ? -size.width
        : entry.x === "right180"
          ? 480 + size.width
          : entry.x === "right"
            ? W
            : entry.x - (entry.centerX ? size.width / 2 : 0);
    // An explicit Y is absolute except for the large ship's extra entry margin.
    const y = entry.absolute
      ? (entry.y ?? slots[slot]?.y ?? 0)
      : family === "large"
        ? -size.height + (entry.y ?? 0)
        : (entry.y ?? -size.height);
    const m = motion ?? createMotion(family, x, y, entry.moves ?? []);
    const ground = [
      "caseta",
      "crab",
      "boat",
      "octopus",
      "shell",
      "car",
      "police",
      "tank",
      "yacht",
      "barrier",
      "barrierLeft",
      "fenceLeft",
      "taxi",
      "float",
    ].includes(family);
    const e: Enemy = {
      kind: spec.kind,
      surface:
        family === "caseta"
          ? "sand"
          : ["crab", "boat", "octopus", "yacht"].includes(family)
            ? "water"
            : [
                  "shell",
                  "car",
                  "police",
                  "tank",
                  "barrier",
                  "barrierLeft",
                  "fenceLeft",
                  "taxi",
                  "float",
                ].includes(family)
              ? "road"
              : "air",
      sprite: this.sprite(m.x, m.y, firstFrame, ground ? 6 : 10).setOrigin(0),
      parts: [],
      x: m.x + size.width / 2,
      y: m.y + size.height / 2,
      worldY: 0,
      baseX: m.x,
      hp: spec.hp,
      maxHp: spec.hp,
      r: Math.min(size.width, size.height) * 0.3,
      age: 0,
      fire: Infinity,
      speed: 0,
      variant: 0,
      dead: false,
      warning: 0,
      original: {
        family,
        slot,
        born: this.originalCycle,
        motion: m,
        shots: motion ? [] : (entry.shots ?? []),
        gift: entry.gift,
        car: entry.car,
        float: entry.float,
      },
    };
    if (["large", "zeppelin", "rascasio"].includes(family))
      e.shadow = this.sprite(
        m.x + 70,
        m.y + 110,
        family === "large"
          ? "ene_generales/navegrande_sombra"
          : family === "rascasio"
            ? "ene_generales/rascasio_sombra"
            : "ene_generales/zepelin_sombra",
        4,
      ).setOrigin(0);
    if (family === "tank" || family === "yacht")
      e.parts.push(
        this.sprite(
          m.x,
          m.y,
          family === "tank"
            ? "ene_fase/tanquetorreta_0"
            : "ene_fase/barkito_torre0",
          6.5,
        ).setOrigin(0),
      );
    if (family === "float") {
      for (const frame of [
        "carrozas/tractor",
        "carrozas/fuego0_0",
        "carrozas/humo0",
        "carrozas/fuego1_0",
      ])
        e.parts.push(this.sprite(m.x, m.y, frame, 6).setOrigin(0));
      e.parts.slice(1).forEach((p) => p.setVisible(false));
    }
    this.enemies.push(e);
    if (!motion && entry.followers) {
      const f = entry.followers;
      for (let i = 1; i <= f.count; i++) {
        const followerFamily = f.family ?? family;
        this.spawnOriginal(
          {
            ...entry,
            family: followerFamily,
            followers: undefined,
            shots: [],
            gift: undefined,
          },
          followMotion(
            followerFamily,
            m,
            f.delay * i,
            (f.dx ?? 0) * i,
            (f.dy ?? 0) * i,
          ),
        );
      }
    }
  }
  private originalProjectile(
    x: number,
    y: number,
    vx: number,
    vy: number,
    type: Shot["type"],
  ) {
    if (
      this.bullets.filter(
        (b) =>
          b.active &&
          (b.original === type ||
            b.crabType === (type === "rotating" ? "rot" : type)),
      ).length >= (type === "rotating" ? 30 : 40)
    )
      return;
    const bullet = this.bullet(
      x,
      y,
      vx,
      vy,
      false,
      type === "rotating"
        ? "balas/bala_rotatoria0"
        : `balas/balaenemigo${type === "small" ? 1 : type === "blue" ? 3 : 2}_0`,
      type === "small" ? 5 : 8,
    );
    if (bullet) {
      bullet.original = type;
      bullet.sprite.setScale(1).setRotation(0).setOrigin(0.5, 0);
    }
  }
  private originalShot(e: Enemy, shot: Shot) {
    if (this.originalPowers.shotsBlocked) return;
    const queue = (direction: number, delay = 0) =>
      this.originalShots.push({
        cycle: this.originalCycle + delay,
        x: e.x,
        y: e.y,
        direction,
        type: shot.type,
      });
    if (shot.pattern === "turret") {
      const direction = (e.original?.turret ?? 6) * 2;
      const angle = (-direction * Math.PI) / 8;
      const radius = e.original?.family === "tank" ? 55 : 10;
      this.originalShots.push({
        cycle: this.originalCycle,
        x: e.x + Math.trunc(Math.cos(angle) * radius),
        y: e.y + Math.trunc(Math.sin(angle) * radius),
        direction,
        type: shot.type,
      });
    } else if (shot.pattern === "aim") {
      const angle = Math.atan2(this.player.y - e.y, this.player.x - e.x);
      this.originalProjectile(
        e.x,
        e.y,
        (Math.cos(angle) * 8) / ORIGINAL_STEP,
        (Math.sin(angle) * 8) / ORIGINAL_STEP,
        shot.type,
      );
    } else if (shot.pattern === "pair") {
      for (const offset of [-28, 28])
        this.originalProjectile(
          e.x + offset,
          e.y,
          0,
          9 / ORIGINAL_STEP,
          shot.type,
        );
    } else if (shot.pattern === "burst") {
      const left = this.player.x - this.player.displayWidth / 2;
      const emitters: [number, number, number, Shot["type"]][] = [
        [-30, 0, 70, "small"],
        [-40, 20, 50, "large"],
        [10, 0, -50, "small"],
        [30, -30, -80, "large"],
        [-20, -10, -70, "large"],
      ];
      for (const [dx, dy, target, type] of emitters) {
        const angle = Math.atan2(550 - (e.y + dy), left + target - (e.x + dx));
        this.originalProjectile(
          e.x + dx,
          e.y + dy,
          (Math.cos(angle) * 8) / ORIGINAL_STEP,
          (Math.sin(angle) * 8) / ORIGINAL_STEP,
          type,
        );
      }
    } else {
      const directions =
        shot.pattern === "five"
          ? [9, 11, 12, 13, 15]
          : shot.pattern === "circle"
            ? [12, 10, 8, 6, 4, 2, 0, 14]
            : shot.pattern === "sides"
              ? [3, 0, 13, 5, 8, 11]
              : shot.pattern === "cross"
                ? [12, 0, 8, 4]
                : shot.pattern === "three"
                  ? [10, 12, 14]
                  : shot.pattern === "closedThree"
                    ? [11, 12, 13]
                    : [2, 6, 10, 14];
      directions.forEach((direction, i) =>
        queue(direction, shot.pattern === "circle" ? i * 5 : 0),
      );
    }
  }
  private advanceOriginal(route = true) {
    this.originalCycle++;
    if (route) {
      this.distance += this.phase === 2 ? phase2Scroll(this.originalCycle) : 2;
      this.cameraY = 7520 - (this.distance % 7480);
    } else if (this.phase === 2) this.spawnPurpoReinforcements();
    for (const e of this.enemies) {
      if (e.dead || !e.original) continue;
      const { family, motion: m, shots } = e.original;
      tickMotion(m, family, this.player.x, e.sprite.width);
      if (m.frame < 0) {
        this.dismissEnemy(e);
        continue;
      }
      const frame = e.original.float
        ? `carrozas/${e.original.float}${m.frame}`
        : e.original.car
          ? `ene_fase/${e.original.car}${m.frame}`
          : originalFrame(family, m.frame);
      this.texture(e.sprite, frame);
      e.sprite.setPosition(m.x, m.y);
      e.x = m.x + e.sprite.width / 2;
      e.y = m.y + e.sprite.height / 2;
      if (family === "mine")
        e.r = Math.min(e.sprite.width, e.sprite.height) * 0.3;
      e.age = m.age * ORIGINAL_STEP;
      if (family === "float") this.drawOriginalFloat(e);
      if (family === "tank" || family === "yacht") {
        const px = this.player.x - this.player.displayWidth / 2,
          py = this.player.y - this.player.displayHeight / 2;
        const turret =
          py > m.y + e.sprite.height
            ? px < m.x
              ? 5
              : px > m.x + e.sprite.width
                ? 7
                : 6
            : py < m.y
              ? px < m.x
                ? 3
                : px > m.x + e.sprite.width
                  ? 1
                  : 2
              : px < m.x
                ? 4
                : px > m.x + e.sprite.width
                  ? 0
                  : 6;
        e.original.turret = turret;
        e.parts[0]
          .setPosition(m.x, m.y)
          .setFrame(
            family === "tank"
              ? `ene_fase/tanquetorreta_${turret}`
              : `ene_fase/barkito_torre${turret}`,
          );
      }
      e.shadow?.setPosition(m.x + 70, m.y + 110);
      for (const shot of m.wreck ? [] : shots) {
        const elapsed = m.age - shot.at;
        if (
          elapsed >= 0 &&
          elapsed % shot.interval === 0 &&
          elapsed / shot.interval < shot.count
        ) {
          this.originalShot(e, shot);
          break;
        }
      }
      if (
        m.x < -e.sprite.width * 2 - 5 ||
        m.x > W + e.sprite.width * 2 - 5 ||
        m.y < -e.sprite.height * 2 - 5 ||
        m.y > ORIGINAL_HEIGHT + e.sprite.height * 2 - 5
      )
        this.dismissEnemy(e);
    }
    for (const shot of this.originalShots) {
      if (shot.cycle > this.originalCycle) continue;
      const angle = (-shot.direction * Math.PI) / 8;
      this.originalProjectile(
        shot.x,
        shot.y,
        (Math.cos(angle) * 8) / ORIGINAL_STEP,
        (Math.sin(angle) * 8) / ORIGINAL_STEP,
        shot.type,
      );
    }
    this.originalShots = this.originalShots.filter(
      (shot) => shot.cycle > this.originalCycle,
    );
    for (const p of this.pickups) {
      if (!p.original || !p.sprite.active) continue;
      const o = p.original;
      o.cycle++;
      p.sprite.x += o.dx;
      p.sprite.y += o.dy;
      if (o.cycle > 13 && o.cycle < 400) {
        if (p.sprite.x >= 515 - p.sprite.width || p.sprite.x < 5) o.dx = -o.dx;
        if (p.sprite.y >= 475 - p.sprite.height || p.sprite.y < 5) o.dy = -o.dy;
      } else if (
        o.cycle >= 400 &&
        (p.sprite.x < -p.sprite.width * 2 ||
          p.sprite.x > W + p.sprite.width * 2 ||
          p.sprite.y < -p.sprite.height * 2 ||
          p.sprite.y > ORIGINAL_HEIGHT + p.sprite.height * 2)
      )
        p.sprite.destroy();
    }
    for (const fog of this.phase === 3 ? [] : this.weather) {
      fog.y += 3;
      if (fog.y > ORIGINAL_HEIGHT + fog.height) fog.setVisible(false);
    }
    if (!route) return;
    if (
      this.phase !== 3 &&
      this.originalCycle === (this.phase === 1 ? 150 : 1300)
    ) {
      this.weather.forEach((s) => s.destroy());
      const positions = [
        [-80, -400],
        [170, -620],
        [340, -940],
        [0, -1120],
        [300, -1400],
        [-20, -1490],
      ];
      this.weather = positions.map(([x, y], i) =>
        this.sprite(x, y, `nubes/niebla${[0, 1, 3, 2, 0, 1][i]}`, 32)
          .setOrigin(0)
          .setAlpha(this.settings.reduced ? 0.12 : 0.3),
      );
    }
    const pickup = (
      this.phase === 1
        ? PHASE1_PICKUPS
        : this.phase === 2
          ? PHASE2_PICKUPS
          : PHASE3_PICKUPS
    ).find((event) => event.cycle === this.originalCycle);
    if (pickup) {
      const type = pickup.type;
      this.drop(Math.max(150, Math.floor(this.rng() * 360)), 0, type);
      const p = this.pickups.at(-1)!;
      p.sprite.setOrigin(0).setScale(1).setY(-p.sprite.height);
      p.original = { cycle: 0, dx: 4, dy: 4 };
    }
    if (this.phase === 1 && this.originalCycle === CLOUDS_START) {
      this.clouds = CLOUD_POSITIONS.map(([x, y]) =>
        this.sprite(x, y, "nubes/nube0", 3).setOrigin(0),
      );
      this.eventStarted = true;
      this.eventLabel = "Nubes sobre Santa Catalina";
      this.notice("NUBES Y MINAS", "¡Cuidado con las bombas!", 3);
    }
    const offset = this.phase === 1 ? cloudOffset(this.originalCycle) : null;
    if (offset !== null)
      this.clouds.forEach((cloud, i) =>
        cloud.setY(CLOUD_POSITIONS[i][1] + offset),
      );
    if (this.phase === 1 && this.originalCycle === CLOUDS_END + 1) {
      this.clouds.forEach((cloud) => cloud.destroy());
      this.clouds = [];
      this.eventEnded = true;
      this.eventLabel = "";
    }
    if (this.phase === 2) this.advanceElcano();
    if (this.phase === 3) this.advanceCarnival();
    for (const entry of this.phase === 1
      ? PHASE1_TIMELINE
      : this.phase === 2
        ? PHASE2_TIMELINE
        : PHASE3_TIMELINE)
      if (entry.cycle === this.originalCycle) this.spawnOriginal(entry);
  }
  private drawOriginalFloat(e: Enemy) {
    const m = e.original!.motion,
      demon = e.original!.float === "c_demonio";
    const [tractor, fire0, smoke, fire1] = e.parts;
    const frames = (m.floatEffects ??= [0, 0, 0]);
    if (e.hp < 25 && m.age % 3 === 0) frames[0] = (frames[0] + 1) % 3;
    if (e.hp < 18 && m.age % 8 === 0) frames[1] = (frames[1] + 1) % 3;
    if (e.hp < 10 && m.age % 3 === 0) frames[2] = (frames[2] + 1) % 3;
    tractor.setPosition(
      m.x + e.sprite.width / 2 - tractor.width / 2,
      m.y + e.sprite.height,
    );
    fire0
      .setPosition(m.x + (demon ? 65 : 10), m.y + 5)
      .setFrame(`carrozas/fuego0_${frames[0]}`)
      .setVisible(e.hp < 25);
    smoke
      .setPosition(m.x + (demon ? 145 : 70), m.y + 55)
      .setFrame(`carrozas/humo${frames[1]}`)
      .setVisible(e.hp < 18);
    fire1
      .setPosition(m.x + (demon ? 70 : 60), m.y + 95)
      .setFrame(`carrozas/fuego1_${frames[2]}`)
      .setVisible(e.hp < 10);
  }
  private advanceCarnival() {
    const cycle = this.originalCycle;
    if (cycle === 2380) {
      audio.song("cabargata");
      this.eventStarted = true;
      this.eventLabel = "La cabalgata";
    }
    if (cycle === 2400) {
      this.confetti = createConfetti(this.rng);
      this.weather = this.confetti.map((p) =>
        this.sprite(p.x, p.y, `tiempo/papelillo${p.frame}`, 8)
          .setOrigin(0)
          .setAlpha(this.settings.reduced ? 0.4 : 1),
      );
    }
    if (cycle >= 2400 && cycle < 3150)
      this.confetti.forEach((p, i) => {
        const sprite = this.weather[i];
        tickConfetti(p, this.rng, sprite.width, sprite.height);
        sprite.setPosition(p.x, p.y);
      });
    if (cycle === 3150) {
      this.weather.forEach((s) => s.destroy());
      this.weather = [];
      this.confetti = [];
    }
    if (cycle === 3230) {
      audio.song("fase3");
      this.eventEnded = true;
      this.eventLabel = "";
    }
  }
  private advanceElcano() {
    const boat = this.elcano!;
    boat.tick(this.originalCycle);
    if (boat.active && !this.ship) {
      this.ship = this.sprite(-30, boat.y, "elcano/elcano", 7).setOrigin(0);
      this.ramp = this.sprite(
        boat.rampX,
        boat.y + 163,
        "elcano/rampa",
        5,
      ).setOrigin(0);
      this.eventStarted = true;
      this.eventLabel = "Juan Sebastián Elcano";
    }
    this.ship?.setY(boat.y).setVisible(boat.active);
    this.ramp?.setPosition(boat.rampX, boat.y + 163).setVisible(boat.active);
    if (this.originalCycle === 2120) audio.song("cano");
    if (this.originalCycle === 3070) audio.song("fase2");
    if (this.originalCycle === 3110) {
      this.eventEnded = true;
      this.eventLabel = "";
    }
  }
  private aimed(
    x: number,
    y: number,
    count: number,
    speed: number,
    frame: string,
    spread = 0.17,
  ) {
    const angle = Math.atan2(this.player.y - y, this.player.x - x);
    for (let j = 0; j < count; j++) {
      const a = angle + (j - (count - 1) / 2) * spread;
      this.bullet(
        x,
        y,
        Math.cos(a) * speed,
        Math.sin(a) * speed,
        false,
        frame,
        frame.includes("pompa") ? 8 : 6,
      );
    }
  }
  private hurtEnemy(e: Enemy, damage: number) {
    if (e.dead || e.original?.family === "mine") return;
    if (e.arenaEnemy && !e.arenaEnemy.vulnerable) return;
    if (e.original && !motionVulnerable(e.original.family, e.original.motion))
      return;
    e.hp -= (e.original || e.arenaEnemy) && damage < 100 ? 1 : damage;
    if (
      e.original &&
      ["wasp", "medium", "gavibot", "large", "zeppelin", "rascasio"].includes(
        e.original.family,
      )
    ) {
      const m = e.original.motion;
      this.texture(
        e.sprite,
        originalFrame(
          e.original.family,
          ["wasp", "medium", "gavibot"].includes(e.original.family)
            ? m.facing * 3 + 2
            : 2,
        ),
      );
    } else e.sprite.setTintFill(0xffeed0);
    this.time.delayedCall(45, () => {
      if (e.sprite.active) e.sprite.clearTint();
    });
    if (e.hp <= 0) {
      this.killEnemy(e);
    }
  }
  private dismissEnemy(e: Enemy) {
    if (e.original && e.original.slot !== undefined) {
      const { family, motion, slot } = e.original;
      (this.originalPoolState[family] ??= [])[slot] = {
        x: motion.x,
        y: motion.y,
      };
    }
    e.dead = true;
    e.sprite.destroy();
    e.shadow?.destroy();
    e.parts.forEach((p) => p.destroy());
  }
  private killEnemy(e: Enemy) {
    if (e.dead || e.original?.motion.wreck) return;
    this.kills++;
    this.combo++;
    this.comboTimer = 3.5;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    const multiplier = 1 + Math.min(4, Math.floor(this.combo / 10));
    this.score += e.arenaEnemy
      ? e.arenaEnemy.kind === "tower"
        ? 500
        : 150
      : Math.round(
          (e.original
            ? ORIGINAL_SPECS[e.original.family].score
            : specs[e.kind].score) * multiplier,
        );
    const explosion =
      e.kind === "boat"
        ? "lancha_exp"
        : e.kind === "crab"
          ? "exp_cangrebot"
          : e.kind === "octopus"
            ? "exp_purpito"
            : e.kind === "gull"
              ? "exp_gaviota1"
              : e.kind === "car"
                ? "exp_coche"
                : e.kind === "scout"
                  ? "exp_navepeq"
                  : e.kind === "medium"
                    ? "exp_navemed"
                    : e.kind === "turret"
                      ? "exp_torre"
                      : "expgrande";
    this.explosion(
      e.x,
      e.y,
      explosion,
      e.kind === "float" || e.kind === "zeppelin" ? 1.2 : 0.8,
    );
    audio.sfx(e.surface === "water" ? "explosion_agua" : "explosion", 0.45);
    if (e.kind === "float" && !e.original) {
      const frame = `carrozas/${["c_barco", "c_castillo", "c_demonio", "c_mar"][e.variant % 4]}3`;
      const wreck = this.sprite(e.x, e.y, frame, 8, 0.64).setAlpha(0.8);
      this.tweens.add({
        targets: wreck,
        y: e.y + 180,
        alpha: 0,
        duration: 2200,
        onComplete: () => wreck.destroy(),
      });
    }
    if (e.original?.gift) this.drop(e.x, e.y, e.original.gift);
    if (
      !e.original &&
      !e.arenaEnemy &&
      (this.kills % 7 === 0 ||
        (["zeppelin", "float", "tank"].includes(e.kind) && this.rng() > 0.5))
    )
      this.drop(
        e.x,
        e.y,
        this.kills % 28 === 0
          ? "vida"
          : this.kills % 14 === 0
            ? "disparo"
            : "poder",
      );
    if (this.combo === 10 || this.combo === 25 || this.combo === 50)
      this.notice(
        `RACHA ×${multiplier}`,
        `${this.combo} enemigos · ¡Qué arte!`,
        1.6,
      );
    if (e.original?.family === "float") {
      e.original.motion.wreck = true;
      e.original.motion.frame = 3;
      e.sprite.setFrame(`carrozas/${e.original.float}3`);
    } else this.dismissEnemy(e);
  }
  private drop(x: number, y: number, type: Pickup["type"]) {
    this.pickups.push({
      sprite: this.sprite(x, y, `agregadores/ag_${type}_0`, 26, 0.85),
      type,
      age: 0,
    });
  }
  private updatePickups(dt: number) {
    this.collisionCurrent.clear();
    for (const p of this.pickups) {
      if (!p.sprite.active) continue;
      p.age += dt;
      if (!p.original) p.sprite.y += 75 * dt;
      p.sprite.setFrame(
        `agregadores/ag_${p.type}_${Math.floor(p.age * 10) % 9}`,
      );
      const bounds = p.sprite.getBounds();
      const centerX = bounds.centerX,
        centerY = bounds.centerY;
      const dist = Phaser.Math.Distance.Between(
        centerX,
        centerY,
        this.player.x,
        this.player.y,
      );
      if (dist < 100 && !p.original) {
        p.sprite.x += (this.player.x - centerX) * dt * 6;
        p.sprite.y += (this.player.y - centerY) * dt * 6;
      }
      const touched = pickupContact(
        this.spritePose(p.sprite),
        this.spritePose(this.player),
        this.collisionPrevious.get(p.sprite),
        this.collisionPrevious.get(this.player),
      );
      if (touched && !this.heroFall) {
        if (p.type === "disparo") {
          this.originalWeapon.upgrade();
          audio.sfx(
            this.weapon === 3 ? "ag_disparo_triple" : "ag_disparo_laser",
            0.85,
          );
          this.notice(
            this.weapon === 3 ? "DISPARO TRIPLE" : "LÁSER GADITANO",
            "¡Dale caña!",
            1.5,
          );
        } else if (p.type === "vida") {
          this.lives = Math.min(9, this.lives + 1);
          audio.sfx("ag_vidagratis", 0.8);
          this.notice("VIDA EXTRA", "Todavía queda mucho arte", 1.5);
        } else {
          const full = this.originalPowers.collect();
          audio.sfx(
            full ? `energiatope${Math.floor(Math.random() * 3)}` : "ag_poder",
            0.65,
          );
        }
        this.score += 250;
        p.sprite.destroy();
      } else if (!p.original && p.sprite.y > this.playHeight + 40)
        p.sprite.destroy();
    }
    this.pickups = this.pickups.filter((p) => p.sprite.active);
  }
  private clearEnemyProjectiles() {
    this.bullets
      .filter((b) => b.active && !b.friendly)
      .forEach((b) => this.removeBullet(b));
    this.originalShots = [];
    this.crabPending = [];
  }
  private bombEnemy(e: Enemy) {
    if (
      e.dead ||
      e.original?.motion.wreck ||
      e.kind === "mine" ||
      e.arenaEnemy?.kind === "tower"
    )
      return;
    const family = e.original?.family;
    const hits = family
      ? ["crab", "octopus", "medium", "gavibot", "wasp", "yacht"].includes(
          family,
        )
        ? 3
        : ["large", "zeppelin", "rascasio"].includes(family)
          ? 5
          : family === "float"
            ? 6
            : family === "taxi"
              ? 3
              : family === "tank"
                ? 4
                : 1
      : e.kind === "float"
        ? 6
        : e.kind === "tank"
          ? 4
          : ["crab", "octopus", "medium", "wasp"].includes(e.kind)
            ? 3
            : e.kind === "zeppelin"
              ? 5
              : 1;
    e.hp -= hits * (e.original || e.arenaEnemy ? 1 : 13);
    if (e.hp <= 0) this.killEnemy(e);
  }
  private updatePowerClock(dt: number) {
    this.powerAccumulator += dt;
    while (this.powerAccumulator + 1e-9 >= ORIGINAL_STEP) {
      this.powerAccumulator -= ORIGINAL_STEP;
      const balls = this.bullets.filter((b) => b.active && b.powerBall);
      if (this.originalPowers.tick(balls.length > 0))
        audio.sfx(`desact_poder${Math.floor(Math.random() * 3)}`, 0.7);
      for (const b of balls) {
        b.oldY = b.y;
        const left = b.x - 25;
        if (left < 0 || left > W - 50) b.vx = -b.vx;
        b.x += b.vx;
        b.y += b.vy;
        b.ballCycles = (b.ballCycles ?? 0) + 1;
        b.sprite
          .setPosition(b.x, b.y)
          .setFrame(`balas/balon${Math.floor(b.ballCycles / 4) % 3}`);
        if (b.y - 25 < -105) this.removeBullet(b);
      }
      if (this.originalPowers.bombY !== null)
        this.bombWave?.setY(this.originalPowers.bombY);
      else if (this.bombWave) {
        this.bombWave.destroy();
        this.bombWave = undefined;
      }
    }
    this.updatePowerVisuals();
  }
  private updatePowerVisuals() {
    if (!this.player || !this.powerFlare) return;
    const visible = this.isAction() && !this.heroFall;
    const scale = this.player.scaleX;
    this.bombWave?.setVisible(visible);
    const flashing = this.originalPowers.visible;
    const bomb = this.originalPowers.bombY !== null,
      balls = this.balls > 0;
    this.powerWash
      .setPosition(W / 2, this.playHeight / 2)
      .setSize(W, this.playHeight)
      .setVisible(visible && !this.settings.reduced && (bomb || balls))
      .setFillStyle(
        bomb ? 0xff302a : 0xffe64d,
        bomb
          ? this.originalPowers.cycle % 2 === 0
            ? 0.16
            : 0
          : this.originalPowers.cycle % 7 < 3
            ? 0.12
            : 0,
      );
    this.shieldSprite
      .setPosition(this.player.x, this.player.y)
      .setScale(scale)
      .setVisible(
        visible && this.shield > 0 && flashing && this.originalPowers.flare < 0,
      )
      .setFrame(
        `tirititran/barrera${Math.floor(this.originalPowers.cycle / 4) % 3}`,
      );
    this.cloneSprites.forEach((s, i) =>
      s
        .setOrigin(0)
        .setAlpha(1)
        .setScale(scale)
        .setVisible(visible && this.clones > 0 && flashing)
        .setPosition(
          this.player.x +
            (i === 0 ? -40 * scale - this.player.displayWidth / 2 : 40 * scale),
          this.player.y + 15 * scale,
        ),
    );
    for (const s of this.cloneSprites) {
      if (this.clones > 0 && this.originalPowers.elapsed <= 10) {
        const reveal = Math.max(0, this.originalPowers.elapsed - 1);
        s.setCrop(
          0,
          0,
          Math.floor(s.width / 10) * reveal,
          Math.floor(s.height / 10) * reveal,
        );
      } else s.setCrop();
    }
    this.powerFlare
      .setVisible(
        visible &&
          this.originalPowers.active !== null &&
          this.originalPowers.flare >= 0,
      )
      .setScale(scale)
      .setPosition(this.player.x - 2 * scale, this.player.y)
      .setFrame(`tirititran/flare${Math.max(0, this.originalPowers.flare)}`);
  }

  private usePower() {
    if (
      !this.isAction() ||
      this.paused ||
      this.dialogue.length ||
      this.heroFall ||
      this.heroEntering > 60
    )
      return;
    if (this.uses <= 0) {
      audio.sfx("beep", 0.4);
      this.notice("SIN PODERES", "Recoge agregadores para recargar", 1.5);
      return;
    }
    if (!this.originalPowers.activate(this.power as PowerId, this.playHeight)) {
      this.notice("PODER ACTIVO", "Espera a que termine para usar otro", 1.5);
      return;
    }
    const sound =
      this.power === 0
        ? "superescudo"
        : this.power === 1
          ? "bombapoderes"
          : this.power === 2
            ? `clonacion${Math.floor(Math.random() * 2)}`
            : "esecadi";
    audio.sfx(sound, 0.9);
    this.notice(
      POWERS[this.power].name.toUpperCase(),
      POWERS[this.power].hint,
      1.6,
    );
    if (this.power === 1) {
      this.clearEnemyProjectiles();
      for (const e of [...this.enemies]) this.bombEnemy(e);
      this.bombWave?.destroy();
      this.bombWave = this.sprite(
        0,
        this.playHeight,
        "miscelanea/estela_bomba",
        28,
      ).setOrigin(0);
      if (!this.settings.reduced) this.cameras.main.shake(250, 0.008);
    }
    if (this.power === 3) {
      this.clearEnemyProjectiles();
      this.bullets
        .filter((b) => b.active && b.powerBall)
        .forEach((b) => this.removeBullet(b));
      for (let i = 0; i < 25; i++) {
        const ball = createBall(Math.random, this.playHeight);
        const b = this.bullet(
          ball.x + 25,
          ball.y + 25,
          ball.vx,
          ball.vy,
          true,
          "balas/balon0",
          20,
          13,
        );
        if (b) {
          b.powerBall = true;
          b.ballCycles = 0;
          b.sprite.setScale(1).setRotation(0);
        }
      }
    }
    this.updatePowerVisuals();
    this.publish();
  }

  private damagePlayer(ignoreShield = false) {
    if (
      this.invulnerable > 0 ||
      (this.shield > 0 && !ignoreShield) ||
      this.testGod ||
      !this.isAction() ||
      this.heroFall ||
      this.heroEntering > 0
    )
      return;
    this.hits++;
    this.health -= 1;
    this.invulnerable = 1.9;
    this.combo = 0;
    audio.sfx("muerte_2", 0.45);
    if (this.health <= 0) {
      this.heroFall = new HeroFall(
        this.player.x - this.player.displayWidth / 2,
        this.player.y - this.player.displayHeight / 2,
      );
      this.heroLifeAccumulator = 0;
      this.heroLifeCycle = Math.floor(this.timer / ORIGINAL_STEP);
      this.player.setFrame("tirititran/tirititranexp_0").setAlpha(1);
      this.player.setPosition(
        this.heroFall.x + this.player.displayWidth / 2,
        this.heroFall.y + this.player.displayHeight / 2,
      );
      this.shieldSprite.setVisible(false);
      this.powerFlare?.setVisible(false);
      this.cloneSprites.forEach((sprite) => sprite.setVisible(false));
      audio.sfx("muerte_7", 0.7);
    }
    this.publish();
  }
  private updateHeroLife(dt: number) {
    this.heroLifeAccumulator += dt;
    while (
      this.heroLifeAccumulator + 1e-9 >= ORIGINAL_STEP &&
      (this.heroFall || this.heroEntering > 0)
    ) {
      this.heroLifeAccumulator -= ORIGINAL_STEP;
      this.heroLifeCycle++;
      if (this.heroFall) {
        const fall = this.heroFall;
        const frame =
          this.content.sprites[
            `tirititran/tirititranexp_${this.heroLifeCycle % 4 === 0 ? 1 : fall.frame}`
          ];
        fall.tick(this.heroLifeCycle, frame.height, this.playHeight);
        this.player
          .setFrame(`tirititran/tirititranexp_${fall.frame}`)
          .setPosition(
            fall.x + this.player.displayWidth / 2,
            fall.drawY + this.player.displayHeight / 2,
          )
          .setAlpha(1);
        this.playerShadow.setPosition(this.player.x + 12, this.player.y + 24);
        if (fall.finished) {
          this.lives--;
          this.heroFall = undefined;
          this.weapon = 1;
          this.uses = 2;
          this.originalPowers.clearActive();
          this.bullets
            .filter((b) => b.active && b.powerBall)
            .forEach((b) => this.removeBullet(b));
          this.updatePowerVisuals();
          this.bullets
            .filter((b) => b.active && !b.friendly && b.y > 350)
            .forEach((b) => this.removeBullet(b));
          if (this.lives <= 0) {
            this.player.setVisible(false);
            this.playerShadow.setVisible(false);
            this.mode = "gameover";
            this.cancelCall();
            audio.song("opciones", "sonidos", true);
            this.save();
            emit("overlay", {
              type: "gameover",
              score: this.score,
              phase: this.phase,
              kills: this.kills,
            });
          } else {
            this.health = 3;
            this.heroEntering = 110;
            this.invulnerable = 111 * ORIGINAL_STEP;
            const startY = this.playHeight + this.player.displayHeight;
            this.player
              .setFrame("tirititran/tirititran0")
              .setPosition(260, startY + this.player.displayHeight / 2);
          }
          this.publish();
        }
      } else {
        if (this.heroEntering > 60) this.player.y -= 4;
        this.heroEntering--;
        this.player.setAlpha(Math.floor(this.heroLifeCycle / 3) % 2 ? 0.35 : 1);
        this.playerShadow.setPosition(this.player.x + 12, this.player.y + 24);
      }
    }
  }
  private updateMap() {
    this.maps.forEach((s, i) => (s.y = i * 2000 - this.cameraY));
    this.seaMask.clear();
  }
  private updateWeather(dt: number) {
    if (this.originalStage) return;
    for (let i = 0; i < this.weather.length; i++) {
      const s = this.weather[i];
      s.y += dt * (this.phase === 3 ? 45 : 22);
      s.x += Math.sin(this.timer * 0.8 + i) * dt * 7;
      if (s.y > H + 100) s.y = -100;
      if (this.phase === 1)
        s.setAlpha(this.eventStarted && !this.eventEnded ? 0.3 : 0.09);
    }
  }
  private beginVS() {
    if (this.mode !== "playing") return;
    this.clearAction();
    this.cancelCall();
    this.mode = "vs";
    this.versusCycles = 0;
    this.resizePlayfield(H);
    this.player.setScale(0.64);
    this.player.setVisible(false);
    this.playerShadow.setVisible(false);
    this.shieldSprite.setVisible(false);
    this.powerFlare?.setVisible(false);
    this.cloneSprites.forEach((s) => s.setVisible(false));
    audio.stopEffects();
    this.sequence = new Sequence(
      this,
      this.content.scripts[`vs_fase${this.phase}/vs`],
      `vs_fase${this.phase}`,
      () => {
        this.sequence = undefined;
        emit("overlay", null);
        this.startBoss();
      },
    );
    emit("overlay", {
      type: "sequence",
      title: "El duelo",
      hint: "Espacio / Enter para continuar",
    });
    this.publish();
  }
  private startBoss() {
    this.mode = "boss";
    this.sea?.setVisible(false);
    this.timer = 0;
    this.cameraY = 0;
    this.maps.forEach((s) => s.setVisible(false));
    this.weather.forEach((s) => s.setVisible(false));
    this.ship?.destroy();
    this.ship = undefined;
    this.ramp?.destroy();
    this.ramp = undefined;
    this.resizePlayfield(ORIGINAL_HEIGHT);
    this.player.setScale(1).setVisible(true).setPosition(260, 422.5);
    this.playerShadow.setVisible(true);
    this.invulnerable = 3;
    const bg = this.add
      .image(0, 0, `scene:final${this.phase}/fondo_final_fase`)
      .setOrigin(0)
      .setDisplaySize(W, this.playHeight)
      .setDepth(0);
    this.arena.push(bg);
    if (this.phase === 2) {
      bg.setVisible(false);
      for (let row = 0; row < 13; row++)
        for (let col = 0; col < 13; col++) {
          const tile = this.sprite(
            col * 40,
            (row - 1) * 40,
            "mapaagua/tile0",
            0,
          ).setOrigin(0);
          this.arenaWater.push(tile);
          this.arena.push(tile);
        }
      this.bridgeFoam = this.add
        .image(0, 0, "scene:final2/espuma0")
        .setOrigin(0)
        .setDepth(2);
      this.arena.push(
        this.bridgeFoam,
        this.add.image(0, 0, "scene:final2/puente").setOrigin(0).setDepth(3),
      );
    }
    if (this.phase === 3)
      this.arena.push(
        this.add.image(0, 17, "scene:final3/ptierra").setOrigin(0).setDepth(3),
      );
    if (this.phase === 3) bg.setScale(1);
    this.originalWeapon.tripleRemaining = 70;
    this.originalWeapon.release();
    this.fireAccumulator = 0;
    if (this.phase === 3) this.createGods();
    else this.createBoss(0);
    audio.song(`final${this.phase}`);
    this.notice("JEFE FINAL", PHASES[this.phase - 1].boss, 2);
    if (this.phase === 1) {
      this.crabPending = [];
      this.originalCycle = 0;
      this.originalAccumulator = 0;
      for (const x of [470, -8]) this.spawnArenaEnemy(arenaTower(x));
    }
    if (this.phase >= 2) {
      this.originalCycle =
        (this.phase === 2 ? PHASE2_END : PHASE3_END) +
        Math.floor(this.versusCycles);
      this.originalAccumulator = 0;
      this.originalShots = [];
      this.crabPending = [];
      if (this.phase === 2) this.updatePurpoWater();
    }
    this.publish();
  }
  private spawnArenaEnemy(state: ArenaEnemy) {
    if (
      state.kind === "crab" &&
      this.enemies.filter((e) => !e.dead && e.arenaEnemy?.kind === "crab")
        .length >= 4
    )
      return;
    const sprite =
      state.kind === "tower"
        ? this.add
            .image(state.x, state.y, "scene:final1/torre0")
            .setDepth(6)
            .setOrigin(0)
        : this.sprite(state.x, state.y, "ene_fase/cangrebot_0", 6).setOrigin(0);
    this.enemies.push({
      arenaEnemy: state,
      sprite,
      parts: [],
      kind: state.kind === "tower" ? "turret" : "crab",
      surface: "deck",
      x: state.x + sprite.width / 2,
      y: state.y + sprite.height / 2,
      worldY: state.y,
      baseX: state.x,
      hp: state.kind === "tower" ? 50 : 10,
      maxHp: state.kind === "tower" ? 50 : 10,
      r: Math.min(sprite.width, sprite.height) * 0.3,
      age: 0,
      fire: 0,
      speed: 0,
      variant: 0,
      dead: false,
      warning: 0,
    });
  }
  private crabProjectile(
    x: number,
    y: number,
    vx: number,
    vy: number,
    type: CrabBullet,
    defer = false,
  ) {
    const limit =
      type === "rot"
        ? 30
        : type === "bubble" || type === "smallBubble"
          ? 5
          : 40;
    if (
      this.bullets.filter(
        (b) =>
          b.active &&
          (b.crabType === type ||
            b.original === (type === "rot" ? "rotating" : type)),
      ).length >= limit
    )
      return;
    const frame =
      type === "bubble"
        ? "pompa_gr"
        : type === "smallBubble"
          ? "pompa_peq"
          : type === "rot"
            ? "bala_rotatoria0"
            : `balaenemigo${type === "small" ? 1 : type === "large" ? 2 : 3}_0`;
    const b = this.bullet(
      x,
      y,
      vx / ORIGINAL_STEP,
      vy / ORIGINAL_STEP,
      false,
      `balas/${frame}`,
      type === "small" ? 5 : 8,
    );
    if (b) {
      b.crabType = type;
      b.crabDelay = defer;
      b.sprite.setScale(1).setOrigin(0.5, 0).setRotation(0);
    }
  }
  private crabAttack(attack: CrabAttack, x: number, y: number, defer = false) {
    const aimed = (
      type: CrabBullet,
      px: number,
      py: number,
      targetX: number,
      targetY: number,
    ) => {
      const a = Math.atan2(targetY - py, targetX - px),
        speed = type === "bubble" || type === "smallBubble" ? 5 : 8;
      this.crabProjectile(
        px,
        py,
        Math.cos(a) * speed,
        Math.sin(a) * speed,
        type,
        defer,
      );
    };
    if (attack.pattern === "burst") {
      const left = this.player.x - this.player.displayWidth / 2;
      for (const [dx, dy, target, type] of [
        [-30, 0, 70, "small"],
        [-40, 20, 50, "large"],
        [10, 0, -50, "small"],
        [30, -30, -80, "large"],
        [-20, -10, -70, "large"],
      ] as const)
        aimed(type, x + dx, y + dy, left + target, 550);
      for (let i = 1; i < (attack.bursts ?? 1); i++)
        this.crabPending.push({ at: this.originalCycle + i * 10, x, y });
    } else if (attack.pattern === "fixed" || attack.pattern === "aim") {
      aimed(
        attack.type,
        x,
        y,
        attack.pattern === "aim" ? this.player.x : attack.target!,
        attack.pattern === "aim" ? this.player.y : 550,
      );
    } else if (attack.pattern === "pair") {
      for (const dx of [-28, 28])
        this.crabProjectile(x + dx, y, 0, 9, attack.type, defer);
    } else {
      const directions =
        attack.pattern === "circle" || attack.pattern === "eight"
          ? [12, 10, 8, 6, 4, 2, 0, 14]
          : attack.pattern === "cross"
            ? [12, 0, 8, 4]
            : attack.pattern === "diagonal"
              ? [2, 6, 10, 14]
              : attack.pattern === "five"
                ? [9, 11, 12, 13, 15]
                : attack.pattern === "three"
                  ? [10, 12, 14]
                  : attack.pattern === "closedThree"
                    ? [11, 12, 13]
                    : [3, 0, 13, 5, 8, 11];
      for (const [i, d] of directions.entries()) {
        if (attack.pattern === "circle" && i > 0) {
          this.originalShots.push({
            cycle: this.originalCycle + i * 5,
            x,
            y,
            direction: d,
            type:
              attack.type === "rot"
                ? "rotating"
                : (attack.type as Shot["type"]),
          });
          continue;
        }
        const a = (-d * Math.PI) / 8;
        this.crabProjectile(
          x,
          y,
          Math.cos(a) * 8,
          Math.sin(a) * 8,
          attack.type,
          defer,
        );
      }
    }
  }
  private updateOriginalCrabBoss(dt: number) {
    const b = this.boss!,
      native = this.crabBoss!;
    b.age += dt;
    b.hit = Math.max(0, b.hit - dt);
    this.originalCycle++;
    // Auxiliary enemies and delayed bullets run before mover/crearDisparo/dibujar.
    for (const e of this.enemies) {
      const state = e.arenaEnemy;
      if (e.dead || !state) continue;
      const fire = tickArenaEnemy(state);
      if (!state.active) {
        this.dismissEnemy(e);
        continue;
      }
      this.texture(
        e.sprite,
        state.kind === "tower"
          ? `final1/torre${state.frame}`
          : `ene_fase/cangrebot_${state.frame}`,
      );
      e.x = e.sprite.x + Math.floor(e.sprite.width / 2);
      e.y = e.sprite.y + Math.floor(e.sprite.height / 2);
      if (fire && !this.originalPowers.shotsBlocked)
        this.crabAttack({ type: "small", pattern: "aim" }, e.x, e.y);
      if (state.vulnerable && this.pixelOverlap(e.sprite, this.player)) {
        if (this.shield > 0) this.hurtEnemy(e, 1);
        else this.damagePlayer();
      }
    }
    const due = this.crabPending.filter((s) => s.at <= this.originalCycle);
    this.crabPending = this.crabPending.filter(
      (s) => s.at > this.originalCycle,
    );
    for (const s of due)
      this.crabAttack({ type: "small", pattern: "burst" }, s.x, s.y);
    if (this.originalPowers.shotsBlocked) native.blocked = 1;
    const { attack, castanets, reinforcements } = native.tick();
    b.root.setPosition(native.x, native.y);
    b.x = native.x + 78 + Math.floor(b.parts[5].width / 2);
    b.y = native.y + 130 + Math.floor(b.parts[5].height / 2);
    if (attack) this.crabAttack(attack, b.x, b.y, true);
    b.parts[1].setFrame(`jefe1/cang_pata_iz${native.legs}`);
    b.parts[2].setFrame(`jefe1/cang_pata_de${native.legs}`);
    b.parts[3].setFrame(`jefe1/cang_brazo_iz${native.leftArm}`);
    b.parts[4].setFrame(`jefe1/cang_brazo_de${native.rightArm}`);
    b.parts[5].setFrame(
      b.hit > 0 ? "jefe1/cang_boca_impacto" : "jefe1/cang_boca",
    );
    b.parts[6].setFrame(
      `jefe1/cang_ojos_${["ab", "ce", "iz", "de"][native.eyes]}`,
    );
    if (castanets) audio.sfx("castanuelas", 0.7);
    if (reinforcements) {
      audio.sfx("sirenas", 0.7);
      for (const e of this.enemies) {
        const s = e.arenaEnemy;
        if (!e.dead && s?.kind === "tower") {
          s.cycle = 0;
          s.open = true;
          s.closing = false;
          s.direction = 1;
          s.shots =
            s.x > 0
              ? { at: 40, interval: 90, count: 4 }
              : { at: 60, interval: 60, count: 4 };
        }
      }
      this.spawnArenaEnemy(
        arenaCrab(
          Math.floor(this.rng() * 150),
          Math.floor(480 / 7) * 4,
          70,
          80,
        ),
      );
      this.spawnArenaEnemy(
        arenaCrab(Math.max(220, Math.floor(this.rng() * 480)), 240, 90, 90),
      );
    }
    if (this.pixelOverlap(b.parts[5], this.player)) this.damagePlayer(true);
  }
  private captureCollisionState() {
    this.collisionPrevious.clear();
    this.collisionCurrent.clear();
    this.capturePreviousPose(this.player);
    for (const e of this.enemies)
      if (!e.dead) this.capturePreviousPose(e.sprite);
    if (this.gods.length) {
      for (const god of this.gods)
        for (const part of god.parts) this.capturePreviousPose(part);
    } else if (this.boss) {
      for (const part of this.boss.parts) this.capturePreviousPose(part);
    }
    if (this.bioPic) this.capturePreviousPose(this.bioPic);
    for (const sprite of this.purpoTar)
      if (sprite.active) this.capturePreviousPose(sprite);
    for (const bullet of this.bullets)
      if (bullet.active) this.capturePreviousPose(bullet.sprite);
    for (const pickup of this.pickups) this.capturePreviousPose(pickup.sprite);
  }
  private capturePreviousPose(sprite: Phaser.GameObjects.Image) {
    if (sprite.active)
      this.collisionPrevious.set(
        sprite,
        this.reusePose(sprite, this.previousPoses),
      );
  }
  private reusePose(
    sprite: Phaser.GameObjects.Image,
    poses: WeakMap<Phaser.GameObjects.Image, SpritePose>,
  ) {
    const pose = this.spritePose(sprite, poses.get(sprite));
    poses.set(sprite, pose);
    return pose;
  }

  private alphaMask(sprite: Phaser.GameObjects.Image): AlphaMask {
    return this.frameAlphaMask(sprite.frame, sprite.texture.key);
  }
  // Prepare common frames during loading, bounded to 128 KiB of cached alpha data.
  // Enemy frames remain lazy; prewarming the complete atlas would retain much more.
  private warmCollisionMasks() {
    const texture = this.textures.get("atlas");
    const names = [
      ...Array.from({ length: 7 }, (_, i) => `tirititran/tirititran${i}`),
      ...Object.keys(this.content.sprites).filter((name) =>
        name.startsWith("balas/"),
      ),
    ];
    let remaining = 128 * 1024;
    for (const name of names) {
      if (!texture.has(name)) continue;
      const frame = texture.get(name);
      const bytes = frame.realWidth * frame.realHeight;
      if (bytes > remaining) continue;
      this.frameAlphaMask(frame, texture.key);
      remaining -= bytes;
    }
  }
  private frameAlphaMask(
    frame: Phaser.Textures.Frame,
    textureKey: string,
  ): AlphaMask {
    const key = `${textureKey}:${frame.name}`;
    const cached = this.collisionMasks.get(key);
    if (cached) return cached;
    const canvas = (this.collisionCanvas ??= document.createElement("canvas"));
    canvas.width = frame.realWidth;
    canvas.height = frame.realHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(
      frame.source.image as CanvasImageSource,
      frame.cutX,
      frame.cutY,
      frame.cutWidth,
      frame.cutHeight,
      frame.x,
      frame.y,
      frame.cutWidth,
      frame.cutHeight,
    );
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data,
      alpha = new Uint8Array(canvas.width * canvas.height);
    let minX = canvas.width,
      minY = canvas.height,
      maxX = -1,
      maxY = -1;
    for (let y = 0; y < canvas.height; y++)
      for (let x = 0; x < canvas.width; x++) {
        const i = y * canvas.width + x;
        alpha[i] = data[i * 4 + 3];
        if (alpha[i] > 0) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    const mask = {
      width: canvas.width,
      height: canvas.height,
      alpha,
      opaque: {
        x: minX,
        y: minY,
        width: Math.max(0, maxX - minX + 1),
        height: Math.max(0, maxY - minY + 1),
      },
    };
    this.collisionMasks.set(key, mask);
    return mask;
  }
  private spritePose(
    sprite: Phaser.GameObjects.Image,
    output?: SpritePose,
  ): SpritePose {
    const matrix = sprite.getWorldTransformMatrix(
        this.poseMatrix,
        this.poseParentMatrix,
      ),
      bounds = sprite.getBounds(this.poseBounds);
    const pose = output ?? ({ bounds: {} } as SpritePose);
    pose.a = matrix.a;
    pose.b = matrix.b;
    pose.c = matrix.c;
    pose.d = matrix.d;
    pose.tx = matrix.tx;
    pose.ty = matrix.ty;
    pose.originX = sprite.displayOriginX;
    pose.originY = sprite.displayOriginY;
    pose.flipX = sprite.flipX;
    pose.flipY = sprite.flipY;
    pose.bounds.x = bounds.x;
    pose.bounds.y = bounds.y;
    pose.bounds.width = bounds.width;
    pose.bounds.height = bounds.height;
    pose.mask = this.alphaMask(sprite);
    return pose;
  }
  private spriteHitTime(
    a: Phaser.GameObjects.Image,
    b: Phaser.GameObjects.Image,
  ) {
    const current = (sprite: Phaser.GameObjects.Image) => {
      let pose = this.collisionCurrent.get(sprite);
      if (!pose) {
        pose = this.reusePose(sprite, this.currentPoses);
        this.collisionCurrent.set(sprite, pose);
      }
      return pose;
    };
    return spriteContact(
      current(a),
      current(b),
      this.collisionPrevious.get(a),
      this.collisionPrevious.get(b),
    );
  }
  private pixelOverlap(
    a: Phaser.GameObjects.Image,
    b: Phaser.GameObjects.Image,
  ) {
    return spriteContact(this.spritePose(a), this.spritePose(b)) !== null;
  }

  private createGods() {
    this.godEncounter = new OriginalGodEncounter();
    this.gods = this.godEncounter.gods.map((native, i) => {
      const c = GOD_CONFIGS[i],
        root = this.add.container(c.x, c.y).setDepth(12);
      const body = this.sprite(0, 0, godFrame(i, 0), 12).setOrigin(0);
      const fire = this.sprite(c.fire[0], c.fire[1], "carrozas/fuego0_0", 12)
        .setOrigin(0)
        .setVisible(false);
      const smoke = this.sprite(c.smoke[0], c.smoke[1], "carrozas/humo0", 12)
        .setOrigin(0)
        .setVisible(false);
      root.add([body, fire, smoke]);
      return {
        root,
        parts: [body, fire, smoke],
        hp: 130,
        maxHp: 130,
        x: c.x + Math.floor(body.width / 2),
        y: c.y + Math.floor(body.height / 2),
        r: 40,
        age: 0,
        fire: 0,
        attack: 0,
        god: i,
        warning: 0,
        hit: 0,
      };
    });
    this.boss = this.gods[0];
    this.bioPic = this.sprite(175, 190, bioPicFrame(0), 14)
      .setOrigin(0)
      .setVisible(false);
  }
  private spawnGodTraffic() {
    if (this.originalCycle % 120 !== 0) return;
    const cars = [
      "cmercedes_cr",
      "cmercedes_gr",
      "cmercedes_rj",
      "cautobus_",
      "ckadett_az",
      "ckadett_rj",
      "ckadett_vd",
      "cpicasso_az",
      "cpicasso_gr",
      "cpicasso_vi",
      "cseicento_gr",
      "csmart_am",
      "csmart_az",
      "csmart_ve",
    ];
    const car = cars[1 + Math.floor(this.rng() * 13)],
      right = this.rng() < 0.5,
      top = this.rng() < 0.5;
    const size = this.content.sprites[`ene_fase/${car}0`];
    this.spawnOriginal({
      cycle: this.originalCycle,
      family: "car",
      car,
      x: (right ? 440 : 94) - Math.floor(size.width / 2),
      y: top ? -size.height : 480,
      absolute: true,
      moves: [[0, -1, 0, top ? 8 : -8, -1]],
    });
  }
  private updateOriginalGods(dt: number) {
    const encounter = this.godEncounter!;
    this.advanceOriginal(false);
    this.spawnGodTraffic();
    const due = this.crabPending.filter((s) => s.at <= this.originalCycle);
    this.crabPending = this.crabPending.filter(
      (s) => s.at > this.originalCycle,
    );
    for (const s of due)
      this.crabAttack({ type: "small", pattern: "burst" }, s.x, s.y);
    if (this.originalPowers.shotsBlocked) {
      encounter.gods.forEach((g) => (g.blocked = 1));
      encounter.bio.blocked = 1;
    }
    const result = encounter.tick(this.originalCycle, this.rng);
    this.gods.forEach((b, i) => {
      const native = encounter.gods[i],
        c = GOD_CONFIGS[i];
      b.age += dt;
      b.hit = Math.max(0, b.hit - dt);
      b.hp = native.hp;
      b.parts[0].setFrame(godFrame(i, native.renderFrame));
      b.parts[1]
        .setFrame(`carrozas/fuego0_${native.fire}`)
        .setVisible(native.dead);
      b.parts[2]
        .setFrame(`carrozas/humo${native.fire}`)
        .setVisible(native.dead);
      b.x = c.x + Math.floor(b.parts[0].width / 2);
      b.y = c.y + Math.floor(b.parts[0].height / 2);
      if (result.shots[i]) this.crabAttack(result.shots[i]!, b.x, b.y);
      if (!native.dead && this.spriteHitTime(b.parts[0], this.player) !== null)
        this.damagePlayer(true);
    });
    if (result.partyStarted) audio.song("gaditana");
    if (result.partyEnded) audio.song("final3");
    const bio = encounter.bio,
      sprite = this.bioPic!;
    sprite.setFrame(bioPicFrame(bio.frame)).setVisible(bio.visible);
    for (const shot of result.bioShots)
      this.crabAttack(
        shot,
        175 + Math.floor(sprite.width / 2),
        190 + Math.floor(sprite.height / 2) - 30,
      );
    if (bio.solid && this.spriteHitTime(sprite, this.player) !== null)
      this.damagePlayer(true);
    this.boss = this.gods.find((g) => g.hp > 0);
  }
  private hitGod(b: Boss, x?: number, y?: number) {
    const native = this.godEncounter?.gods[b.god];
    if (!native || native.dead) return;
    native.hit();
    b.hp = native.hp;
    if (native.dead) {
      this.score += 1000;
      b.parts[0].setFrame(godFrame(b.god, GOD_CONFIGS[b.god].ruin));
      b.parts.slice(1).forEach((p) => p.setVisible(true));
      this.explosion(b.x, b.y, "expgrande", 1);
      audio.sfx("exp_jefes", 0.9);
      this.boss = this.gods.find((g) => g.hp > 0);
      if (!this.boss) {
        audio.stopMusic();
        this.clearEnemyProjectiles();
        this.finishBossFight();
      }
    }
  }
  private createBoss(god: number) {
    const hp = this.phase <= 2 ? 220 : 1150 + god * 150;
    const root = this.add.container(260, -190).setDepth(12),
      parts: Phaser.GameObjects.Image[] = [];
    const part = (x: number, y: number, frame: string, scale = 1) => {
      const s = this.add.image(x, y, "atlas", frame).setScale(scale);
      root.add(s);
      parts.push(s);
      return s;
    };
    if (this.phase === 1) {
      this.crabBoss = new OriginalCrabBoss();
      root.setPosition(150, -25);
      for (const [x, y, frame] of CRAB_PARTS)
        part(x, y, `jefe1/${frame}`).setOrigin(0);
    } else if (this.phase === 2) {
      this.purpoBoss = new OriginalPurpoBoss(this.rng);
      root.setPosition(0, 0).setDepth(8);
      for (const [x, y, frame] of PURPO_PARTS)
        part(x, y, `jefe2/${frame}`).setOrigin(0);
      parts.slice(0, 4).forEach((p) => p.setVisible(false));
      parts.slice(6).forEach((p) => p.setVisible(false));
      this.purpoTar = this.purpoBoss.tar.map((t) => {
        const img = this.sprite(t.x, t.y, `jefe2/alquitran${t.frame}`, 12)
          .setOrigin(0)
          .setVisible(false);
        root.add(img);
        return img;
      });
      // Draw order in JefeFase2::dibujar: stain/nozzles/tar, legs, tentacle, head.
      root.bringToTop(parts[4]);
      for (const p of parts.slice(0, 4)) root.bringToTop(p);
      root.bringToTop(parts[5]);
    }
    this.boss = {
      root,
      parts,
      hp,
      maxHp: hp,
      x: 260,
      y: -190,
      r: this.phase === 3 ? 49 : 65,
      age: 0,
      fire: 3.2,
      attack: 0,
      god,
      warning: 0,
      hit: 0,
    };
    if (this.phase === 2) {
      this.boss.x = 186 + Math.floor(parts[5].width / 2);
      this.boss.y = 35 + Math.floor(parts[5].height / 2);
      this.boss.r = 40;
    }
    if (this.phase === 1) {
      this.boss.x = 150 + 78 + Math.floor(this.boss.parts[5].width / 2);
      this.boss.y = -25 + 130 + Math.floor(this.boss.parts[5].height / 2);
      this.boss.r = 40;
    }
  }
  private updatePurpoWater() {
    const ticks = this.purpoBoss?.ticks ?? 0;
    const offset = ticks % 920;
    const index = 299 - Math.floor(offset / 40) * 13;
    this.arenaWater.forEach((tile, i) =>
      tile
        .setPosition(
          (i % 13) * 40,
          (Math.floor(i / 13) - 1) * 40 + (offset % 40),
        )
        .setFrame(`mapaagua/tile${waterData[index + i]}`),
    );
    if (ticks > 0 && this.originalCycle % 10 === 0)
      this.foamStep = (this.foamStep + 1) % 4;
    this.bridgeFoam?.setTexture(
      `scene:final2/espuma${[0, 1, 2, 1][this.foamStep]}`,
    );
  }
  private spawnPurpoReinforcements() {
    const cycle = this.originalCycle;
    if (cycle % 300 === 0) {
      const exit = Math.floor(this.rng() * 3);
      for (const side of [-1, 1]) {
        const dx = exit === 2 ? 0 : side * 6,
          dy = exit === 0 ? 0 : exit === 1 ? 6 : -6;
        this.spawnOriginal({
          cycle,
          family: "helicopter",
          x: side === -1 ? 104 : 416,
          centerX: true,
          moves: [
            [3, 25, -side * 2, 10, -1],
            [2, 5, 2, 6, -1],
            [5, 10, dx, dy, -1],
            [3, -1, dx, dy, -1],
          ],
        });
      }
    }
    if (cycle % 400 === 0) {
      const size = this.content.sprites[originalFrame("tank")];
      const fromRight = this.rng() < 0.5,
        dx = fromRight ? -4 : 4;
      this.spawnOriginal({
        cycle,
        family: "tank",
        x: fromRight ? 520 : -size.width,
        y: 48 - Math.floor(size.height / 2),
        absolute: true,
        moves: [
          [0, 40, dx, 0, -1],
          [6, 100, fromRight ? 1 : -1, 0, -1],
          [0, 40, -dx, 0, -1],
        ],
        shots: [
          { at: 30, type: "small", pattern: "turret", count: 5, interval: 40 },
        ],
      });
    }
  }
  private updateOriginalPurpoBoss(dt: number) {
    const b = this.boss!,
      native = this.purpoBoss!;
    b.age += dt;
    b.hit = Math.max(0, b.hit - dt);
    this.advanceOriginal(false);
    const due = this.crabPending.filter((s) => s.at <= this.originalCycle);
    this.crabPending = this.crabPending.filter(
      (s) => s.at > this.originalCycle,
    );
    for (const s of due)
      this.crabAttack({ type: "small", pattern: "burst" }, s.x, s.y);
    if (this.originalPowers.shotsBlocked) native.blocked = 1;
    const shot = native.tick();
    if (shot) this.crabAttack(shot, b.x, 35 + b.parts[5].height);
    for (let i = 0; i < 4; i++)
      b.parts[i]
        .setFrame(
          `jefe2/tent${i + 1}_${String(native.tentacle === i ? native.tentacleFrame : 0).padStart(2, "0")}`,
        )
        .setVisible(native.tentacle === i);
    b.parts[4].setFrame(`jefe2/patas_${native.legs}`);
    b.parts[5].setFrame(`jefe2/cabeza_${native.head}`);
    this.showPurpoHit();
    b.parts[6]
      .setFrame(`jefe2/mancha_${native.stain}`)
      .setVisible(native.stainVisible);
    for (const p of b.parts.slice(7))
      p.setFrame(
        `jefe2/disparando_${String(native.nozzle).padStart(2, "0")}`,
      ).setVisible(native.nozzlesVisible);
    this.purpoTar.forEach((img, i) =>
      img
        .setPosition(native.tar[i].x, native.tar[i].y)
        .setVisible(native.tar[i].active && native.nozzlesVisible),
    );
    this.updatePurpoWater();
    const hazards = [
      b.parts[5],
      ...(native.tentacle >= 0 ? [b.parts[native.tentacle]] : []),
      ...this.purpoTar.filter((_, i) => native.attack && native.tar[i].active),
    ];
    if (hazards.some((p) => this.spriteHitTime(p, this.player) !== null))
      this.damagePlayer(true);
  }
  private updateBoss(dt: number) {
    const b = this.boss;
    if (!b) return;
    if (this.phase === 1) {
      this.updateOriginalCrabBoss(dt);
      return;
    }
    if (this.phase === 2) {
      this.updateOriginalPurpoBoss(dt);
      return;
    }
    this.updateOriginalGods(dt);
  }
  private showPurpoHit() {
    const b = this.boss;
    if (this.phase !== 2 || !b) return;
    // Head and legs share the face artwork: tint both to avoid a visible seam.
    for (const part of [b.parts[4], b.parts[5]]) {
      if (b.hit <= 0) part.clearTint();
      else part.setTint(this.settings.reduced ? 0xfff7f7 : 0xffeeee);
    }
  }
  private hitBoss(damage: number, hitX?: number, hitY?: number) {
    if (this.phase === 3 && this.boss) {
      this.hitGod(this.boss, hitX, hitY);
      return;
    }
    const b = this.boss;
    if (!b || (this.phase === 3 && b.age < 2.6) || b.hp <= 0) return;
    b.hp -= this.phase <= 2 ? 1 : damage * 0.42;
    b.hit = this.phase <= 2 ? ORIGINAL_STEP * 2 : 0.1;
    this.showPurpoHit();
    if (b.hp <= 0) this.defeatBoss();
  }
  private defeatBoss() {
    const b = this.boss;
    if (!b) return;
    if (this.phase !== 3 || b.god === 2) audio.stopMusic();
    this.score +=
      this.phase === 1
        ? 1500
        : this.phase === 2
          ? 1800
          : 4000 + this.phase * 1000;
    this.explosion(b.x, b.y, "expgrande", 2);
    audio.sfx("exp_jefes", 0.9);
    this.bullets
      .filter((b) => b.active && !b.friendly)
      .forEach((b) => this.removeBullet(b));
    const remains = this.sprite(
      b.x,
      b.y,
      this.phase === 1
        ? "explosiones/cangrejo"
        : this.phase === 2
          ? "explosiones/purpo"
          : `jefe3/${["baco", "hercules", "neptuno"][b.god]}_exp`,
      11,
      this.phase === 3 ? 0.8 : 1,
    );
    this.bossRemains = remains;
    this.tweens.add({
      targets: remains,
      y: b.y + 70,
      angle: 18,
      alpha: 0,
      duration: 1300,
      onComplete: () => remains.destroy(),
    });
    b.root.destroy(true);
    this.purpoTar = [];
    this.purpoBoss = undefined;
    this.boss = undefined;
    this.finishBossFight();
  }
  private finishBossFight() {
    for (const e of [...this.enemies]) this.killEnemy(e);
    this.enemies = [];
    this.mode = "victory";
    this.updatePowerVisuals();
    this.save();
    this.player.setVisible(false);
    this.playerShadow.setVisible(false);
    this.shieldSprite.setVisible(false);
    this.powerFlare?.setVisible(false);
    this.cloneSprites.forEach((s) => s.setVisible(false));
    this.cancelCall();
    if (this.phase < 3) {
      this.unlocked = Math.max(this.unlocked, this.phase + 1);
      this.save();
    }
    this.victoryDelay = 1.4;
    this.victoryPending = true;
    this.publish();
  }
  private playVictory() {
    this.sequence = new Sequence(
      this,
      this.content.scripts[`diario_fase${this.phase}/diario`],
      `diario_fase${this.phase}`,
      () => {
        this.sequence = undefined;
        if (this.phase === 3) {
          this.mode = "complete";
          audio.song("opciones", "sonidos", true);
          emit("overlay", {
            type: "complete",
            score: this.score,
            kills: this.kills,
            combo: this.bestCombo,
            time: this.elapsed,
          });
        } else
          emit("overlay", {
            type: "victory",
            phase: this.phase,
            score: this.score,
            combo: this.bestCombo,
          });
        this.publish();
      },
    );
    emit("overlay", {
      type: "sequence",
      title: "Misión cumplida",
      hint: "Espacio / Enter para avanzar",
    });
    this.publish();
  }
  private cancelCall() {
    this.call = null;
    this.callAnswered = false;
    audio.stopIntercom();
  }
  private offerCall(name: string) {
    if (!this.content.scripts[`conversaciones/${name}`]) return;
    this.call = name;
    this.callAnswered = false;
    this.callAge = 0;
    audio.ringIntercom();
    this.publish();
  }
  private openCall() {
    if (
      !this.call ||
      !this.isAction() ||
      this.paused ||
      this.dialogue.length ||
      this.heroFall
    )
      return;
    const xml = this.content.scripts[`conversaciones/${this.call}`];
    if (!xml) {
      this.cancelCall();
      return;
    }
    this.dialogue = readConversation(xml).lines;
    this.dialogueIndex = 0;
    this.callAnswered = true;
    audio.stopIntercom();
    audio.stopEffects();
    audio.sfx("compuertas_abrir", 0.5);
    this.showDialogue();
    this.publish();
  }
  private showDialogue() {
    const line = this.dialogue[this.dialogueIndex];
    if (!line) {
      this.closeDialogue();
      return;
    }
    emit("overlay", {
      type: "dialogue",
      speaker: line.speaker,
      portrait: line.portrait,
      text: line.text,
      page: this.dialogueIndex + 1,
      total: this.dialogue.length,
    });
    if (line.voice) audio.sfx(line.voice, 0.8, "intercom", 0);
  }
  private advanceDialogue() {
    this.dialogueIndex++;
    if (this.dialogueIndex >= this.dialogue.length) this.closeDialogue();
    else this.showDialogue();
  }
  private closeDialogue() {
    this.dialogue = [];
    this.press.clear();
    this.held.delete("Space");
    this.pointer = undefined;
    this.joystick = undefined;
    audio.stopEffects();
    audio.sfx("compuertas_cerrar", 0.4);
    this.invulnerable = Math.max(this.invulnerable, 0.6);
    emit("overlay", null);
    this.publish();
  }
  private togglePause() {
    if (!this.isAction() || this.dialogue.length) return;
    this.paused = !this.paused;
    this.held.clear();
    this.pointer = undefined;
    this.joystick = undefined;
    if (this.paused) {
      audio.pause();
      emit("overlay", { type: "pause" });
    } else {
      audio.resume();
      this.invulnerable = Math.max(this.invulnerable, 0.5);
      emit("overlay", null);
    }
    this.publish();
  }
  private pollGamepad() {
    const pad = navigator.getGamepads?.()[0];
    if (!pad) return;
    const binds: Record<number, string> = {
      1: "KeyX",
      2: "Space",
      3: "KeyC",
      9: "KeyP",
    };
    for (const [n, code] of Object.entries(binds)) {
      const pressed = pad.buttons[Number(n)]?.pressed ?? false;
      if (pressed && !this.padButtons[Number(n)]) this.press.add(code);
      this.padButtons[Number(n)] = pressed;
    }
  }
  private explosion(x: number, y: number, kind: string, scale: number) {
    let frames: string[];
    if (kind === "hero") frames = keys("tirititran", "tirititranexp_", 0, 7);
    else if (kind === "exp_torre") frames = ["explosiones/exp_torre"];
    else {
      const prefixes: Record<string, [number, string]> = {
        expgrande: [8, "_"],
        exp_cangrebot: [9, ""],
        lancha_exp: [10, ""],
        exp_purpito: [8, ""],
        exp_gaviota1: [6, "_"],
        exp_coche: [9, ""],
        exp_navepeq: [8, ""],
        exp_navemed: [8, ""],
      };
      const [n, sep] = prefixes[kind] ?? [8, ""];
      frames = keys("explosiones", kind + sep, 0, n - 1);
    }
    const sprite = this.sprite(x, y, frames[0], 28, scale);
    this.effects.push({
      sprite,
      frames,
      age: 0,
      life: frames.length / 19,
      scale,
    });
  }
  private updateEffects(dt: number) {
    for (const e of this.effects) {
      e.age += dt;
      if (e.age >= e.life) {
        e.sprite.destroy();
        continue;
      }
      e.sprite.setFrame(
        e.frames[Math.min(e.frames.length - 1, Math.floor(e.age * 19))],
      );
    }
    this.effects = this.effects.filter((e) => e.sprite.active);
  }
  snapshot() {
    return {
      mode: this.mode,
      debugMode: isDebugMode(),
      phase: this.phase,
      score: this.score,
      highScore: this.highScore,
      lastPhase: this.lastPhase,
      lives: this.lives,
      health: Math.max(0, this.health),
      heroState: this.heroFall
        ? "falling"
        : this.heroEntering
          ? "entering"
          : "alive",
      weapon: this.weapon,
      tripleRemaining: this.originalWeapon.tripleRemaining + 1,
      timedPower: this.originalPowers.active,
      powerWarning: this.originalPowers.elapsed > 320,
      ballCount: this.balls,
      power: this.power,
      uses: this.uses,
      charge: this.charge,
      combo: this.combo,
      bestCombo: this.bestCombo,
      progress:
        this.phase <= 3 &&
        this.mode !== "playing" &&
        this.mode !== "menu" &&
        this.mode !== "intro"
          ? 1
          : this.phase <= 3
            ? Math.min(
                1,
                this.originalCycle /
                  (this.phase === 1
                    ? PHASE1_END
                    : this.phase === 2
                      ? PHASE2_END
                      : PHASE3_END),
              )
            : this.distance / 7360,
      originalCycle: this.originalCycle,
      playHeight: this.playHeight,
      call: this.call,
      callAnswered: this.callAnswered,
      caller: this.call
        ? (() => {
            const caller = readConversation(
              this.content.scripts[`conversaciones/${this.call}`],
            );
            return {
              name: caller.name,
              portrait: caller.portrait.replace(
                /0$/,
                String(Math.floor(this.callAge / 6) % 4),
              ),
            };
          })()
        : null,
      paused: this.paused,
      dialogue: this.dialogue.length > 0,
      elapsed: this.elapsed,
      unlocked: this.unlocked,
      event: this.eventLabel,
      shield: this.shield,
      clones: this.clones,
      balls: this.balls,
      gods: this.gods.map((b) => ({
        god: b.god,
        name: GOD_CONFIGS[b.god].name,
        hp: Math.max(0, b.hp),
        maxHp: 130,
        x: b.root.x,
        y: b.root.y,
        frame: b.parts[0].frame.name,
      })),
      godParty:
        this.godEncounter?.gods.some((g) => g.party && !g.dead) ?? false,
      boss: this.boss
        ? {
            hp: Math.max(0, this.boss.hp),
            maxHp: this.boss.maxHp,
            name:
              this.phase === 3
                ? ["Baco", "Hércules", "Neptuno"][this.boss.god]
                : PHASES[this.phase - 1].boss,
            god: this.boss.god,
            x: this.boss.x,
            y: this.boss.y,
          }
        : null,
      player: {
        x: this.player?.x ?? 260,
        y: this.player?.y ?? 535,
        frame: this.player?.frame.name,
      },
      originalEnemies: this.developmentTest
        ? this.enemies
            .filter((e) => e.original)
            .map((e) => ({
              family: e.original!.family,
              born: e.original!.born,
              age: e.original!.motion.age,
              x: e.original!.motion.x,
              y: e.original!.motion.y,
              frame: e.sprite.frame.name,
              hp: e.hp,
            }))
        : undefined,
      enemyCount: this.enemies.length,
      bulletCount: this.bullets.filter((b) => b.active).length,
      kills: this.kills,
      hits: this.hits,
      accuracy: this.shotsFired ? this.shotsHit / this.shotsFired : 0,
      settings: this.settings,
    };
  }
  private publish() {
    emit("state", this.snapshot());
  }
}
