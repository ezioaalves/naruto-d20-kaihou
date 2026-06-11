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
import { QUESTION_DEFINITIONS } from "./apps/wizard/question-definitions.mjs";
import { registerSchoolAutoApply } from "./grants/school-apply.mjs";
import {
  registerOccupationAutoApply,
  registerOccupationAutoRevert,
} from "./grants/occupation-apply.mjs";
import { registerQuestionFeatEffects } from "./grants/question-effects.mjs";

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
  registerQuestionFeatEffects();
  console.log(`${MODULE_ID} | school and occupation auto-apply ready`);
});

// § 5.1 — two-column Biography tab: the player's bio editor on the left,
// the 20 Questions answers + launch button on the right. Answers read from
// module flags (never from the bio field).
Hooks.on("renderActorSheetPFCharacter", (app, html, _data) => {
  const bioTab = html.find('.tab[data-tab="biography"]');
  if (bioTab.length === 0 || bioTab.find(".tqw-bio-grid").length > 0) return;

  const actor = app.actor;
  const narratives = actor.flags?.["naruto-d20-kaihou"]?.wizard?.narratives ?? {};
  const grantCount = Array.from(actor.items ?? []).filter(
    (i) => i.flags?.["naruto-d20-kaihou"]?.wizard
  ).length;

  const escape = (text) =>
    foundry.utils.escapeHTML
      ? foundry.utils.escapeHTML(text)
      : text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

  const answerRows = QUESTION_DEFINITIONS.map((q) => {
    const text = narratives[q.id];
    if (!text || !text.trim()) return "";
    return `<div class="tqw-bio-answer">
      <span class="tqw-bio-q">${q.id.toUpperCase()} · ${q.sidebarLabel}</span>
      <p>${escape(text).replace(/\n/g, "<br>")}</p>
    </div>`;
  }).join("");

  const summary = grantCount > 0
    ? `<p class="tqw-bio-summary hint">${grantCount} mechanic grant(s) applied by the wizard.</p>`
    : `<p class="tqw-bio-summary hint">Complete the 20 Questions wizard to apply character creation mechanics.</p>`;

  const right = $(`<aside class="tqw-bio-right">
    <h3 class="tqw-bio-header">20 Questions</h3>
    ${summary}
    <div class="tqw-bio-answers">${answerRows || '<p class="hint tqw-bio-empty">No answers recorded yet.</p>'}</div>
    <button type="button" class="tqw-sheet-button">
      <i class="fas fa-scroll"></i> Open 20 Questions Wizard
    </button>
  </aside>`);

  right.find(".tqw-sheet-button").on("click", () => {
    const wizard = new TwentyQuestionsWizard(actor);
    wizard.render(true);
  });

  const left = $('<div class="tqw-bio-left"></div>').append(bioTab.children());
  bioTab.append($('<div class="tqw-bio-grid"></div>').append(left, right));
});
