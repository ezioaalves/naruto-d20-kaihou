# Databook UI Overhaul — Roadmap

**Status:** living document · **Started:** 2026-06-13 · **Current head:** kaihou v2.1.8 (main)

This is the single map for the campaign-wide UI overhaul that began with the
bespoke databook character sheet. It supersedes the scattered scope notes in the
`kaihou-ui-style-coverage-audit` ticket and §3 of the actor-sheet spec.

---

## 1. North star

Replace the CSS-overlay "reskin" of PF1e with **bespoke, campaign-specific
surfaces in the visual language of the official Naruto Databook**, where Kaihou
owns *layout and presentation* and naruto-d20 owns *all mechanics*. The databook
palette becomes the module-wide visual language; the zen/parchment theme is
superseded incrementally.

## 2. Governing constraints (do not violate)

- **Module boundary.** naruto-d20 (friend, general mechanics) must never depend
  on Kaihou. Kaihou extends PF1e classes and reads naruto-d20 data; it never puts
  campaign code in his module. Coordination = general-purpose getters he *may*
  add. Seam: `docs/cross-module-contract.md`.
- **Re-compose, never re-implement.** Embed PF1e's own partials / rendered fields
  so rolls, listeners and item CRUD stay PF1e's. No re-declaring mechanics.
- **Preserve the chakra anchors.** Any actor sheet must keep
  `nav.sheet-navigation.tabs[data-group='primary']` and `section.primary-body`
  so naruto-d20's chakra-tab injection keeps working.
- **Scope sheet CSS under a guaranteed class** (e.g. `.kaihou-databook-form`),
  emitted globally — never gated behind the theme's runtime `.naruto-zen-target`
  tagging (it doesn't reliably land, and a bespoke surface must work with the
  theme off). See `tests/theme/databook.test.mjs`.

## 3. Architecture (proven — reuse for every surface)

Established by the PC sheet; copy it for NPC/item sheets:

1. **Thin Foundry class** — only wiring (`get template()`, `defaultOptions`,
   `getData` attaching a view-model + pre-rendered fragments). `scripts/sheets/kaihou-character-sheet.mjs`.
2. **Own top-level template** that embeds PF1e partials verbatim and adds the
   databook chrome. `templates/actor/kaihou-character-sheet.hbs`.
3. **Pure, Foundry-free, node-tested modules** — geometry / view-model / HTML
   builders. `scripts/sheets/{radar,view-model,databook-html}.mjs`.
4. **Token + component SCSS layer** — `--db-*` tokens, `.db-*` components
   (global), surface partial scoped under the form class.

## 4. Phases

| Phase | Scope | Status | Depends on |
|---|---|---|---|
| **0 — PC sheet foundation** | Own template, Identity tab (default), header band, dual radars, mission record, origin & path, editable alias/allegiance, scoping fix | ✅ Done (v2.1.8) | — |
| **1 — PC sheet completeness** | See §5 | ☐ Backlog | 0 |
| **2 — Functional-tab palette re-skin (option B)** | Remap PF1e's `--pf1-*` CSS variables under `.kaihou-databook-form` so the functional tabs read databook (cream/red) while keeping PF1e DOM + mechanics. See §6 | 🔜 In progress | 0 |
| **3 — NPC bespoke sheet** | Leaner databook dossier; reuse §3 pattern | ☐ Backlog | 0 (pattern) |
| **4 — Bespoke item sheets** | Technique/jutsu, class, bloodline | ☐ Backlog | 0 (pattern); naruto-d20 item data |
| **5 — Remaining chrome** | 20Q wizard, grant dialogs, compendium browser → databook palette; retire zen partials | ☐ Backlog | 2 (palette decisions) |

## 5. Phase 1 backlog (PC sheet completeness)

- Header band: kanji name line, resource pips (HP / AC / Chakra), village crest art, rank-badge styling — to match `mockups/04-sheet-final-approved.html`.
- Combat & Skills **full-size radars** on their own tabs (spec §5.4) — as clean template regions, not injection (avoid the v2.1.6 clipping).
- Natures + KKG: replace the interim `flags["naruto-d20-kaihou"].advancedNature` with a real naruto-d20 getter (coordination item §7).
- Mission record: increment buttons vs free entry (spec §11) — pick one.
- Allegiance: free text vs campaign-roster lookup (spec §11).
- Bio tab: fold the existing 20Q grid into the databook frame coherently.
- Radar normalization scales (ability max 20 / discipline max 10 are placeholders — tune, spec §11).
- Band height: portrait is 96×120; consider shrinking to reclaim vertical room for functional tabs.

## 6. Phase 2 — the key open decision

**How databook should PF1e's functional tabs become?** Three depths, ascending cost/maintenance:

- **A. Identity-layer only** (today): databook band + Identity tab + red strip; PF1e tabs stay native. Cheapest, coherent, already shipped.
- **B. Palette re-skin (CSS-only):** recolor/typeset PF1e's functional tabs with `--db-*` via scoped CSS; keep PF1e DOM/layout. Medium cost, no template churn, upgrade-safe.
- **C. Full re-compose:** restructure PF1e's per-tab content into databook panels (move nodes / custom layout). Most bespoke; highest build + maintenance cost; most exposed to PF1e upgrades.

**Decision (2026-06-13): B chosen.** Implemented by remapping PF1e's own
`--pf1-*` custom properties (sheet background, header bg/text, control/accent
colour, item-list row tones, borders) on `.kaihou-databook-form`; because those
properties inherit, every PF1e element inside the form repaints databook with no
per-rule overrides and no exposure to PF1e DOM changes. C remains available
per-tab later if a specific tab warrants it.

## 7. Coordination items for naruto-d20 (general-purpose, not Kaihou-specific)

1. Keep the chakra injection anchors stable (documented in cross-module-contract).
2. A getter for affinities + advanced/Kekkei-Genkai nature.
3. A getter/export for the discipline→skill-key map (`nin/fui/ckc/tai/gnj`).

## 8. Cross-cutting

- **Mockups:** durable copies live in `docs/design/mockups/`. Every new surface gets a mockup here before build.
- **Template drift:** the PC template forks PF1e's `character-sheet.hbs`; re-diff on PF1e upgrades.
- **Release discipline:** patch `z` by default; manual Foundry verification before any tag (CI green ≠ shippable).

## 9. Source documents

- Spec: `docs/superpowers/specs/2026-06-13-kaihou-databook-actor-sheet-design.md`
- Plan (executed, then reworked to own-template): `docs/superpowers/plans/2026-06-13-kaihou-databook-actor-sheet.md`
- Cross-module seam: `docs/cross-module-contract.md`
- Mockups: `docs/design/mockups/`
- Original audit: vault `Campaign Management/operational/tickets/kaihou-ui-style-coverage-audit.md`
