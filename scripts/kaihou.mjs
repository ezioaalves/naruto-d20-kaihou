/**
 * naruto-d20-kaihou — module entry point (the only esmodule in module.json).
 *
 * Responsibilities, by hook:
 *  - init:  Handlebars helpers + wizard partial preload
 *  - ready: expose the wizard class, register school/occupation auto-appliers
 *  - renderActorSheetPFCharacter: inject the "20 Questions" Biography-tab section
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

// Inject "20 Questions" section into PF1e character sheet Biography tab.
Hooks.on("renderActorSheetPFCharacter", (app, html, _data) => {
  const bioTab = html.find('.tab[data-tab="biography"]');
  if (bioTab.length === 0) return;

  const actor = app.actor;
  const wizardItemCount = Array.from(actor.items ?? []).filter(
    (i) => i.flags?.["naruto-d20-kaihou"]?.wizard
  ).length;

  const summary = wizardItemCount > 0
    ? `<p class="tqw-bio-summary hint">${wizardItemCount} mechanic grant(s) applied by the 20 Questions wizard.</p>`
    : `<p class="tqw-bio-summary hint">Complete the 20 Questions wizard to apply character creation mechanics.</p>`;

  const section = $(`<div class="tqw-bio-section flexcol">
    <h3 class="tqw-bio-header">20 Questions</h3>
    ${summary}
    <button type="button" class="tqw-sheet-button">
      <i class="fas fa-scroll"></i> Open 20 Questions Wizard
    </button>
  </div>`);

  section.find(".tqw-sheet-button").on("click", () => {
    const wizard = new TwentyQuestionsWizard(actor);
    wizard.render(true);
  });

  bioTab.prepend(section);
});
