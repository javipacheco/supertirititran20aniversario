const asset = (path: string) =>
  `${import.meta.env.BASE_URL}assets/audio/${path}.ogg`;
export class AudioDirector {
  musicVolume = 0.45;
  effectsVolume = 0.55;
  muted = false;
  unlocked = false;
  private music?: HTMLAudioElement;
  private track = "";
  private last = new Map<string, number>();
  private pool = new Map<string, HTMLAudioElement[]>();
  private paused = false;
  private intercom?: HTMLAudioElement;
  private intercomChannel?: HTMLAudioElement;
  private cinematic = new Set<{
    element: HTMLAudioElement;
    gain: number;
    music: boolean;
  }>();
  /** Owned by an XML sequence: never shares pooled gameplay channels. */
  cue(name: string, folder: string, volume: number, loops: number) {
    const element = new Audio(asset(`${folder}/${name}`));
    const cue = { element, gain: volume, music: name === "musica" };
    let remaining = loops;
    element.loop = loops < 0;
    element.addEventListener("ended", () => {
      if (remaining > 0 && this.cinematic.has(cue)) {
        remaining--;
        element.currentTime = 0;
        this.play(element);
      }
    });
    this.cinematic.add(cue);
    const gain = (value: number) => {
      cue.gain = value;
      element.volume = this.muted
        ? 0
        : Math.min(
            1,
            Math.max(0, value) *
              (cue.music ? this.musicVolume : this.effectsVolume),
          );
    };
    gain(volume);
    if (this.unlocked && !this.paused) element.play().catch(() => {});
    return {
      gain,
      stop: () => {
        element.pause();
        element.removeAttribute("src");
        element.load();
        this.cinematic.delete(cue);
      },
    };
  }
  unlock() {
    this.unlocked = true;
    if (this.music && !this.paused) this.play(this.music);
    if (this.intercom && !this.paused) this.play(this.intercom);
  }
  private play(a: HTMLAudioElement, tryAutoplay = false) {
    if (this.paused || !(this.unlocked || tryAutoplay) || this.muted) return;
    a.play()
      .then(() => {
        if (a === this.music)
          document.dispatchEvent(new CustomEvent("game:musicplaying"));
      })
      .catch((error: DOMException) => {
        if (
          a === this.music &&
          error.name === "NotAllowedError" &&
          a.volume > 0
        )
          document.dispatchEvent(new CustomEvent("game:musicblocked"));
      });
  }
  sfx(name: string, volume = 0.5, folder = "sonidos", minimumGap = 90) {
    if (!this.unlocked || this.muted || this.paused) return;
    const path = `${folder}/${name}`,
      now = performance.now();
    if (now - (this.last.get(path) ?? -10000) < minimumGap) return;
    this.last.set(path, now);
    let pool = this.pool.get(path);
    if (!pool) {
      pool = [
        new Audio(asset(path)),
        new Audio(asset(path)),
        new Audio(asset(path)),
      ];
      this.pool.set(path, pool);
    }
    const a = pool.find((a) => a.paused || a.ended);
    if (!a) return;
    a.currentTime = 0;
    a.volume = Math.min(1, this.effectsVolume * volume);
    this.play(a);
  }
  song(name: string, folder = "sonidos", tryAutoplay = false) {
    const path = `${folder}/${name}`;
    if (path === this.track) {
      this.apply(tryAutoplay);
      return;
    }
    this.music?.pause();
    this.track = path;
    this.music = new Audio(asset(path));
    this.music.loop = true;
    this.music.volume = this.muted ? 0 : this.musicVolume;
    this.play(this.music, tryAutoplay);
  }
  ringIntercom() {
    this.stopIntercom();
    this.intercom = this.intercomChannel ??= new Audio(
      asset("sonidos/intercom"),
    );
    this.intercom.currentTime = 0;
    this.intercom.loop = true;
    this.intercom.volume = this.effectsVolume * 0.65;
    this.play(this.intercom);
  }
  stopIntercom() {
    this.intercom?.pause();
    this.intercom = undefined;
  }
  apply(tryAutoplay = false) {
    for (const cue of this.cinematic) {
      cue.element.volume = this.muted
        ? 0
        : Math.min(
            1,
            cue.gain * (cue.music ? this.musicVolume : this.effectsVolume),
          );
    }
    if (this.intercom) {
      this.intercom.volume = this.effectsVolume * 0.65;
      if (this.muted) this.intercom.pause();
      else if (!this.paused) this.play(this.intercom);
    }
    if (this.music) this.music.volume = this.muted ? 0 : this.musicVolume;
    for (const p of this.pool.values())
      for (const a of p) if (this.muted) a.pause();
    if (this.music && !this.muted && !this.paused)
      this.play(this.music, tryAutoplay);
  }
  pause() {
    this.paused = true;
    for (const cue of this.cinematic) cue.element.pause();
    this.intercom?.pause();
    this.music?.pause();
    for (const p of this.pool.values()) for (const a of p) a.pause();
  }
  resume() {
    this.paused = false;
    for (const cue of this.cinematic)
      if (!cue.element.ended) this.play(cue.element);
    if (this.intercom) this.play(this.intercom);
    if (this.music) this.play(this.music);
  }
  stopMusic() {
    this.music?.pause();
    if (this.music) this.music.currentTime = 0;
    this.music = undefined;
    this.track = "";
  }
  stopEffects() {
    this.stopIntercom();
    for (const p of this.pool.values()) for (const a of p) a.pause();
  }
}
export const audio = new AudioDirector();
