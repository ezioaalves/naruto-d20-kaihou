/**
 * naruto-d20-kaihou module entry point.
 *
 * D2.3b adds the 20 Questions Sheet Wizard. The wizard is launched
 * from a button injected into the PF1e actor sheet header.
 *
 * Architecture: docs/superpowers/specs/2026-06-07-d2.3b-wizard-design.md
 */

import TwentyQuestionsWizard from "./twenty-questions-wizard.mjs";

const MODULE_ID = "naruto-d20-kaihou";

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | init`);
});

Hooks.once("ready", () => {
  console.log(`${MODULE_ID} | ready (D2.3b wizard bootstrap)`);
});

// Inject "20 Questions" button into PF1e actor sheet header (character only) (Task 22)
Hooks.on("renderActorSheet", (app, html, data) => {
  if (data.actor.type !== "character") return;
  if (!app.actor.items) return; // Not a full actor

  // Find the header — try multiple selectors for compatibility with PF1e sheets
  let header = html.find(".sheet-header");
  if (header.length === 0) header = html.find(".window-header");
  if (header.length === 0) header = html.find("header");
  if (header.length === 0) return; // Abort if no header found

  const button = $(`<button type="button" class="tqw-sheet-button" title="Open 20 Questions Wizard">
    <i class="fas fa-scroll"></i> 20 Questions
  </button>`);

  button.on("click", () => {
    const wizard = new TwentyQuestionsWizard(app.actor);
    wizard.render(true);
  });

  header.append(button);
});

// Expose wizard to game object for testing and direct access
game[MODULE_ID] = game[MODULE_ID] || {};
game[MODULE_ID].TwentyQuestionsWizard = TwentyQuestionsWizard;
