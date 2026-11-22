// Runtime developer mode is independent of the development-only test harness.
const STORAGE_KEY = "tirititran-debug";
let enabled = false;
try {
  enabled = localStorage.getItem(STORAGE_KEY) === "active";
  if (!enabled && sessionStorage.getItem(STORAGE_KEY) === "active") {
    enabled = true;
    localStorage.setItem(STORAGE_KEY, "active");
  }
  sessionStorage.removeItem(STORAGE_KEY);
} catch {}
export const isDebugMode = () => enabled;
export function activateDebugMode() {
  if (enabled) return;
  enabled = true;
  try {
    localStorage.setItem(STORAGE_KEY, "active");
  } catch {}
  document.dispatchEvent(new CustomEvent("game:debugchange", { detail: true }));
}
export function deactivateDebugMode() {
  enabled = false;
  try {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
  document.dispatchEvent(new CustomEvent("game:debugchange", { detail: false }));
}
export const DEBUG_TAP_GAP = 500;
export class DebugTapSequence {
  count = 0;
  private last = 0;
  private started = 0;
  reset() {
    this.count = 0;
    this.last = 0;
    this.started = 0;
  }
  tap(now: number) {
    if (
      this.count &&
      (now - this.last > DEBUG_TAP_GAP || now - this.started > 2500)
    )
      this.reset();
    if (!this.count) this.started = now;
    this.last = now;
    this.count = Math.min(7, this.count + 1);
    return this.count;
  }
}
