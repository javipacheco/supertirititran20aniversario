// Jugador::dibujar (elementos.cpp:995) and Elemento::fueraLimitesDePantalla.
// Positions are top-left; drawY precedes addY(15), as in SDL_BlitSurface.
export class HeroFall {
  frame = 0;
  drawY: number;
  finished = false;
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.drawY = y;
  }
  tick(cycle: number, height: number, playHeight: number) {
    this.drawY = this.y;
    if (cycle % 4 === 0) this.frame = 1;
    this.y += 15;
    this.finished = this.y > playHeight + height * 2 - 5;
  }
}
