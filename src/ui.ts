import {
  activateDebugMode,
  deactivateDebugMode,
  isDebugMode,
  DebugTapSequence,
  DEBUG_TAP_GAP,
} from "./game/debug";
import { audio } from "./game/audio";
import { PHASES, POWERS } from "./game/model";
import type { Command, Settings } from "./game/types";
const base = import.meta.env.BASE_URL;
const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const command = (type: string, value?: Command["value"]) =>
  document.dispatchEvent(
    new CustomEvent("game:command", { detail: { type, value } }),
  );
const escaped = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const pad = (n: number) => Math.floor(n).toString().padStart(6, "0");
let selectedPhase = 1;
let state: any,
  unlocked = 3,
  noticeTimer: ReturnType<typeof setTimeout>,
  lastMode = "",
  lastOverlay = "",
  resumeAfterDialog = false;
const touch = matchMedia("(pointer:coarse)").matches;
const debugBossOption =
  '<label id="debug-boss-option" class="debug-boss-option"><input id="debug-boss" type="checkbox"> Ir al jefe final</label>';
function fitDashboard() {
  if (touch) return;
  const panel = document.querySelector<HTMLElement>(".dashboard")!;
  const content = panel.querySelector<HTMLElement>(".dashboard-content")!;
  content.style.zoom = "1";
  content.style.height = "auto";
  if (innerWidth <= 660 || !panel.clientHeight) return;
  const style = getComputedStyle(panel);
  const available =
    panel.clientHeight -
    parseFloat(style.paddingTop) -
    parseFloat(style.paddingBottom);
  const height = content.getBoundingClientRect().height;
  const scale = Math.min(1, Math.max(0.1, (available - 4) / height));
  content.style.zoom = String(scale);
  if (document.fullscreenElement === panel.closest(".cabinet"))
    content.style.height = `${(available - 4) / scale}px`;
}
function fitMenu() {
  const overlay = $("overlay");
  const advice = overlay.querySelector<HTMLElement>(".mobile-play-advice");
  if (advice)
    advice.hidden =
      !touch ||
      !matchMedia("(orientation: landscape)").matches ||
      !!document.fullscreenElement ||
      matchMedia("(display-mode: fullscreen), (display-mode: standalone)")
        .matches ||
      !!(navigator as Navigator & { standalone?: boolean }).standalone;
  const card = overlay.querySelector<HTMLElement>(".menu-card, .dialogue-card");
  if (!overlay.classList.contains("menu-overlay") || !card) return;
  const adviceSpace = advice && !advice.hidden ? advice.offsetHeight + 16 : 0;
  overlay.style.setProperty("--menu-advice-space", `${adviceSpace}px`);
  const scale = Math.min(
    1,
    Math.max(0, overlay.clientHeight - 32 - adviceSpace) / card.offsetHeight,
  );
  overlay.style.setProperty("--menu-scale", String(scale));
}

export function setupUI() {
  if (touch) setupMobile();
  const menuResize = new ResizeObserver(fitMenu);
  menuResize.observe($("overlay").parentElement!);
  document.fonts.ready.then(() => {
    fitMenu();
    fitDashboard();
  });
  const panelResize = new ResizeObserver(fitDashboard);
  panelResize.observe(document.querySelector(".dashboard")!);
  const debugTaps = new DebugTapSequence();
  let debugReset: ReturnType<typeof setTimeout>;
  const debugStatus = $("credits-debug-status");
  const updateDebugUI = () => {
    if (!isDebugMode()) {
      clearTimeout(debugReset);
      debugTaps.reset();
      debugStatus.hidden = true;
      debugStatus.textContent = "";
      $("debug-mode-tag")?.remove();
      $("debug-boss-option")?.remove();
      fitMenu();
      return;
    }
    if (document.querySelector(".menu-selects") && !$("debug-boss-option")) {
      document
        .querySelector(".menu-selects")!
        .insertAdjacentHTML("beforeend", debugBossOption);
      fitMenu();
    }
    debugStatus.hidden = false;
    debugStatus.textContent = "Modo debug activado";
    const start = document.querySelector<HTMLElement>('[data-action="start"]');
    if (start && !$("debug-mode-tag"))
      $("overlay").insertAdjacentHTML(
        "beforebegin",
        '<button type="button" id="debug-mode-tag" class="debug-mode-tag" title="Desactivar modo debug">Modo debug activado</button>',
      );
  };
  document.addEventListener("game:debugchange", updateDebugUI);
  document.addEventListener("click", (event) => {
    if ((event.target as Element).closest?.("#debug-mode-tag"))
      deactivateDebugMode();
  });
  $("credits-debug-title").onclick = () => {
    if (isDebugMode()) {
      updateDebugUI();
      return;
    }
    clearTimeout(debugReset);
    const count = debugTaps.tap(performance.now());
    debugStatus.hidden = count < 3;
    if (count >= 3) debugStatus.textContent = `${count} de 7`;
    if (count === 7) {
      activateDebugMode();
      return;
    }
    debugReset = setTimeout(() => {
      debugTaps.reset();
      debugStatus.hidden = true;
      debugStatus.textContent = "";
    }, DEBUG_TAP_GAP + 1);
  };
  $("credits-dialog").addEventListener("close", () => {
    clearTimeout(debugReset);
    debugTaps.reset();
    if (!isDebugMode()) {
      debugStatus.hidden = true;
      debugStatus.textContent = "";
    }
  });
  updateDebugUI();

  let musicBlocked = false;
  const updateMusicPrompt = () => {
    hudValue(
      $("enable-menu-audio"),
      "hidden",
      !musicBlocked || (!!state && state.mode !== "menu"),
    );
  };
  document.addEventListener("game:musicblocked", () => {
    musicBlocked = true;
    updateMusicPrompt();
  });
  document.addEventListener("game:musicplaying", () => {
    musicBlocked = false;
    updateMusicPrompt();
  });
  $("enable-menu-audio").onclick = () => {
    if (audio.muted) command("mute");
    if (audio.musicVolume <= 0) {
      $<HTMLInputElement>("music-volume").value = "45";
      settingsChange();
    }
    audio.unlock();
    if (
      !document.body.classList.contains("mobile-portrait") &&
      !document.body.classList.contains("intro-open") &&
      !state?.paused
    )
      audio.resume();
  };
  const cabinet = document.querySelector<HTMLElement>(".cabinet")!;
  const fitFullscreen = () => {
    fitMenu();
    if (touch || document.fullscreenElement !== cabinet) {
      fitDashboard();
      return;
    }
    const height =
      Number(getComputedStyle(cabinet).getPropertyValue("--play-height")) ||
      480;
    const panel =
      innerWidth >= 850 && innerHeight >= 600
        ? Math.round(Math.min(340, Math.max(252, innerHeight * 0.28)))
        : 0;
    cabinet.style.setProperty("--fullscreen-panel-width", `${panel}px`);
    const width = Math.floor(
      Math.min(innerWidth - panel, ((innerHeight - 66) * 520) / height),
    );
    cabinet.style.setProperty("--fullscreen-game-width", `${width}px`);
    cabinet.style.setProperty(
      "--fullscreen-column-height",
      `${(width * height) / 520 + 66}px`,
    );
    cabinet.classList.toggle("fullscreen-with-panel", panel > 0);
    fitDashboard();
  };
  document.addEventListener("fullscreenchange", fitFullscreen);
  window.addEventListener("resize", fitFullscreen);
  document.addEventListener("game:viewport", fitFullscreen);
  $("powers").innerHTML = POWERS.map(
    (p, i) =>
      `<button class="power-option${i === 0 ? " selected" : ""}" data-power="${i}" aria-label="Seleccionar ${p.name}: ${p.hint}" aria-pressed="${i === 0}" title="${i + 1}: ${p.name} — ${p.hint}"><img src="${base}assets/images/miscelanea/${p.icon}_off.png" alt=""><span class="power-copy"><b>${p.name}</b><small class="power-meta">${["18 SEGUNDOS", "ONDA DE BOMBA", "18 SEGUNDOS", "25 BALONES"][i]}</small></span><kbd class="power-key">${i + 1}</kbd></button>`,
  ).join("");
  $("powers").addEventListener("click", (e) => {
    const button = (e.target as Element).closest<HTMLButtonElement>(
      "[data-power]",
    );
    if (button) {
      command("select", Number(button.dataset.power));
      $("game").focus({ preventScroll: true });
    }
  });
  $("intercom-button").onclick = () => command("intercom");
  $("touch-power").onclick = () => command("power");
  $("touch-select").onclick = () =>
    command("select", ((state?.power ?? 0) + 1) % 4);
  $("touch-call").onclick = () => command("intercom");
  $("pause-button").onclick = () => command("pause");
  $("sound-toggle").onclick = () => command("mute");
  $("fullscreen-button").onclick = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (
        document.fullscreenEnabled &&
        typeof cabinet.requestFullscreen === "function"
      )
        await cabinet.requestFullscreen();
      else if (touch) openDialog("mobile-screen-help");
      else
        $("announcement").textContent =
          "La pantalla completa no está disponible en este navegador.";
    } catch {
      if (touch && !$<HTMLDialogElement>("mobile-screen-help").open)
        openDialog("mobile-screen-help");
      $("announcement").textContent =
        "La pantalla completa no está disponible en este navegador.";
    }
  };
  $("settings-button").onclick = () => openDialog("settings-dialog");
  $("help-button").onclick = () => openDialog("help-dialog");
  $("credits-button").onclick = () => openDialog("credits-dialog");
  for (const dialog of document.querySelectorAll<HTMLDialogElement>("dialog")) {
    dialog.querySelector<HTMLButtonElement>("[data-close]")!.onclick = () =>
      dialog.close();
    dialog.addEventListener("close", () => {
      if (resumeAfterDialog && state?.paused) command("pause");
      resumeAfterDialog = false;
    });
  }
  $("music-volume").oninput = () => settingsChange();
  $("effects-volume").oninput = () => settingsChange();
  $("auto-fire").onchange = () => settingsChange();
  $("reduced-motion").onchange = () => settingsChange();
  document.addEventListener("game:phase-loading", (e) => {
    $("loader").hidden = false;
    $("loader").querySelector("p")!.textContent =
      `Cargando fase ${(e as CustomEvent<number>).detail}…`;
    $("overlay").hidden = true;
  });
  document.addEventListener("game:phase-loaded", () => {
    $("loader").hidden = true;
  });
  document.addEventListener("game:load", (e) => {
    const value = (e as CustomEvent<number>).detail;
    $("load-progress").style.width = `${value * 100}%`;
    $("load-percent").textContent = `${Math.round(value * 100)}%`;
  });
  document.addEventListener("game:error", (e) => {
    $("loader").hidden = false;
    $("loader").innerHTML =
      `<p>Ha fallado la carga de un recurso.</p><small>${escaped(String((e as CustomEvent).detail))}</small><button class="primary-button" onclick="location.reload()">REINTENTAR</button>`;
  });
  document.addEventListener("game:ready", (e) => {
    const d = (e as CustomEvent).detail;
    unlocked = d.unlocked;
    selectedPhase = d.lastPhase ?? 1;
    $("loader").hidden = true;
    applySettings(d.settings);
    document.dispatchEvent(
      new CustomEvent("game:mute", { detail: audio.muted }),
    );
    showMenu();
  });
  document.addEventListener("game:state", (e) => {
    state = (e as CustomEvent).detail;
    selectedPhase = state.lastPhase ?? selectedPhase;
    updateMusicPrompt();
    updateHUD();
  });
  document.addEventListener("game:overlay", (e) => {
    showOverlay((e as CustomEvent).detail);
  });
  document.addEventListener("game:notice", (e) => {
    const d = (e as CustomEvent).detail;
    if (state?.mode === "menu") return;
    clearTimeout(noticeTimer);
    $("notice").querySelector("strong")!.textContent = d.title;
    $("notice").querySelector("span")!.textContent = d.text;
    $("notice").hidden = false;
    noticeTimer = setTimeout(
      () => ($("notice").hidden = true),
      d.duration * 1000,
    );
  });
  document.addEventListener("game:mute", (e) => {
    const mute = (e as CustomEvent).detail;
    $("sound-toggle").textContent = mute ? "♪̸" : "♫";
    $("sound-toggle").setAttribute(
      "aria-label",
      mute ? "Activar sonido" : "Silenciar sonido",
    );
  });
  $("overlay").addEventListener("click", (e) => {
    const btn = (e.target as Element).closest<HTMLButtonElement>(
      "[data-action]",
    );
    if (!btn) return;
    if (btn.dataset.action === "start") {
      const phase = $<HTMLSelectElement>("start-phase").value;
      command("start", {
        phase,
        debugBoss:
          isDebugMode() && !!$<HTMLInputElement>("debug-boss")?.checked,
      });
      $("game").focus({ preventScroll: true });
    } else if (btn.dataset.action === "screen-help")
      openDialog("mobile-screen-help");
    else if (btn.dataset.action === "help") openDialog("help-dialog");
    else command(btn.dataset.action!);
  });
}
function openDialog(id: string) {
  resumeAfterDialog =
    !!state &&
    (state.mode === "playing" || state.mode === "boss") &&
    !state.paused &&
    !state.dialogue;
  if (resumeAfterDialog) command("pause");
  $<HTMLDialogElement>(id).showModal();
}
function applySettings(settings: Settings) {
  $<HTMLInputElement>("music-volume").value = String(settings.music * 100);
  $<HTMLInputElement>("effects-volume").value = String(settings.effects * 100);
  $<HTMLInputElement>("auto-fire").checked = settings.autoFire;
  $<HTMLInputElement>("reduced-motion").checked = settings.reduced;
}
function settingsChange() {
  command("settings", {
    music: Number($<HTMLInputElement>("music-volume").value) / 100,
    effects: Number($<HTMLInputElement>("effects-volume").value) / 100,
    autoFire: $<HTMLInputElement>("auto-fire").checked,
    reduced: $<HTMLInputElement>("reduced-motion").checked,
  });
}
function showMenu() {
  $("overlay").hidden = false;
  $("overlay").className = "overlay menu-overlay";
  lastOverlay = "menu";
  if (isDebugMode() && !$("debug-mode-tag"))
    $("overlay").insertAdjacentHTML(
      "beforebegin",
      '<button type="button" id="debug-mode-tag" class="debug-mode-tag" title="Desactivar modo debug">Modo debug activado</button>',
    );
  $("overlay").innerHTML =
    `<div class="menu-card"><img class="menu-hero" src="${base}assets/images/vs_fase1/tirititran_il.png" alt="SuperTirititran, el héroe de Cádiz"><h2>CÁDIZ TE<br><em>NECESITA.</em></h2><p class="subtitle">No todas las ciudades tienen un SuperHéroe.</p><button class="primary-button" data-action="start">¡AL LÍO, PISHA! <span>↗</span></button><div class="menu-selects"><label>Misión<select id="start-phase">${PHASES.map((p, i) => `<option value="${i + 1}">${String(i + 1).padStart(2, "0")} · ${["La playa", "La bahía", "El Carnaval"][i]}</option>`).join("")}</select></label>${isDebugMode() ? debugBossOption : ""}</div><button class="secondary-button" data-action="help">CÓMO SE SALVA CÁDIZ</button><p class="small-note">GRÁFICOS Y SONIDOS ORIGINALES · MUCHO ARTE</p></div>`;
  const phaseSelect = $<HTMLSelectElement>("start-phase");
  if (touch) {
    const advice = document.createElement("p");
    advice.className = "mobile-play-advice";
    advice.append("Para jugar se recomienda pantalla completa. ");
    const help = document.createElement("button");
    help.type = "button";
    help.dataset.action = "screen-help";
    help.textContent = "Cómo ampliar la pantalla";
    advice.append(help);
    $("overlay").prepend(advice);
  }
  phaseSelect.value = String(selectedPhase);
  phaseSelect.onchange = () => {
    selectedPhase = Number(phaseSelect.value);
    command("select-phase", selectedPhase);
  };
  $("notice").hidden = true;
  fitMenu();
}
function showOverlay(d: any) {
  const overlay = $("overlay");
  overlay.className = "overlay";
  overlay.hidden = !d;
  lastOverlay = d?.type ?? "";
  if (!d) {
    overlay.innerHTML = "";
    return;
  }
  $("notice").hidden = true;
  if (d.type === "menu") {
    showMenu();
    return;
  }
  if (d.type === "sequence") {
    overlay.classList.add("sequence-overlay");
    overlay.innerHTML = `<button class="sequence-controls" data-action="continue">${escaped(d.hint)} ↗</button>`;
    return;
  }
  if (touch && d.type !== "sequence") overlay.classList.add("menu-overlay");
  if (d.type === "dialogue") {
    overlay.innerHTML = `<div class="dialogue-card"><div class="dialogue-heading"><img src="${base}assets/images/intercom/${d.portrait}.png" alt="${escaped(d.speaker)}"><div><small>CONEXIÓN INTERCOM</small><b>${escaped(d.speaker)}</b></div></div><p>${escaped(d.text)}</p><div class="dialogue-bottom"><span>${d.page} / ${d.total}</span><button data-action="continue">CONTINUAR <kbd>ESPACIO</kbd> →</button></div></div>`;
    $("announcement").textContent = `${d.speaker}: ${d.text}`;
    if (touch) fitMenu();
    return;
  }
  if (d.type === "pause") {
    overlay.innerHTML = `<div class="menu-card"><span class="eyebrow">UN RESPIRO, PISHA</span><h2>LA CIUDAD<br><em>PUEDE ESPERAR.</em></h2><p class="subtitle">La partida está en pausa.</p><button class="primary-button" data-action="pause">SEGUIR VOLANDO ↗</button><div><button class="secondary-button" data-action="menu">VOLVER AL MENÚ</button></div></div>`;
    if (touch) fitMenu();
    return;
  }
  if (d.type === "gameover") {
    overlay.innerHTML = `<div class="menu-card"><span class="eyebrow">MISIÓN FRACASADA</span><h2>HOY NO,<br><em>BIZCONE.</em></h2><p class="subtitle">Un gaditano nunca se rinde.<br>Vuelve y dale la del veri.</p><strong class="result-score">${pad(d.score)}</strong><p class="result-stats">MISIÓN ${d.phase} · ${d.kills} ENEMIGOS DERROTADOS</p><button class="primary-button" data-action="retry">OTRA VEZ, PISHA ↗</button><div><button class="secondary-button" data-action="menu">VOLVER AL MENÚ</button></div></div>`;
    if (touch) fitMenu();
    return;
  }
  if (d.type === "victory") {
    overlay.innerHTML = `<div class="menu-card"><span class="eyebrow">MISIÓN ${d.phase} COMPLETADA</span><h2>¡QUÉ ARTE<br><em>TIENES!</em></h2><p class="subtitle">${d.phase === 1 ? "La playa vuelve a ser de los gaditanos." : "El puente vuelve a estar libre."}<br>Pero Bizcone todavía no ha terminado.</p><strong class="result-score">${pad(d.score)}</strong><p class="result-stats">MEJOR RACHA · ${d.combo}<br>CLAVE DE SIGUIENTE FASE · ${d.phase === 1 ? "ALIKINDOI" : "WACHISNAI"}</p><button class="primary-button" data-action="next">SIGUIENTE MISIÓN ↗</button><div><button class="secondary-button" data-action="menu">VOLVER AL MENÚ</button></div></div>`;
    if (touch) fitMenu();
    return;
  }
  if (d.type === "complete") {
    overlay.innerHTML = `<div class="menu-card"><img class="menu-hero" src="${base}assets/images/vs_fase1/tirititran_il.png" alt="SuperTirititran"><span class="eyebrow">CÁDIZ ESTÁ A SALVO</span><h2>ERES UNA<br><em>LEYENDA.</em></h2><p class="subtitle">Tres misiones. Bizcone derrotado.<br>Los gaditanos te deben una.</p><strong class="result-score">${pad(d.score)}</strong><p class="result-stats">${d.kills} ENEMIGOS · RACHA ${d.combo}<br>TIEMPO ${Math.floor(d.time / 60)}:${Math.floor(
      d.time % 60,
    )
      .toString()
      .padStart(
        2,
        "0",
      )}</p><button class="primary-button" data-action="menu">VOLVER A LA RECREATIVA ↗</button></div>`;
    if (touch) fitMenu();
  }
}
// Compare against the live node so replacing menus cannot leave stale cached values.
function hudValue<T, K extends keyof T>(node: T, key: K, value: T[K]) {
  if (node[key] !== value) node[key] = value;
}
function hudAttribute(node: Element, key: string, value: string) {
  if (node.getAttribute(key) !== value) node.setAttribute(key, value);
}
function updateHUD() {
  if (!state) return;
  const active = state.mode !== "menu",
    p = PHASES[state.phase - 1];
  unlocked = state.unlocked;
  hudValue($("score"), "textContent", pad(state.score));
  hudValue(
    $("record"),
    "textContent",
    pad(Math.max(state.highScore, state.score)),
  );
  hudValue(
    $("lives"),
    "textContent",
    state.lives <= 5
      ? "♥ ".repeat(Math.max(0, state.lives)).trim()
      : `♥ × ${state.lives}`,
  );
  hudValue($("health").style, "width", `${(state.health / 3) * 100}%`);
  hudValue(
    $("touch-power"),
    "textContent",
    (touch ? "LANZAR · " : "") + POWERS[state.power].name.toUpperCase(),
  );
  hudValue(
    $<HTMLButtonElement>("touch-power"),
    "disabled",
    state.uses <= 0 ||
      state.timedPower !== null ||
      state.paused ||
      !["playing", "boss"].includes(state.mode) ||
      !!state.dialogue,
  );
  hudValue($<HTMLButtonElement>("touch-call"), "disabled", !state.call);
  hudValue($("power-uses"), "textContent", `${state.uses} USOS`);
  hudValue($("charge").style, "width", `${state.charge * 100}%`);
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    ".power-option",
  )) {
    const i = Number(button.dataset.power);
    button.classList.toggle("selected", i === state.power);
    hudAttribute(button, "aria-pressed", String(i === state.power));
    hudValue(
      button.querySelector(".power-meta")!,
      "textContent",
      i === 0 && state.shield > 0
        ? `${Math.ceil(state.shield)} s RESTANTES`
        : i === 2 && state.clones > 0
          ? `${Math.ceil(state.clones)} s RESTANTES`
          : i === 3 && state.balls > 0
            ? `${state.ballCount} BALONES`
            : ["18 SEGUNDOS", "ONDA DE BOMBA", "18 SEGUNDOS", "25 BALONES"][i],
    );
    hudValue(
      button,
      "disabled",
      !touch && (state.timedPower !== null || state.uses <= 0),
    );
  }
  const callAvailable = active && !!state.call;
  const ringing = callAvailable && !state.callAnswered;
  $("intercom-button").classList.toggle("ringing", ringing);
  hudValue(
    $("call-status"),
    "textContent",
    callAvailable
      ? `${state.caller?.name ?? "Intercom"} · ${state.callAnswered ? "Volver a abrir" : "Pulsa Espacio"}`
      : "Paco está al liqui",
  );
  const callPortrait = $<HTMLImageElement>("call-portrait");
  const callerName = state.caller?.name ?? "Paco Alba";
  const portrait = `${base}assets/images/intercom/${state.caller?.portrait ?? "paco0"}.png`;
  if (callPortrait.getAttribute("src") !== portrait)
    callPortrait.src = portrait;
  hudValue(callPortrait, "alt", callerName);
  hudValue($("call-indicator"), "textContent", ringing ? "◉" : "⌁");
  hudValue($<HTMLButtonElement>("intercom-button"), "disabled", !callAvailable);
  hudValue(
    $("progress-percent"),
    "textContent",
    `${Math.round(state.progress * 100)}%`,
  );
  hudValue($("route-fill").style, "width", `${state.progress * 100}%`);
  hudValue($("boss-bar"), "hidden", !state.boss || !!lastOverlay);
  $("boss-bar").classList.toggle("boss-bar-compact", state.phase <= 2);
  const threeGods = state.phase === 3 && state.gods?.length === 3;
  $("boss-bar").classList.toggle("boss-bar-three", threeGods);
  hudValue($("gods-bars"), "hidden", !threeGods);
  if (threeGods)
    hudValue(
      $("gods-bars"),
      "innerHTML",
      [...state.gods]
        .reverse()
        .map(
          (g: any) =>
            `<div class="god-health${g.hp <= 0 ? " defeated" : ""}"><span>${escaped(g.name)}</span><div class="boss-track"><span style="width:${(g.hp / g.maxHp) * 100}%"></span></div></div>`,
        )
        .join(""),
    );
  if (state.boss) {
    hudValue($("boss-name"), "textContent", state.boss.name);
    hudValue(
      $("boss-health").style,
      "width",
      `${(state.boss.hp / state.boss.maxHp) * 100}%`,
    );
  }
  hudValue(
    $("elapsed"),
    "textContent",
    `${Math.floor(state.elapsed / 60)
      .toString()
      .padStart(2, "0")}:${Math.floor(state.elapsed % 60)
      .toString()
      .padStart(2, "0")}`,
  );
  let footerStatus = state.paused
    ? "PAUSA"
    : state.dialogue
      ? "EN CONVERSACIÓN"
      : state.mode === "intro"
        ? "PRESENTACIÓN DE LA MISIÓN"
        : state.mode === "boss"
          ? "DUELO FINAL"
          : state.mode === "playing"
            ? state.event || "MISIÓN EN CURSO"
            : "LISTO PARA DAR CAÑA";
  if (active && !state.paused && !state.dialogue && state.weapon === 3)
    footerStatus += ` · TRIPLE: ${state.tripleRemaining} RÁFAGAS`;
  hudValue($("footer-status"), "textContent", footerStatus);
  hudValue(
    $("touch-controls"),
    "hidden",
    !touch || !["playing", "boss"].includes(state.mode) || !!lastOverlay,
  );
  if (lastMode !== `${state.mode}:${state.phase}`) {
    lastMode = `${state.mode}:${state.phase}`;
    hudValue(
      $("mission-tag"),
      "textContent",
      active ? p.tag.toUpperCase() : "EL HÉROE LOCAL",
    );
    hudValue(
      $("mission-title"),
      "innerHTML",
      active ? escaped(p.name) : "No todas las ciudades tienen un SuperHéroe",
    );
    $("mission-title").classList.toggle("mission-slogan", !active);
    hudValue(
      $("mission-place"),
      "innerHTML",
      active
        ? escaped(p.place)
        : "Tres misiones. Un superhéroe.<br>Y un italiano con malas ideas.",
    );
    fitDashboard();
    hudValue(
      $("screen-label"),
      "textContent",
      active
        ? `MISIÓN ${String(state.phase).padStart(2, "0")} / ${["LA PLAYA", "LA BAHÍA", "EL CARNAVAL"][state.phase - 1]}`
        : "CÁDIZ, ANDALUCÍA",
    );
    document
      .querySelectorAll<HTMLElement>(".chapter")
      .forEach((ch) =>
        ch.classList.toggle("active", Number(ch.dataset.phase) === state.phase),
      );
  }
}

// Reuse the desktop HUD nodes so both layouts always show the same live state.
function setupMobile() {
  document.body.classList.add("mobile-game");
  const screenHelp = document.createElement("dialog");
  screenHelp.id = "mobile-screen-help";
  screenHelp.setAttribute("aria-labelledby", "mobile-screen-title");
  screenHelp.innerHTML =
    '<div class="dialog-heading"><h2 id="mobile-screen-title">Más espacio para jugar</h2><button data-close aria-label="Cerrar consejo de pantalla">×</button></div><p>Pon el móvil en horizontal. Para aprovechar la pantalla, pulsa ⛶ en la barra del juego si tu navegador permite pantalla completa.</p><p><strong>En Safari del iPhone:</strong> abre el menú de página junto a la dirección, toca Más (…) y elige «Ocultar barra de herramientas». La ubicación puede variar según la versión de Safari.</p><p>Si usas otro navegador y las barras siguen visibles, busca su opción para ocultarlas.</p>';
  document.body.append(screenHelp);
  // iOS may select button labels or offer image actions on a long press.
  // Keep the guard on controls: dialogue text, help and form fields remain normal.
  for (const type of ["contextmenu", "selectstart", "dragstart"]) {
    document.addEventListener(
      type,
      (event) => {
        const node = event.target;
        const target =
          node instanceof Element ? node : (node as Node)?.parentElement;
        if (target?.closest(".cabinet button, #mobile-joystick"))
          event.preventDefault();
      },
      true,
    );
  }
  // Secondary fingers do not reliably produce compatibility clicks on mobile.
  // Activate each button on its own touch release instead.
  const touchButtons = new Map<number, HTMLButtonElement>();
  document.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "touch") return;
    const button = (e.target as Element).closest<HTMLButtonElement>("button");
    if (button && !button.disabled) touchButtons.set(e.pointerId, button);
  });
  document.addEventListener("pointercancel", (e) =>
    touchButtons.delete(e.pointerId),
  );
  document.addEventListener("pointerup", (e) => {
    const button = touchButtons.get(e.pointerId);
    touchButtons.delete(e.pointerId);
    if (!button || button.disabled) return;
    const r = button.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      return;
    e.preventDefault();
    button.click();
  });
  document.addEventListener(
    "click",
    (e) => {
      if (
        (e as PointerEvent).pointerType === "touch" &&
        (e.target as Element).closest("button")
      ) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    true,
  );
  const cabinet = document.querySelector<HTMLElement>(".cabinet")!;
  const left = document.createElement("aside");
  left.className = "mobile-left";
  left.innerHTML =
    '<div class="mobile-info"><b class="mobile-name">SUPERTIRITITRAN</b></div><div class="joystick-zone"><div id="mobile-joystick" role="group" aria-label="Joystick para mover al héroe"><span></span></div></div>';
  cabinet.prepend(left);
  for (const selector of [
    ".mission-heading",
    ".scorebox",
    ".vitals",
    ".mission-progress",
  ])
    left
      .querySelector(".mobile-info")!
      .append(document.querySelector(selector)!);
  const musicButton = document.createElement("button");
  musicButton.id = "mobile-music";
  musicButton.className = "icon-button";
  musicButton.textContent = "♫";
  musicButton.setAttribute("aria-label", "Desactivar música");
  let previousMusic = 0.45;
  musicButton.onclick = () => {
    const volume = Number($<HTMLInputElement>("music-volume").value);
    if (volume > 0) previousMusic = volume / 100;
    $<HTMLInputElement>("music-volume").value = String(
      volume > 0 ? 0 : previousMusic * 100,
    );
    settingsChange();
    audio.unlock();
  };
  document.querySelector(".screen-bar > div")!.prepend(musicButton);
  document.addEventListener("game:state", () => {
    const enabled = audio.musicVolume > 0;
    hudValue(musicButton, "textContent", enabled ? "♫" : "♪̸");
    hudAttribute(
      musicButton,
      "aria-label",
      enabled ? "Desactivar música" : "Activar música",
    );
    hudAttribute(musicButton, "aria-pressed", String(enabled));
  });
  const right = document.querySelector(".dashboard-content")!;
  right.insertBefore($("touch-power"), $("intercom-button"));
  const rotation = document.createElement("div");
  rotation.className = "rotate-prompt";
  rotation.setAttribute("role", "status");
  rotation.innerHTML =
    '<div class="rotate-phone" aria-hidden="true">↻</div><h2>Gira el móvil</h2><p>Ponlo en horizontal para jugar.</p>';
  document.body.append(rotation);
  const stick = $("mobile-joystick");
  let pointer: number | null = null;
  const reset = () => {
    pointer = null;
    stick.style.setProperty("--stick-x", "0px");
    stick.style.setProperty("--stick-y", "0px");
    document.dispatchEvent(
      new CustomEvent("game:stick", { detail: { x: 0, y: 0 } }),
    );
  };
  const move = (e: PointerEvent) => {
    const r = stick.getBoundingClientRect();
    const radius = r.width * 0.32;
    let x = (e.clientX - r.left - r.width / 2) / radius;
    let y = (e.clientY - r.top - r.height / 2) / radius;
    const length = Math.hypot(x, y);
    if (length > 1) {
      x /= length;
      y /= length;
    }
    if (length < 0.12) x = y = 0;
    stick.style.setProperty("--stick-x", `${x * radius}px`);
    stick.style.setProperty("--stick-y", `${y * radius}px`);
    document.dispatchEvent(new CustomEvent("game:stick", { detail: { x, y } }));
  };
  stick.onpointerdown = (e) => {
    if (pointer !== null) return;
    pointer = e.pointerId;
    stick.setPointerCapture(pointer);
    e.preventDefault();
    move(e);
  };
  stick.onpointermove = (e) => {
    if (e.pointerId === pointer) move(e);
  };
  stick.onpointerup =
    stick.onpointercancel =
    stick.onlostpointercapture =
      (e) => {
        if (e.pointerId === pointer) reset();
      };
  let lastPortrait: boolean | undefined;
  let viewportFrame = 0;
  const fitMobile = () => {
    const viewport = window.visualViewport;
    const width = viewport?.width ?? innerWidth;
    const height = viewport?.height ?? innerHeight;
    const style = document.body.style;
    style.setProperty("--mobile-width", `${width}px`);
    style.setProperty("--mobile-height", `${height}px`);
    style.setProperty("--mobile-top", `${viewport?.offsetTop ?? 0}px`);
    style.setProperty("--mobile-left", `${viewport?.offsetLeft ?? 0}px`);
    const portrait = height > width;
    if (portrait !== lastPortrait) {
      lastPortrait = portrait;
      document.body.classList.toggle("mobile-portrait", portrait);
      rotation.hidden = !portrait;
      cabinet.inert = portrait;
      reset();
      document.dispatchEvent(
        new CustomEvent("game:orientation", { detail: portrait }),
      );
    }
    // Compact the HUD when browser chrome leaves a short landscape viewport.
    const info = left.querySelector<HTMLElement>(".mobile-info")!;
    const infoContent = left.querySelector<HTMLElement>(
      ".mobile-info-content",
    )!;
    infoContent.style.zoom = "1";
    const scale = Math.min(
      1,
      info.clientHeight / Math.max(1, infoContent.scrollHeight),
    );
    infoContent.style.zoom = String(scale);
    const rightContent = right as HTMLElement;
    const available = (right.parentElement as HTMLElement).clientHeight - 24;
    const rightScale = Math.min(1, Math.max(0.1, available / 320));
    rightContent.style.zoom = String(rightScale);
    rightContent.style.height = `${available / rightScale}px`;
  };
  const scheduleFit = () => {
    cancelAnimationFrame(viewportFrame);
    viewportFrame = requestAnimationFrame(fitMobile);
  };
  const info = left.querySelector(".mobile-info")!;
  const infoContent = document.createElement("div");
  infoContent.className = "mobile-info-content";
  infoContent.append(...Array.from(info.childNodes));
  info.append(infoContent);
  window.addEventListener("resize", scheduleFit);
  window.visualViewport?.addEventListener("resize", scheduleFit);
  window.visualViewport?.addEventListener("scroll", scheduleFit);
  document.addEventListener("fullscreenchange", scheduleFit);
  let fittedMode = "";
  document.addEventListener("game:state", (event) => {
    const mode = (event as CustomEvent).detail.mode;
    if (mode !== fittedMode) {
      fittedMode = mode;
      scheduleFit();
    }
  });
  document.fonts.ready.then(scheduleFit);
  window.addEventListener("blur", reset);
  document.addEventListener("visibilitychange", reset);
  document.addEventListener("game:overlay", reset);
  fitMobile();
}
