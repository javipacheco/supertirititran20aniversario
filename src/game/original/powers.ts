// Original rules: defines.h, Jugador::dibujar/comprobarTeclas, Juego and DisparoJugador.
export const POWER_CYCLES = 400,
  POWER_WARNING = 320,
  TRIPLE_COUNTER = 70;
export type PowerId = 0 | 1 | 2 | 3;
export type PlayerShot = {
  x: number;
  y: number;
  dx: number;
  dy: number;
  frame: 0 | 1;
};
export class OriginalWeapon {
  level = 1;
  tripleRemaining = TRIPLE_COUNTER;
  private wait = 0;
  private burst = 0;
  release() {
    this.wait = 0;
    this.burst = 0;
  }
  reset() {
    this.level = 1;
    this.tripleRemaining = TRIPLE_COUNTER;
    this.release();
  }
  upgrade() {
    this.level = Math.min(3, this.level + 1);
  }
  tick(firing: boolean, automatic = false): PlayerShot[] | null {
    if (!firing) {
      this.release();
      return null;
    }
    // Automatic fire supplies the release that the original required after eight volleys.
    if (automatic && this.burst >= 8) {
      this.release();
      return null;
    }
    let shots: PlayerShot[] | null = null;
    if (this.wait <= 0 && this.burst < 8) {
      const level = this.level;
      if (level === 3 && --this.tripleRemaining < 0) {
        this.level = 2;
        this.tripleRemaining = TRIPLE_COUNTER;
      }
      shots =
        level === 1
          ? [{ x: 16, y: 10, dx: 0, dy: -25, frame: 0 }]
          : level === 2
            ? [{ x: 12, y: 20, dx: 0, dy: -35, frame: 1 }]
            : [
                { x: 16, y: 10, dx: 0, dy: -25, frame: 0 },
                { x: 8, y: 10, dx: -10, dy: -20, frame: 0 },
                { x: 22, y: 10, dx: 10, dy: -20, frame: 0 },
              ];
      this.burst++;
      this.wait = 4;
    }
    this.wait--;
    return shots;
  }
}
export class OriginalPowers {
  uses = 2;
  chargeSegments = 0;
  private chargeFlash = 0;
  active: 0 | 2 | null = null;
  elapsed = 0;
  cycle = 0;
  flare = -1;
  bombY: number | null = null;
  shotBlock = 0;
  shotsBlocked = false;
  activate(power: PowerId, height = 480) {
    if (this.uses <= 0 || this.active !== null) return false;
    this.uses--;
    if (power === 0 || power === 2) {
      this.active = power;
      this.elapsed = 0;
      this.flare = 0;
    }
    if (power === 1) this.bombY = height;
    if (power === 1 || power === 3) {
      this.shotBlock = 40;
      this.shotsBlocked = true;
    }
    return true;
  }
  collect() {
    if (this.chargeSegments < 4) this.chargeSegments++;
    if (this.chargeSegments >= 3) {
      this.uses++;
      return true;
    }
    return false;
  }
  clearActive() {
    this.active = null;
    this.elapsed = 0;
    this.flare = -1;
    this.bombY = null;
    this.shotBlock = 0;
    this.shotsBlocked = false;
  }
  tick(ballsActive: boolean, bombHeight = 314) {
    this.cycle++;
    let warning = false;
    if (this.active !== null) {
      if (this.elapsed < POWER_CYCLES) {
        this.elapsed++;
        warning = this.elapsed === POWER_WARNING;
      } else {
        this.active = null;
        this.elapsed = 0;
        this.flare = -1;
      }
      if (this.flare >= 0 && ++this.flare >= 19) this.flare = -1;
    }
    if (this.chargeSegments === 3) {
      this.chargeSegments = 4;
      this.chargeFlash = 0;
    } else if (this.chargeSegments > 3) {
      if (this.chargeFlash > 80) this.chargeSegments = 0;
      this.chargeFlash++;
    }
    this.shotsBlocked = this.shotBlock > 0;
    if (this.shotBlock > 0) this.shotBlock--;
    if (this.bombY !== null) {
      this.shotBlock = 40;
      this.shotsBlocked = true;
      this.bombY -= 90;
      if (this.bombY < -bombHeight * 2 - 5) this.bombY = null;
    }
    if (ballsActive) {
      this.shotBlock = 40;
      this.shotsBlocked = true;
    }
    return warning;
  }
  get remaining() {
    return this.active === null
      ? 0
      : Math.max(1, POWER_CYCLES - this.elapsed) * 0.045;
  }
  get visible() {
    return (
      this.elapsed <= POWER_WARNING || Math.floor(this.cycle / 3) % 2 === 0
    );
  }
}
export function createBall(random: () => number = Math.random, height = 480) {
  const x = Math.floor(random() * 400);
  const y = height + Math.floor(random() * 900);
  const speed = Math.floor(random() * 12) + 18;
  const vx = x < 100 ? speed : random() < 0.5 ? -speed : speed;
  return { x, y, vx, vy: -(Math.floor(random() * 10) + 25) };
}
