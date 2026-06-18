# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## v2.1.10 — 2026-06-17

### Fixed
- **Compendium icons were broken wherever the standalone `naruto-d20-zen-theme` module was removed.** 122 village / school / occupation items still pointed at `modules/naruto-d20-zen-theme/...` for their artwork — a module that was absorbed into Kaihou in v2.0.0 and is meant to be uninstalled. Every pack icon now resolves from Kaihou's own bundled `assets/theme/icons/` tree, so the module is fully self-contained.
- **20 Questions wizard — the dropdown picks closed the instant they opened.** The `<select>` picks (Q1 Village, the sub-pickers) were registered as ApplicationV2 *click* actions, and a native `<select>` emits a click when opened, so opening the dropdown re-rendered the wizard and snapped the popup shut. They are now driven by the `change` event only.
- **20 Questions wizard — the validation notice showed on open and read as a raw key.** The "answer this question" notice appeared the moment the wizard opened and printed an internal field name (e.g. `q1_village_uuid is required.`). It now appears only when you try to advance past an unanswered question, with a localized message (English + Portuguese).
- Disciplines radar: renamed the Chakra Control icon to match the sheet's reference (it was a 404 on that axis).

### Added
- **Databook character sheet status header** — editable HP / Chakra with a tap-reserves button, rest, level, and a solo nature seal; the Summary tab is the default landing.
- **Collaborative Identity notes** — a private per-user note plus a public, GM-relayed party note.
- **Compact Quick Actions strip** beneath the header band; discipline radar axis icons; header resource pips (HP / AC / Chakra); databook serif body font.

### Changed
- Reworked the header band into a databook registry card and collapsed the tab strip into an icon rail (labels reveal on active / hover).
- Bundled the vendored theme assets (village crests, nature icons, void mark); the header village now resolves from the q1Village wizard item; the KKG/void separator shows only for kekkei-genkai characters.

## v2.1.9 — 2026-06-13

### Added
- **Databook palette re-skin of the functional tabs (roadmap Phase 2, option B).** The PF1e tabs (Combat, Skills, Inventory, Features, Buffs) now read databook — cream surfaces, red section headers, warm item rows, red accents — by remapping PF1e's own `--pf1-*` custom properties (and the zen theme's `--zen-*` tokens) on `.kaihou-databook-form`. PF1e's DOM, layout and mechanics are untouched, so it stays resilient across PF1e upgrades. Section headers render in databook sans; skill names in databook ink with red hover.
- Roadmap (`docs/superpowers/roadmap-databook-overhaul.md`) and durable design mockups (`docs/design/mockups/`) for the wider databook overhaul.

## v2.1.8 — 2026-06-13

### Fixed
- **Identity-tab layout was dormant** (radars stacked full-width, alias/allegiance stacked, no scrollbar). The sheet's surface CSS was nested under the theme's `body.naruto-zen .naruto-zen-target` scope, which relies on a runtime render-hook tagging that doesn't reliably land on the bespoke sheet (and shouldn't gate it anyway). Rescoped all sheet-structure CSS under `.kaihou-databook-form` — a class hardcoded on the template's `<form>` — so the Identity dossier lays out (radars side-by-side, scrollable) whether or not the zen theme is enabled.

## v2.1.7 — 2026-06-13

### Changed
- **Reworked the databook character sheet from DOM injection to an own template.** v2.1.6 appended databook nodes onto PF1e's live sheet, which fought PF1e's `height:100%` / `overflow:hidden` tab layout (clipped content) and overlaid two clashing visual systems. The sheet now renders its own top-level template (`templates/actor/kaihou-character-sheet.hbs`) that embeds each PF1e partial verbatim, so all PF1e mechanics keep working, and adds a real **Identity** dossier tab (alias/allegiance, both radars, mission record, origin) plus the header band as a first-class region — no more clipping.
- Identity is now the default landing tab; the databook surface (band + Identity tab + red tab strip) is styled without repainting PF1e's functional tabs, which keep their native look.
- Preserved the naruto-d20 chakra-tab injection contract (anchors `nav.sheet-navigation.tabs[data-group='primary']` and `section.primary-body` kept) and defensively preload PF1e's embedded partials.

### Notes
- The Combat/Skills full radars and header kanji/resource pips from the v2.1.6 plan are deferred follow-ups; the Identity tab carries both radars for now.

## v2.1.6 — 2026-06-13

### Added
- Bespoke Kaihou Databook character sheet (`KaihouCharacterSheet`) — a campaign-specific actor sheet extending PF1e's base class.
- Databook header band with portrait, kanji name, alias 「」, village/rank/allegiance badges, and natures row (5 basic + void/KKG slot).
- Two auto-derived SVG radars: Ability Scores hexagon (red) and Disciplines pentagon (purple), appearing on the Identity tab (compact) and on the Combat/Skills tabs (full).
- Mission Record panel with per-rank (D/C/B/A/S) editable inputs and derived total.
- Origin & Path panel (village, school, occupation, bloodline, flaw from Kaihou-granted items).
- Editable alias and allegiance fields persisted via Foundry actor flags.
- Databook design-system foundation: `--db-*` CSS tokens and `.db-*` component primitives.
- World setting "Kaihou Databook sheet as default" (`kaihouSheetDefault`).
- Cross-module contract doc (`docs/cross-module-contract.md`) documenting the naruto-d20 ⇄ Kaihou injection seam.
- CSS scoping guard: all `.kaihou-databook` rules verified under `.naruto-zen-target` at build time.

### Notes
- naruto-d20's chakra tab keeps injecting on the new sheet — anchor selectors preserved.
- Manual Foundry verification required before tagging a release (per project policy).

## v2.1.5 — 2026-06-13

### Fixed
- Release packaging omitted `scripts/`, `styles/`, and `templates/`, so installing v2.1.4 failed manifest validation ("scripts/kaihou.mjs … does not exist"). The release zip now bundles them. The `lang`/`packs`/`assets`-only zip step dated from the content-only 1.x line; the theme code added in 2.0.0 never shipped because 2.0.0's release failed earlier in CI.
- Added a release-time guard that unzips `module.zip` and fails the build if any `esmodules`, `styles`, `languages`, `packs`, or `preloadTemplates` path referenced by `module.json` is missing from the archive.

## v2.1.4 — 2026-06-13

### Changed
- Theme SCSS now scopes every partial under `body.naruto-zen` / `.naruto-zen-target`, mirroring the original zen-theme architecture. This gives the chakra tab and all PF1e surfaces a stable, leak-free foundation.
- Chakra tab reset to the zen baseline (soft borders, auto-fit resource grid) while keeping Kaihou's six discipline colour accents.
- Added a CSS regression guard that fails the build if a `.tab.chakra` rule escapes the `body.naruto-zen .naruto-zen-target` scope.

### Fixed
- Occupation grant dialog opened pinned to the top-left at full width. It now centres itself through the ApplicationV2 position API, stays draggable, caps at 65vh with scroll, and has comfortable padding. Root cause: `DialogV2`'s render callback receives the dialog *instance*, not an element, so the earlier positioning code silently no-op'd.
- Native `<dialog>` windows pinned to the top-left because the user-agent inset anchors fired before Foundry's positioning (`dialog.application { inset: unset }`).
- Dark `<select>`/input contrast inside dialogs (e.g. Create Actor) against the parchment background.
- Compendium pack popout windows (v13 `.application.compendium-directory.sidebar-popout`) rendered on Foundry's default dark background instead of parchment.

## v2.1.3 — 2026-06-11

### Added
- **Q1–Q20 application contract (spec § 5)**: question feats are generated from vault YAML sources and carry their reputation / action-point / bonus-skill-rank payloads as PF1e dictionary flags; a new grants-side effects engine (`scripts/grants/question-effects.mjs`) applies them when a feat lands on an actor and reverts them on deletion — manual compendium drags work identically to the wizard.
- 12 new question feats: Parental Influence (Q17), Mentor's Lesson (Q13), and the ten `Namesake:` heritage outcomes (Q18), all vault-sourced with deterministic UUIDs.
- **Two-column Biography tab (spec § 5.1)**: player notes left, a zen-styled "20 Questions" panel right showing every answer narrative-first (question text + written answer, mechanical pick as a muted footnote) with an icon-only wizard launch button; stacks vertically on narrow sheets; shown on character and NPC sheets.
- Generator: `minor_benefits` lists, `bonus_skill_rank` kind, `questionFeat` marker flag.

### Changed
- Wizard narratives moved from the biography field into module flags; finishing strips the legacy `<!-- 20Q -->` bio region so the bio field belongs to the player.
- Re-answering a question replaces the previous grant instead of stacking (revert-on-change in the finish orchestrator).
- Q3 reads "Where did you study?"; Q4 uses Japanese nature names with ring icons on a single row; Q8 chips are text-only.
- Free-text answers are persisted before any item operation, and stale-id deletions no longer abort the finish flow.

### Fixed
- Q13 marker mismatch that prevented a finished Q13 from reloading into wizard state.
- First Next click on a fresh wizard not advancing (uninitialized `currentId`).
- Wizard window opening glued to the right edge: a `position: relative` on the ApplicationV2 root class overrode core window positioning.
- Biography panel rendering empty: the borrowed PF1e `.hint` class carries `flex-basis: 100%` in sheet context, collapsing the answers list to zero height.
- Flaky `pack:all` (`LEVEL_ITERATOR_NOT_OPEN`): compiled packs are wiped before packing; fvtt CLI upgraded 1.1.0 → 3.0.3.

## v2.0.0 — 2026-06-08

### Breaking
- `naruto-d20-zen-theme` is now bundled into this module. Disable the standalone `naruto-d20-zen-theme` module before upgrading. A persistent in-game warning fires if both are enabled.

### Added
- Sumi-e/parchment theme (absorbed from `naruto-d20-zen-theme` v0.1.0). Toggleable via the world setting "Zen Scroll Theme — Enabled" (default ON).
- SCSS build pipeline (`sass` devDependency, `npm run build:css`, `npm run watch:css`).
- Design tokens published on `:root` via `scss/_tokens.scss` (colors, typography scale, spacing scale, radius, elevation, border weights, motion easings/durations, nature palette, village palette).
- Reusable component primitive partials in `scss/components/` (`card`, `chip`, `drop-zone`, `pick-grid`, `stepper-sidebar`, `rolltable`). Empty in Phase 1; Phase 2 fills them with sumi-e styling and refactors the wizard to compose them.
- CI guard (`npm run test:css-fresh`) fails the test suite if compiled CSS in `styles/` is stale relative to `scss/` source.
- New i18n keys under `NARUTO_D20_KAIHOU.THEME.*`.

### Changed
- `assets/` reorganized: gameplay assets (`questions/`, `villages/`) stay at root; absorbed theme assets land under `assets/theme/`.
- `module.json` `styles[]` now lists `styles/theme/zen.css` first and `styles/apps/twenty-questions-wizard.css` second.
- `scripts/main.mjs` adds a single top-level `import "./theme/main.mjs"` so the theme registers its own hooks at module-load time.

### Removed
- Dark mode (`theme-dark` variant from zen-theme). Phase 1 ships light/parchment only; dark mode may return in a future phase.

### Unchanged
- Wizard mechanics (drag-drop, sub-pickers, validation, occupation/school auto-apply).
- All compendia (villages, questions, schools, occupations).
- Test suites: 100 JS (Vitest) + 53 Python (pytest), all still passing.

---

## [1.1.3] - 2026-06-07

### Added
- **20 Questions Sheet Wizard (D2.3b)** — First JavaScript feature for naruto-d20-kaihou. Foundry Application V1 wizard that walks players through all 20 character-creation questions (Q1–Q20), applies mechanical effects for 11 questions, and writes all 20 narratives to actor biography.
  - Mechanical applies: Q1 (village), Q3 (bonus feat), Q4 (affinity), Q7 (Loyalist/Outsider + class skill), Q8 (Adherent/Sceptic + subskill rank), Q9 (feat), Q10 (coupled flaw + bonus feat), Q13 (mentor technique + class skill), Q16 (restricted item), Q17 (0-rank skill +2 rank), Q18 (heritage Modifier with d10 roll).
  - Narrative capture: all 20 questions written as HTML-delimited region in actor biography, preserving player hand-edits outside the wizard region.
  - UI: one-pane-per-question with sidebar checklist, radio/select/nested/drag-drop/roll-table pick types, real-time validation (required, sub-required, coupled fields).
  - Architecture: pure-logic modules (wizard-state, biography-renderer, mechanic-applier, heritage-table) fully TDD'd with 98 tests; UI verified manually in Foundry.
  - Localization: en.json strings; pt-BR placeholder with English fallback.
- JavaScript infrastructure: Vitest test runner, ESLint JS rules, esmodules + styles declarations in module.json.

### Fixed
- (none for patch release)

### Known Limitations
- Q18 "Other Effects" are not auto-applied; players apply manually via PF1e sheet (as designed).
- Pre-wizard items lack marker flags; only wizard-added items are tracked for revert on re-open.

---

## v1.1.2 - 2026-06-07

### Added
- `packs/questions` compendium with **4 PF1e marker traits** covering 20-Questions
  Q7 / Q8 character-creation choices:
  - **Q7 Village Relationship** (2 items): Village Loyalist, Village Outsider.
  - **Q8 Shinobi Code Stance** (2 items): Code Adherent, Code Sceptic.
- New Python generator (`scripts/generate-questions.py`) mirroring
  `scripts/generate-villages.py` — vault YAML → PF1e trait JSON with
  deterministic UUIDs and the mandatory `_key: "!items!<_id>"` field.
- Generator supports `action_point`, `reputation`, and `doc_only` benefit kinds
  (all D2.2 D2.2 ish — same encoding pattern, no new behaviour).
- Pytest suite extended by `tests/test_generate_questions.py` (12 tests
  covering basic shape, `_key` invariant, reputation / action_point / doc_only
  encodings, unknown-kind fail-loud, img pass-through, deterministic UUID,
  write-to-file, and CLI parsing).

### Notes on scope
- **Q4 Elemental Affinity** is not shipped as a trait item — Foundry's chakra
  tab already has an affinity selector that handles this without a separate
  feat.
- The 4 marker traits **do not auto-apply** their mechanical grants (+1
  Reputation, +1 class skill, +2 Action Points, +1 skill point to
  Craft/Profession). The naruto-d20 module's `actionPoints` / `reputation`
  hero stats are not registered as PF1 buff targets, so the changes engine
  can't write to them. Mechanical application — including the player-choice
  picks (class skill for Outsider, Craft vs Profession subskill for Sceptic)
  — ships with the **D2.3b** sheet wizard, which will read the traits'
  `flags.dictionary.*` markers and update the actor directly.
- 5 element icons remain bundled under `assets/questions/elements/` for use
  by the D2.3b wizard's affinity-selection UI.

## v1.1.1 - 2026-06-07

### Fixed
- Compendia shipped empty in v1.0.0 and v1.1.0 because generated JSON
  files lacked the `_key: "!items!<_id>"` field that Foundry's LevelDB
  packer requires. Both generators now emit `_key`; tests pin the
  invariant. Verified end-to-end against Foundry v13 + PF1e v11.11.

### Changed
- Dropped the `classes-basic` compendium. The public `naruto-d20`
  module ≥ 1.0.10 ships a polished `classes` pack covering the same
  6 base classes; carrying a parallel pack only produced name
  collisions in-world. Dependency bumped to `naruto-d20 >= 1.0.10`.
- Each village trait now ships an icon
  (`modules/naruto-d20-kaihou/assets/villages/<icon>.svg`), with the
  mapping authored in the vault YAML and passed through the generator.

## v1.1.0 - 2026-06-07

### Added
- `packs/villages` compendium with 8 PF1e trait items (one per village):
  Hisuigakure, Houohgakure, Kanigakure, Kiringakure, Ryuugakure,
  Sasorigakure, Shishigakure, Tsurugakure. Each grants 2 class skills
  + 1 minor benefit and corresponds to the 20 Perguntas Q1 grant.
- New Python generator (`scripts/generate-villages.py`) for village
  YAML → Foundry trait JSON, with deterministic UUIDs (md5(slug)[:16]).
- Extended skill-key mapping (`data/skill-key-mapping.json`) with 11
  new village skill slugs.
- Pytest suite extended (`tests/test_generate_villages.py`,
  `tests/test_skill_mapping.py`): ~13 new tests covering generator
  field translation, minor-benefit encoding (hp/init/saves/AP/
  reputation/point_build), and skill-mapping exhaustiveness.

### Known limitations
- Hisuigakure's +2 Point Build is **doc-only** (PF1e has no point-buy
  runtime hook). Players apply manually at character creation.
- Custom-stat grants (Action Point, Reputation) use the
  `system.flags.dictionary` convention; verify in Foundry that these
  apply on drag-to-actor. If they don't apply, fall back to doc-only.

## v1.0.0 - 2026-06-06

### Added
- Initial release of Naruto-D20-Kaihou content module.
- `packs/classes-basic` compendium with 6 base classes generated from vault YAML:
  Strong Ninja, Fast Ninja, Tough Ninja, Smart Ninja, Dedicated Ninja, Charismatic Ninja.
- Hard dependency on public `naruto-d20` module ≥ 1.0.8 (techniques + feats compendia).
- Python generator (`scripts/generate-classes.py`) for YAML → Foundry JSON, with
  deterministic UUIDs (md5(slug)[:16]) so re-runs produce byte-identical output.
- Pytest suite covering generator field translation, save-special overrides
  (Fast Ninja Ref = mid-custom, Smart Ninja Will = mid-custom per Kaihou house
  rules), and skill-key mapping exhaustiveness.
- Validation script (`scripts/validate-output.py`) for JSON schema completeness.
- Bilingual setup (en + pt-BR).
- ESLint + Prettier + Stylelint cribbed from public module.
- GH Actions release workflow cribbed from public module.

### Known limitations
- Talent trees (Chakra Control tree, Empathic tree, etc.) are NOT included in this
  release. They are deferred to a D2.X follow-up (`packs/class-talents/`). Imported
  classes show correct BAB/saves/Defense/Reputation/HD/class-skills but lack
  talent-tree class features.

[1.0.0]: https://github.com/ezioaalves/naruto-d20-kaihou/releases/tag/v1.0.0
