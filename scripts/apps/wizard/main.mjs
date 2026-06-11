/**
 * naruto-d20-kaihou wizard bootstrap.
 *
 * Phase K complete: the V1 Application wizard is deleted; the ApplicationV2
 * wizard (twenty-questions-wizard.mjs) is the only wizard.
 *
 * Architecture: docs/superpowers/specs/2026-06-08-wizard-restyle-v2-design.md
 * Refactor:     docs/superpowers/specs/2026-06-11-kaihou-refactor-design.md
 */

import TwentyQuestionsWizard from "./twenty-questions-wizard.mjs";

const MODULE_ID = "naruto-d20-kaihou";

Hooks.once("init", async () => {
  console.log(`${MODULE_ID} | init`);
  if (!Handlebars.helpers.eq) {
    Handlebars.registerHelper("eq", (a, b) => a === b);
  }

  // Explicitly register V2 wizard partials so {{> "path"}} resolves.
  // Foundry's module.json `preloadTemplates` is unreliable for partials
  // referenced by name in HandlebarsApplicationMixin PARTS templates.
  const partials = [
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
  const loader = foundry?.applications?.handlebars?.loadTemplates ?? globalThis.loadTemplates;
  if (loader) {
    await loader(partials);
    console.log(`${MODULE_ID} | preloaded ${partials.length} wizard partials`);
  } else {
    console.warn(`${MODULE_ID} | no loadTemplates helper found; partials may not resolve`);
  }
});

Hooks.once("ready", () => {
  console.log(`${MODULE_ID} | ready`);
  game[MODULE_ID] = game[MODULE_ID] || {};
  game[MODULE_ID].TwentyQuestionsWizard = TwentyQuestionsWizard;
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
