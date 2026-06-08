/**
 * naruto-d20-kaihou — theme layer entry.
 *
 * Pure presentation layer absorbed from naruto-d20-zen-theme v0.1.0. Gates
 * every styled rule under `body.naruto-zen` and `.naruto-zen-target` so
 * toggling the world setting "Theme enabled" instantly reverts the UI.
 *
 * Reads DOM only — no PF1e or naruto-d20 API calls, no data writes.
 */

const MODULE_ID = "naruto-d20-kaihou";
const BODY_CLASS = "naruto-zen";
const TARGET_CLASS = "naruto-zen-target";
const SETTING_KEY = "themeEnabled";

const TARGET_SELECTORS = [
  ".window-app.sheet",
  ".window-app.dialog",
  ".window-app.compendium",
  ".window-app.filepicker",
  ".window-app.technique",
  ".window-app.compendium-browser",
];

// ─── Body class lifecycle ──────────────────────────────────────────────

function applyBodyClass(enabled) {
  if (!document.body) return;
  document.body.classList.toggle(BODY_CLASS, !!enabled);
}

function ensureBodyClassFromSetting() {
  let enabled = true;
  try {
    enabled = game.settings.get(MODULE_ID, SETTING_KEY);
  } catch (_e) {
    // setting not registered yet (shouldn't happen on ready, but defensive)
  }
  applyBodyClass(enabled);
}

// ─── App tagging ───────────────────────────────────────────────────────

function shouldTagApp(html) {
  const el = html instanceof HTMLElement ? html : html?.[0];
  if (!el?.classList) return false;
  return TARGET_SELECTORS.some((sel) => el.matches?.(sel));
}

function tagElement(html) {
  const el = html instanceof HTMLElement ? html : html?.[0];
  el?.classList?.add(TARGET_CLASS);
}

// ─── Coexistence check ────────────────────────────────────────────────

export function checkZenThemeCoexistence() {
  const zenTheme = game.modules?.get?.("naruto-d20-zen-theme");
  if (zenTheme?.active) {
    ui.notifications?.warn(
      "naruto-d20-zen-theme is active alongside naruto-d20-kaihou v2.0.0+. " +
      "Disable naruto-d20-zen-theme to avoid duplicate styling — " +
      "Kaihou now ships the same theme internally.",
      { permanent: true },
    );
  }
}

// ─── Settings registration ────────────────────────────────────────────

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, SETTING_KEY, {
    name: "Zen Scroll Theme — Enabled",
    hint: "Apply the sumi-e/parchment restyle to Foundry, PF1e sheets, and the naruto-d20 module. Disable to revert to vanilla Foundry chrome instantly (no reload needed).",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: applyBodyClass,
  });
});

// ─── Body class application: pre-ready and ready ──────────────────────

// Apply `body.naruto-zen` as early as the body element exists. `ready` is
// too late for the join screen — but we can't read settings until ready, so
// pre-ready we assume default-on (true).
function ensureBodyClassDefaultOn() {
  document.body?.classList.add(BODY_CLASS);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", ensureBodyClassDefaultOn, { once: true });
} else {
  ensureBodyClassDefaultOn();
}

Hooks.once("ready", () => {
  ensureBodyClassFromSetting();
  checkZenThemeCoexistence();
});

// ─── Render hooks (tag tracked surfaces) ──────────────────────────────

Hooks.on("renderApplication", (_app, html) => {
  if (shouldTagApp(html)) tagElement(html);
});

Hooks.on("renderApplicationV2", (_app, html) => {
  if (shouldTagApp(html)) tagElement(html);
});

Hooks.on("renderChatMessage", (_msg, html) => {
  tagElement(html);
});

Hooks.on("renderSidebar", (_app, html) => {
  tagElement(html);
});
