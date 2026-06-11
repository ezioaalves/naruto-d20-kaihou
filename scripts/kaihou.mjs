/**
 * naruto-d20-kaihou — module entry point (the only esmodule in module.json).
 *
 * Responsibilities, by hook:
 *  - init:  Handlebars helpers + wizard partial preload
 *  - ready: expose the wizard class, register school/occupation auto-appliers
 *  - renderActorSheet: inject the "20 Questions" header button
 *
 * All behavior lives in the concern modules: scripts/apps/wizard/ (the
 * ApplicationV2 wizard), scripts/grants/ (compendium-grant engine + school /
 * occupation auto-apply), scripts/theme/ (zen theme; registers its own hooks
 * on import).
 *
 * Architecture: docs/superpowers/specs/2026-06-11-kaihou-refactor-design.md (vault)
 */

import TwentyQuestionsWizard from "./apps/wizard/twenty-questions-wizard.mjs";
import { registerSchoolAutoApply } from "./grants/school-apply.mjs";
import {
  registerOccupationAutoApply,
  registerOccupationAutoRevert,
} from "./grants/occupation-apply.mjs";

// Theme layer — registers its own Hooks.once("init", ...) so must be loaded
// at module-import time, before any Hooks.once events fire. Pure side-effect
// import (no exports consumed here).
import "./theme/main.mjs";

const MODULE_ID = "naruto-d20-kaihou";

// Explicitly registered so {{> "path"}} resolves — Foundry's module.json
// `preloadTemplates` is unreliable for partials referenced by name in
// HandlebarsApplicationMixin PARTS templates.
const WIZARD_PARTIALS = [
  "modules/naruto-d20-kaihou/templates/apps/tqw-v2/header.hbs",
  "modules/naruto-d20-kaihou/templates/apps/tqw-v2/progress.hbs",
  "modules/naruto-d20-kaihou/templates/apps/tqw-v2/content.hbs",
  "modules/naruto-d20-kaihou/templates/apps/tqw-v2/footer.hbs",
  "modules/naruto-d20-kaihou/templates/apps/tqw-v2/pick-none.hbs",
  "modules/naruto-d20-kaihou/templates/apps/tqw-v2/pick-radio.hbs",
  "modules/naruto-d20-kaihou/templates/apps/tqw-v2/pick-select.hbs",
  "modules/naruto-d20-kaihou/templates/apps/tqw-v2/pick-nested.hbs",
  "modules/naruto-d20-kaihou/templates/apps/tqw-v2/pick-dragdrop.hbs",
  "modules/naruto-d20-kaihou/templates/apps/tqw-v2/pick-dragdrop-coupled.hbs",
  "modules/naruto-d20-kaihou/templates/apps/tqw-v2/pick-rolltable.hbs",
];

Hooks.once("init", async () => {
  console.log(`${MODULE_ID} | init`);
  if (!Handlebars.helpers.eq) {
    Handlebars.registerHelper("eq", (a, b) => a === b);
  }

  const loader = foundry?.applications?.handlebars?.loadTemplates ?? globalThis.loadTemplates;
  if (loader) {
    await loader(WIZARD_PARTIALS);
    console.log(`${MODULE_ID} | preloaded ${WIZARD_PARTIALS.length} wizard partials`);
  } else {
    console.warn(`${MODULE_ID} | no loadTemplates helper found; partials may not resolve`);
  }
});

Hooks.once("ready", () => {
  console.log(`${MODULE_ID} | ready`);
  game[MODULE_ID] = game[MODULE_ID] || {};
  game[MODULE_ID].TwentyQuestionsWizard = TwentyQuestionsWizard;

  registerSchoolAutoApply();
  registerOccupationAutoApply();
  registerOccupationAutoRevert();
  console.log(`${MODULE_ID} | school and occupation auto-apply ready`);
});

// Inject "20 Questions" button into PF1e actor sheet header (character and NPC).
// NOTE: moves to a Biography-tab section in Plan 2 (spec § 5.1).
Hooks.on("renderActorSheet", (app, html, data) => {
  if (!["character", "npc"].includes(data.actor.type)) return;
  if (!app.actor.items) return;

  let header = html.find(".sheet-header");
  if (header.length === 0) header = html.find(".window-header");
  if (header.length === 0) header = html.find("header");
  if (header.length === 0) return;

  const button = $(`<button type="button" class="tqw-sheet-button" title="Open 20 Questions Wizard">
    <i class="fas fa-scroll"></i> 20 Questions
  </button>`);

  button.on("click", () => {
    const wizard = new TwentyQuestionsWizard(app.actor);
    wizard.render(true);
  });

  header.append(button);
});
