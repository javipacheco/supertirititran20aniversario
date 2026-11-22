import Phaser from "phaser";
import "./style.css";
import { setupUI } from "./ui";
import { audio } from "./game/audio";
import { Boot } from "./game/scene";
import type { Content } from "./game/types";
const intro = document.getElementById("anniversary-intro")!;
const page = document.querySelector<HTMLElement>(".page")!;
let entered = false;
try {
  entered = sessionStorage.getItem("tirititran-entered") === "true";
} catch {}
function revealGame() {
  entered = true;
  intro.hidden = true;
  page.inert = false;
  document.body.classList.remove("intro-open");
}
if (entered) revealGame();
else audio.pause();
document.getElementById("anniversary-enter")!.onclick = () => {
  try {
    sessionStorage.setItem("tirititran-entered", "true");
  } catch {}
  revealGame();
  audio.unlock();
  audio.resume();
  audio.song("opciones");
  document.getElementById("game")!.focus({ preventScroll: true });
};
// The tribute link does not unlock sound or dismiss the cover.
for (const event of ["click", "keydown"] as const)
  document.addEventListener(
    event,
    () => {
      if (entered) audio.unlock();
    },
    { capture: true },
  );
setupUI();
try {
  const saved = JSON.parse(localStorage.getItem("tirititran-save") ?? "{}");
  const volume = saved.settings?.music;
  if (typeof volume === "number" && volume >= 0 && volume <= 1)
    audio.musicVolume = volume;
} catch {}
// Request the main theme during loading, not after the game assets finish.
audio.song("opciones", "sonidos", entered);
async function boot() {
  const response = await fetch(
    `${import.meta.env.BASE_URL}generated/content.json`,
  );
  if (!response.ok)
    throw new Error("No se han podido cargar los datos del juego.");
  const content: Content = await response.json();
  new Phaser.Game({
    type: Phaser.AUTO,
    width: 520,
    height: 480,
    parent: "game",
    backgroundColor: "#052946",
    antialias: true,
    roundPixels: false,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { powerPreference: "high-performance" },
    input: { activePointers: 3, gamepad: true },
    scene: [new Boot(content)],
  });
}
boot().catch((error) =>
  document.dispatchEvent(
    new CustomEvent("game:error", { detail: error.message }),
  ),
);
