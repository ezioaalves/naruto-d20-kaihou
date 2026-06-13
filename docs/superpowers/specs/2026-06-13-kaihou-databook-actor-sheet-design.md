# Kaihou Databook Actor Sheet + Design-System Foundation

**Date:** 2026-06-13
**Status:** Draft for review
**Supersedes the "simple reskin" complaint in:** `kaihou-ui-style-coverage-audit`
**Reference studied:** L5R5E Foundry system (gitlab.com/teaml5r/l5r5e) — full custom-sheet system; its SCSS partials (`global`, `ui`, `nav`, `colors`, `fonts`, `compatibility-modules`, `twenty-questions`) are the ancestors of the current zen-theme partials.

---

## 1. Goal

Replace the current CSS-overlay reskin of PF1e's stock character sheet with a **bespoke, campaign-specific actor sheet** in the visual language of the official **Naruto Databook**, and reorganize the theme it rests on from loose overrides into a real layered design system.

The sheet is the headline deliverable and the proof that the foundation works.

## 2. Governing constraint — module responsibility boundary

Two modules, **one-way dependency** (already declared in `module.json`: kaihou `requires` naruto-d20). `naruto-d20` must **never** depend on or know about Kaihou; it stays generally usable by anyone.

| Concern | **naruto-d20** (friend — general mechanics) | **naruto-d20-kaihou** (this module — campaign lore + presentation) |
|---|---|---|
| Actor data model (chakra pool, natures/affinities, jutsu, rank) | **owns** | reads only |
| Roll logic, dice, mechanical click-handlers | **owns** | — |
| Chakra tab fields + "Sync Techniques" button | **owns** (injects via prototype patch) | themes only |
| Visual theme — palette, type, spacing, components | — | **owns** |
| Bespoke actor sheet (frame, tabs, header band, radars, lore panels) | — | **owns** |
| Campaign identity data (alias, allegiance, mission record) | — | **owns** (actor flags) |
| Lore content (village, school, occupation, bloodline, flaw, 20Q) | — | **owns** |

"Coordination" = the friend may add **general-purpose** hooks/getters to naruto-d20 that *any* sheet can reuse (e.g. a stable way to read affinities / advanced nature). It never means Kaihou-specific code in his module.

## 3. Scope & decomposition

**This spec (sub-project 1):** databook design-system foundation (only the tokens/components the sheet needs) **+ the bespoke PC `character` sheet.**

**Follow-on specs (not now):**
- NPC bespoke sheet (leaner databook dossier).
- Bespoke item sheets (technique/jutsu, class, bloodline…).
- Migrating the rest of the chrome (20Q wizard, grant dialogs, compendium browser) from the zen palette to the databook palette.

## 4. Architecture

### 4.1 Sheet class
- `KaihouCharacterSheet extends pf1.applications.actor.ActorSheetPFCharacter` (confirm exact subclass at plan time; base is `pf1.applications.actor.ActorSheetPF`, PF1e v11.11, ApplicationV1).
- Extending PF1e's class inherits **all** mechanical behavior for free: `getData()`, item CRUD, rolls, drag/drop, listeners — and the **naruto-d20 prototype patches** (`_renderInner` chakra injection, `_getHeaderButtons` synckit) because they live on the shared `ActorSheetPF.prototype`.
- Registered via `DocumentSheetConfig.registerSheet(Actor, MODULE_ID, KaihouCharacterSheet, { types: ["character"], label: "Kaihou — Databook", makeDefault: <world setting> })`.
- A world setting `kaihouSheetDefault` (Boolean, default **true**, mirrors the existing `themeEnabled` pattern) controls `makeDefault`. Users can still switch any single actor back to PF1e's sheet via Foundry's per-actor sheet config. The sheet is gated to the campaign world only (it's a campaign module); it never forces itself on naruto-d20's general audience.

### 4.2 Integration contract (the seam coordination rides on)
naruto-d20's `_renderInner` patch (`scripts/ui/render-patch.mjs`) appends:
- a `<a data-tab="chakra" data-group="primary">` into **`nav.sheet-navigation.tabs[data-group='primary']`**, and
- the chakra panel into **`section.primary-body`**.

**Therefore Kaihou's rendered DOM MUST preserve both anchor selectors.** This is achieved by re-composition (4.4), not by discarding PF1e's template — so the chakra tab and synckit button keep working with zero changes in naruto-d20. This contract is documented for the friend so neither side breaks the other on upgrade.

### 4.3 Build strategy — re-compose, never re-implement
We keep PF1e's own rendered fields/widgets (so binding, listeners, and rolls stay PF1e's) and **re-compose** them into the databook frame — the same proven pattern naruto-d20 already uses for the chakra tab. We do **not** author a from-scratch template that re-declares every input.

In `KaihouCharacterSheet`:
- `getData()` → call `super.getData()`, then attach a `kaihou` view-model (radars, mission record, identity, natures) — pure read, no writes.
- `_renderInner()` → `await super._renderInner()` (PF1e builds its DOM; naruto-d20 injects chakra), then inject the **databook header band**, the **two radars**, and the **lore panels** into the Identity tab, and apply tab reorder/rename. Anchor selectors preserved.
- `activateListeners()` → `super.activateListeners()`, then bind only Kaihou-owned controls (edit alias/allegiance/mission counts, "re-run 20Q"). No mechanical handlers.

Rationale: maximal upgrade resilience, zero duplication of his mechanics, fastest path to a bespoke feel (most of the transformation is the design-system CSS + a few injected nodes).

### 4.4 Data flow & ownership
`KaihouCharacterSheet.getData()` builds `data.kaihou`:
- `identity`: `{ kanjiName, alias, allegiance, village(+crest), rank, missions:{D,C,B,A,S,total} }` — Kaihou flags + lore compendia lookups.
- `radars.abilities`: 6 axes from `actor.system.abilities.{str,dex,con,int,wis,cha}.total`.
- `radars.disciplines`: 5 axes from the discipline skills (Ninjutsu, Fūinjutsu, Chakra Control, Taijutsu, Genjutsu) read from `actor.system.skills.*` (skill ids resolved from naruto-d20 at plan time).
- `natures`: 5 basic affinities + 1 advanced/KKG slot, read from naruto-d20 affinity data (coordination item §9 if no stable getter exists).

## 5. Sheet layout

### 5.1 Header band (always visible, above the tab strip)
Portrait (databook bust + corner plate) · kanji name · romaji name (large, sans) · **alias/epithet** (「…」, accent colour) · badges: **village crest + name**, **ninja rank** (filled accent), **current allegiance** (e.g. "13th Tantō", dark plate — replaces the discarded registry number) · **natures row**: 火 水 風 土 雷 + a distinct **void slot** for the Kekkei Genkai advanced nature (Mokuton 木, Hyōton 氷, …), greyed/locked when absent · resource pips HP / AC / Chakra. Class is intentionally **not** shown (characters multiclass heavily; class ≠ identity).

### 5.2 Tab set & order
`Identity (default)` · `Chakra ⟵ injected by naruto-d20` · `Combat` · `Skills` · `Inventory` · `Features` · `Bio`.

### 5.3 Identity tab (front matter)
- **Two radars side-by-side** (compact): **Ability Scores** hexagon (red) + **Disciplines** pentagon (purple) — two visual "lenses."
- **Mission Record** panel: D / C / B / A / S / Total.
- **Origin & Path** panel: village, school, occupation, bloodline (incl. advanced nature), flaw — from Kaihou lore compendia.
- 20 Questions identity summary + "Re-run 20Q wizard" button (reuses existing wizard).

### 5.4 Combat / Skills tabs
PF1e's existing Combat and Skills content, re-laid-out in databook panels, **plus the full-size radar** for that lens (Ability radar on Combat, Discipline radar on Skills).

### 5.5 Chakra / Inventory / Features / Bio
- Chakra: naruto-d20's injected tab — **themed only**.
- Inventory / Features / Bio: PF1e content re-laid-out in databook panels; Bio integrates the existing bio-section + 20Q renderer.

## 6. New Kaihou data model (actor flags)
Stored under `flags["naruto-d20-kaihou"]`, all Kaihou-owned, all optional:
- `alias: string`
- `allegiance: string`
- `missions: { D, C, B, A, S }` (ints; total derived)
- `radarOverrides?`: optional manual nudge per axis (default off — radars are auto-derived).

No PF1e/naruto-d20 fields are written. A lightweight migration backfills defaults on first render.

## 7. Radars — data & rendering
- One reusable SVG radar **component** (databook primitive): N axes, two concentric grid rings, axis labels, filled value polygon. Parameterized by `{ axes:[{label,value}], max, variant }`.
- **Normalization:** each axis value scaled to `[0,max]` → radius. Ability axes and discipline axes use independent, fixed scales chosen so a "typical" PC sits mid-web (exact scale numbers are a build-time tuning decision — §11).
- Auto-derived from live actor data every render; no stored chart. `radarOverrides` (if ever set) only nudges display.
- Rendered both compact (front matter) and full (stat tabs) from the same component.

## 8. Natures + void/KKG
- Five basic natures rendered from naruto-d20 affinity data; "on" styling when the character has that affinity.
- One **void slot** styled distinctly (double ring, violet) for the advanced/KKG nature; shows its kanji when present, locked/greyed otherwise.
- Source of truth is naruto-d20 (mechanics). Kaihou only displays. If no stable getter exists for "advanced nature," §9 coordination item; interim fallback = a Kaihou display flag.

## 9. Coordination items for naruto-d20 (for the friend)
1. **Keep the injection anchors stable** (`nav.sheet-navigation.tabs[data-group='primary']`, `section.primary-body`) — Kaihou's sheet preserves them; document this as the cross-module contract.
2. **Optional general getter** for affinities + advanced/KKG nature (e.g. `actor.flags["naruto-d20"]…` or a documented helper) so any sheet can render natures without reaching into internals. General-purpose; not Kaihou-specific.
3. **Optional general getter** for the discipline skill ids (Ninjutsu/Fūinjutsu/Chakra Control/Taijutsu/Genjutsu) so the discipline radar isn't hard-coded.
Items 2–3 are nice-to-have; Kaihou ships with documented fallbacks if they don't land.

## 10. Design-system foundation (scoped to the sheet)
Introduce a **databook token + component layer**, reusing the existing scoping mechanism (`body.naruto-zen` body class + `.naruto-zen-target` render tag, `themeEnabled` toggle):
- **Tokens** (`scss/tokens/_databook.scss`): registry-red `#b23a2e`, ink `#2e271d`, cream `#efe9d8`, panel `#f4efe0`, border `#cdbf99`, void-violet `#6a3d8f`; databook type scale; spacing; radar colours.
- **Primitives** (`scss/components/`): `panel`, `badge` (+rank/allegiance variants), `pip`, `radar`, databook `tab`/`nav`, header `band`. Extend the existing `card`/`chip` family rather than duplicating.
- **Surface** (`scss/theme/_kaihou-character-sheet.scss`): the bespoke sheet, nested under `.naruto-zen-target` like the other sheet partials.
The databook palette becomes the module's forward visual language; the zen/parchment partials are superseded incrementally (sheet first, other surfaces in follow-on specs). **(Confirm: replace zen module-wide over time — §12.)**

## 11. Open decisions deferred to build time
- Exact radar normalization scales (ability vs discipline).
- Whether the discipline radar uses skill **ranks** or total **modifier**.
- Mission counts: free-entry vs increment buttons.
- Whether allegiance is free text or a lookup against a campaign roster.

## 12. Decision needing the user's confirmation in review
- **Aesthetic scope:** treat databook as the new module-wide visual language (zen superseded over time, sheet first) — vs databook on the actor sheet only, zen retained elsewhere. Spec currently assumes the former.

## 13. Error handling / resilience
- naruto-d20 absent/older: sheet still renders; natures/chakra degrade gracefully (locked slots, no chakra tab) without throwing.
- Missing skills/abilities: radar axis renders at zero, never `NaN` (guard every read).
- PF1e version drift: because we wrap `super`, a PF1e change at worst restores PF1e's native section; the injected databook nodes are additive and defensively selector-guarded.
- All injection is idempotent (re-render safe), mirroring naruto-d20's `installed`/guard pattern.

## 14. Testing & verification
- **Vitest:** view-model builder (identity/mission/nature mapping) and radar polygon math (axis→point), with zero/missing-data cases.
- **CSS regression guard:** extend the existing scope guard so databook sheet rules stay under `.naruto-zen-target` and never leak.
- **Manual Foundry verification (required before any tag):** install in local Foundry (`~/Documents/foundry/`), open a real PC, confirm the chakra tab still injects, radars render, switching to PF1e's sheet still works. Per project rule: CI green ≠ shippable.
- Release: semver **patch** bump only; CHANGELOG entry; the v2.1.5 zip/manifest-completeness guard already covers new scripts/templates/styles.

---

### Decisions captured from brainstorming
- Direction **C** (bespoke sheet) over reskin/reflow.
- Coordinated build; Kaihou owns a campaign sheet; naruto-d20 stays independent.
- Databook aesthetic; header emphasized; class dropped; alias + allegiance + mission-by-rank added.
- Void slot for Kekkei Genkai advanced nature.
- Two auto-derived radars (abilities, disciplines), front matter + own tabs.
