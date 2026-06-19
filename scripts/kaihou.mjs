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
import { buildAnswerRows } from "./apps/wizard/answer-summary.mjs";
import { registerSchoolAutoApply } from "./grants/school-apply.mjs";
import {
  registerOccupationAutoApply,
  registerOccupationAutoRevert,
} from "./grants/occupation-apply.mjs";
import { registerQuestionFeatEffects } from "./grants/question-effects.mjs";
import { registerStatusEffects } from "./setup/status-effects.mjs";
import { registerKaihouCharacterSheet } from "./sheets/kaihou-character-sheet.mjs";
import { registerNotesRelay } from "./notes-relay.mjs";

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

// Our bespoke character sheet template + the PF1e partials it embeds. PF1e
// preloads its own partials at init, but we register them again (idempotent) so
// our template never renders against an unregistered partial on load order drift.
const SHEET_TEMPLATES = [
  "modules/naruto-d20-kaihou/templates/actor/kaihou-character-sheet.hbs",
  "systems/pf1/templates/actors/parts/actor-summary.hbs",
  "systems/pf1/templates/actors/parts/actor-attributes.hbs",
  "systems/pf1/templates/actors/parts/actor-combat.hbs",
  "systems/pf1/templates/actors/parts/actor-inventory.hbs",
  "systems/pf1/templates/actors/parts/actor-features.hbs",
  "systems/pf1/templates/actors/parts/actor-skills-front.hbs",
  "systems/pf1/templates/actors/parts/actor-buffs.hbs",
  "systems/pf1/templates/actors/parts/actor-spellbook-front.hbs",
  "systems/pf1/templates/actors/parts/actor-settings.hbs",
  "systems/pf1/templates/internal/table_magic-items.hbs",
];

registerStatusEffects();

Hooks.once("init", async () => {
  console.log(`${MODULE_ID} | init`);
  if (!Handlebars.helpers.eq) {
    Handlebars.registerHelper("eq", (a, b) => a === b);
  }

  const loader = foundry?.applications?.handlebars?.loadTemplates ?? globalThis.loadTemplates;
  if (loader) {
    await loader([...WIZARD_PARTIALS, ...SHEET_TEMPLATES]);
    console.log(
      `${MODULE_ID} | preloaded ${WIZARD_PARTIALS.length} wizard + ${SHEET_TEMPLATES.length} sheet templates`,
    );
  } else {
    console.warn(`${MODULE_ID} | no loadTemplates helper found; partials may not resolve`);
  }

  game.settings.register(MODULE_ID, "kaihouSheetDefault", {
    name: "Kaihou.Settings.SheetDefault.Name",
    hint: "Kaihou.Settings.SheetDefault.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });
  registerKaihouCharacterSheet();
});

Hooks.once("ready", () => {
  console.log(`${MODULE_ID} | ready`);
  game[MODULE_ID] = game[MODULE_ID] || {};
  game[MODULE_ID].TwentyQuestionsWizard = TwentyQuestionsWizard;

  registerSchoolAutoApply();
  registerOccupationAutoApply();
  registerOccupationAutoRevert();
  registerQuestionFeatEffects();
  registerNotesRelay();
  console.log(`${MODULE_ID} | school and occupation auto-apply ready`);

  // § 5.2 — Move naruto-d20 Hero Statistics into the footer's meta rail, where
  // it sits beside the Level cell as the Action Points / Reputation / Wealth
  // ledger. Relocating (not rebuilding) keeps naruto-d20's rollable Action
  // Points and its own change handlers intact.
  // naruto-d20's registerSummaryStats hook is async — it awaits renderTemplate
  // before inserting #naruto-hero-statistics. Foundry's Hooks.callAll does NOT
  // await async callbacks, so any synchronous hook we register fires before
  // naruto-d20's await resolves. We defer with setTimeout(0) so the macrotask
  // runs after naruto-d20's microtasks (the renderTemplate promise chain) finish.
  Hooks.on("renderActorSheetPF", async (app, html, _data) => {
    if (!app.options?.classes?.includes("kaihou-databook")) return;
    const $html = html instanceof HTMLElement ? $(html) : html;
    const rail = $html.find("header.db-footer .db-meta-rail");
    if (!rail.length) return;
    await new Promise((r) => setTimeout(r, 0));
    const heroStats = $html.find("#naruto-hero-statistics");
    if (!heroStats.length) return;
    rail.append(heroStats);

    // Abbreviate the labels so they fit the thin rail. Setting the anchor's
    // text (Action Points) preserves the rollable <a>; Reputation/Wealth are
    // plain h5 text.
    const ABBR = {
      "flags.naruto-d20.actionPoints": "AP",
      "flags.naruto-d20.reputation": "REP",
      "flags.naruto-d20.wealth": "WLT",
    };
    (heroStats[0] ?? heroStats).querySelectorAll(".info-box").forEach((box) => {
      const abbr = ABBR[box.querySelector("input[name]")?.getAttribute("name")];
      if (!abbr) return;
      const labelEl = box.querySelector("h5 a") ?? box.querySelector("h5");
      if (labelEl) labelEl.textContent = abbr;
    });
  });
});

// § 5.1 — two-column Biography tab: the player's bio editor on the left,
// the 20 Questions answers + launch button on the right.
//
// Fires on the generic renderActorSheet hook so NPC sheets are also covered
// (PF1e's character and NPC sheets both descend from ActorSheet).
// Answers are read from module flags first; actors completed by older module
// versions may store answers in the bio HTML instead (the legacy fallback).
Hooks.on("renderActorSheet", (app, html, _data) => {
  if (!["character", "npc"].includes(app.actor?.type)) return;

  const bioTab = html.find('.tab[data-tab="biography"]');
  if (bioTab.length === 0 || bioTab.find(".tqw-bio-grid").length > 0) return;

  const actor = app.actor;

  const grantCount = Array.from(actor.items ?? []).filter(
    (i) => i.flags?.["naruto-d20-kaihou"]?.wizard
  ).length;

  const escape = (text) =>
    foundry.utils.escapeHTML
      ? foundry.utils.escapeHTML(text)
      : text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

  // Narrative-first: the question text + the player's written answer lead;
  // the mechanical pick is a muted footnote (GM ruling 2026-06-11).
  const rows = buildAnswerRows(actor);
  const answerRows = rows.map((row) => `
  <div class="tqw-bio-answer">
    <span class="tqw-bio-q">${row.qid.toUpperCase()}</span>
    <span class="tqw-bio-question">${escape(row.question)}</span>
    ${row.narrative ? `<p>${escape(row.narrative).replace(/\n/g, "<br>")}</p>` : ""}
    ${row.mechanical ? `<p class="tqw-bio-mech">${escape(row.mechanical)}</p>` : ""}
  </div>`).join("");

  // No borrowed `hint` class here: PF1e/core style .hint with
  // `flex: 0 0 100%` inside sheets, which makes it consume the whole flex
  // column and collapse the answers list to zero height.
  const summary = grantCount > 0
    ? `<p class="tqw-bio-summary">${grantCount} mechanic grant(s) applied by the wizard.</p>`
    : `<p class="tqw-bio-summary">Complete the 20 Questions wizard to apply character creation mechanics.</p>`;

  const right = $(`<aside class="tqw-bio-right db-bio-20q">
    <div class="tqw-bio-header-row">
      <h3 class="tqw-bio-header">20 Questions</h3>
      <button type="button" class="tqw-sheet-button" title="Open 20 Questions Wizard" aria-label="Open 20 Questions Wizard">
        <i class="fas fa-scroll"></i>
      </button>
    </div>
    ${summary}
    <div class="tqw-bio-answers">${answerRows || '<p class="tqw-bio-empty">No answers recorded yet.</p>'}</div>
  </aside>`);

  right.find(".tqw-sheet-button").on("click", () => {
    const wizard = new TwentyQuestionsWizard(actor);
    wizard.render(true);
  });

  const left = $('<div class="tqw-bio-left"></div>').append(bioTab.children());
  const grid = $('<div class="tqw-bio-grid"></div>').append(left, right);
  // Container wrapper enables the @container query that stacks the two
  // columns on narrow sheets (inline-size containment on our own element
  // only — never on PF1e's tab).
  bioTab.append($('<div class="tqw-bio-container"></div>').append(grid));
});
