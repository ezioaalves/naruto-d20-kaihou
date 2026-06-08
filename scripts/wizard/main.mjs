/**
 * naruto-d20-kaihou module entry point.
 *
 * Phase 2: wizard migrated to ApplicationV2. The V1 class file is kept
 * runnable (and exposed on the game object for debug) until Phase K
 * deletes it.
 *
 * Architecture: docs/superpowers/specs/2026-06-08-wizard-restyle-v2-design.md
 */

import TwentyQuestionsWizard from "./twenty-questions-wizard.mjs";
import TwentyQuestionsWizardV2 from "./twenty-questions-wizard-v2.mjs";

const MODULE_ID = "naruto-d20-kaihou";

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | init`);
  if (!Handlebars.helpers.eq) {
    Handlebars.registerHelper("eq", (a, b) => a === b);
  }
});

Hooks.once("ready", () => {
  console.log(`${MODULE_ID} | ready (Phase 2 V2 wizard)`);
  game[MODULE_ID] = game[MODULE_ID] || {};
  game[MODULE_ID].TwentyQuestionsWizard = TwentyQuestionsWizard;     // legacy, debug only
  game[MODULE_ID].TwentyQuestionsWizardV2 = TwentyQuestionsWizardV2;
});

// Inject "20 Questions" button into PF1e actor sheet header (character only).
Hooks.on("renderActorSheet", (app, html, data) => {
  if (data.actor.type !== "character") return;
  if (!app.actor.items) return;

  let header = html.find(".sheet-header");
  if (header.length === 0) header = html.find(".window-header");
  if (header.length === 0) header = html.find("header");
  if (header.length === 0) return;

  const button = $(`<button type="button" class="tqw-sheet-button" title="Open 20 Questions Wizard">
    <i class="fas fa-scroll"></i> 20 Questions
  </button>`);

  button.on("click", () => {
    const wizard = new TwentyQuestionsWizardV2(app.actor);
    wizard.render(true);
  });

  header.append(button);
});
