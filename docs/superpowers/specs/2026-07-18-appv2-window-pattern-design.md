# ApplicationV2 Window Pattern — Design

**Date:** 2026-07-18
**Status:** Approved
**Branch:** `feat/appv2-window-pattern` (off `main`, post-v2.1.20)

## Problem

The module has three ApplicationV2 windows (`TwentyQuestionsWizard`, `DowntimeConsole`,
`DowntimePrompt`) built independently, with more planned. Each re-declares
`MODULE_ID`, re-destructures `HandlebarsApplicationMixin(ApplicationV2)`, and
hand-rolls its own solutions to the same three problems:

1. **Singleton lifecycle** — the downtime apps each maintain a private
   `static #instance` guard with slightly different reopen semantics.
2. **Change-event actions** — ApplicationV2's `actions` map dispatches on
   *click only*; selects and textareas need a hand-wired `change` delegator.
   The wizard invented `_wireChangeActions` (with a latent duplicate-listener
   bug: it re-wires on every render with no guard); the player prompt
   hand-rolls a per-element `dataset.kaihouBound` guard for the same need.
3. **Visual baseline** — each app's SCSS re-implements the parchment surface,
   grain overlay, ink text, input, and button styling. Each window's baseline
   drifts independently — the wizard, for example, duplicates
   `background`/`ink`/`font-family` with its own variations, and windows that
   skip any piece fall through to Foundry/PF1e dark-theme values, producing
   the scattered low-contrast bugs swept in v2.1.20.

## Decision

Approach **A + C**: a thin JS utility base class (`KaihouApplication`) plus a
shared SCSS mixin (`@mixin kaihou-window`). No mandatory PARTS contract —
each window keeps free choice of template structure. No external library:
the Foundry ecosystem has no canonical AppV2 base-class package; this is a
small file we own.

## Component 1 — `KaihouApplication` base class

**File:** `scripts/apps/kaihou-application.mjs`

```js
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class KaihouApplication extends HandlebarsApplicationMixin(ApplicationV2) {
  static MODULE_ID = "naruto-d20-kaihou";
  static kaihouTemplate(relativePath) { /* → "modules/<id>/templates/<path>" */ }

  // ── Singleton lifecycle ──────────────────────────────────────────────
  static #instances = new Map(); // subclass constructor → live instance

  /**
   * Generic singleton open. In a static method `this` is the subclass, so
   * `DowntimeConsole.open()` needs zero per-app boilerplate. If an instance
   * is already rendered, calls `_onReopen(...args)` then re-renders;
   * otherwise constructs, stores, renders.
   */
  static open(...args) { /* … */ }

  /** Live instance of the calling subclass, or null. */
  static get instance() { /* … */ }

  /** Hook: update instance state when open() finds the window already up. */
  _onReopen(..._args) {}

  // ── Change-event delegation ──────────────────────────────────────────
  /**
   * Wire `data-action` handlers for `change` events, which ApplicationV2's
   * click-only `actions` map misses. Wires ONCE per app instance (guarded),
   * on the app root — parts re-render freely underneath it.
   * Call from _onRender: this._wireChangeActions({ "my-change": Handler }).
   */
  _wireChangeActions(map) { /* … */ }

  // ── Opt-in centering ─────────────────────────────────────────────────
  // DEFAULT_OPTIONS: { kaihou: { centerOnFirstRender: false } }
  // When true, _onFirstRender schedules a requestAnimationFrame setPosition
  // (AppV2 computes initial placement after insertion, overriding an
  // immediate call — the trick the wizard discovered).
  _onFirstRender(context, options) { /* … */ }

  // ── Shared CSS class ─────────────────────────────────────────────────
  // Appends "kaihou-app" to options.classes unconditionally. Done in
  // _initializeApplicationOptions, NOT in DEFAULT_OPTIONS.classes — AppV2's
  // options merge REPLACES arrays, so a subclass declaring its own
  // `classes` would silently wipe a base declaration.
  static _initializeApplicationOptions(options) { /* … */ }
}
```

Design points locked during review:

- **Singleton registry lives in the base**, keyed by subclass constructor,
  because JS private fields (`#instance`) are not accessible from a base
  class — the registry removes the need for them entirely. Fresh-instance
  windows (the wizard) simply never call `open()`; they construct directly.
- **Reopen semantics** go through `_onReopen(...args)` — e.g. the player
  prompt updates its `record`/`actor` there. Gating (the console's GM check)
  stays in a subclass `static open()` override that calls `super.open()`.
- **`_wireChangeActions` wires once**, guarded by an instance flag, fixing
  the wizard's duplicate-listener bug and replacing the prompt's
  per-element guard.
- **Centering is opt-in** (`kaihou.centerOnFirstRender`), default off — the
  downtime windows don't center today and a refactor must not silently
  change their placement.
- **`kaihou-app`** gives future global CSS and the theme one selector
  meaning "any kaihou window."

## Component 2 — `@mixin kaihou-window`

**File:** `scss/apps/_kaihou-window.scss` (no `@use` needed — it consumes
only `--k-*` CSS custom properties, no Sass variables)

The baseline block currently hand-rolled in `_downtime.scss`, extracted:

```scss
@mixin kaihou-window {
  background: var(--k-paper);
  border: var(--k-bold-border);
  color: var(--k-ink);
  font-family: var(--k-font-body);

  &::before { /* --k-bold-grain overlay, pointer-events: none, z-index 0 */ }
  > * { position: relative; z-index: 1; }

  h2, h3, legend { /* --k-font-display headings */ }
  label { /* --k-ink-soft */ }
  select, input[type="text"], textarea { /* --k-input-bg-strong, --k-rule-ink */ }
  button { /* --k-card-bg, --k-bold-border, seal focus ring */ }
  .hint { /* --k-ink-mute italic */ }

  @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
}
```

Usage — first line of every per-app stylesheet, inside the app's root class:

```scss
.kaihou-downtime { @include kaihou-window; /* app-specific rules below */ }
```

Never set `position` on the app root class — it sits on the application
element beside core's `.application`, whose fixed positioning must win
(documented failure mode from `_downtime.scss`).

## Component 3 — File structure & new-window recipe

New files:

```
scripts/apps/kaihou-application.mjs
scss/apps/_kaihou-window.scss
```

Recipe for every future window:

1. `scripts/apps/<name>.mjs` — `extends KaihouApplication`, templates via
   `KaihouApplication.kaihouTemplate(...)`.
2. `templates/apps/<name>/…` — free choice of PARTS.
3. `scss/apps/_<name>.scss` — opens with `@include kaihou-window` under the
   app's root class (also listed in `DEFAULT_OPTIONS.classes`).
4. Register the stylesheet in **three places**: `build:css` and `watch:css`
   in `package.json`, and the `styles` array in `module.json`. The
   `test:css-fresh` guard catches forgotten rebuilds.
5. Import/register the app in `scripts/kaihou.mjs`.

## Migration of existing apps

| File | Change |
|---|---|
| `gm-console.mjs` | `extends KaihouApplication`; drop local `MODULE_ID`; replace `#instance` guard with `super.open()` + GM gate in `open()` override |
| `player-prompt.mjs` | same; move record/actor refresh into `_onReopen`; `closeIfOpen` reads `this.instance`; replace `dataset.kaihouBound` select wiring with `_wireChangeActions` |
| `twenty-questions-wizard.mjs` | `extends KaihouApplication`; drop local `MODULE_ID`; drop bespoke `_onFirstRender` centering (set `kaihou.centerOnFirstRender: true`); drop bespoke `_wireChangeActions` (use base) |
| `scss/apps/_downtime.scss` | replace hand-rolled baseline with `@include kaihou-window` |
| `scss/apps/_twenty-questions-wizard.scss` | add `@include kaihou-window` under `.tqw-v2` (dedupes its hand-rolled baseline; keeps its heavier border + shadow as post-include overrides) |

Non-goals: no PARTS restructuring, no template changes beyond what the JS
migration forces, no visual redesign — windows must look identical after migration, full stop.

## Testing

- **Unit (vitest):** `kaihouTemplate` and the singleton `open`/`instance`
  registry are testable with stub constructors. `_wireChangeActions` touches
  the DOM — test with a minimal fake element (object with
  `addEventListener`/`querySelector`), not as a pure function.
- **Existing pure-context tests** (`buildConsoleContext`,
  `buildPromptContext`) must keep passing unchanged — they don't touch the
  application classes.
- **Visual (single-session):** open each migrated window in one Foundry
  session as GM — parchment surface, readable ink text, correct placement.
  No second client required; this pattern is deliberately verifiable
  without live players (constraint from the 2026-07-18 handoff).
- `npm run lint && npm test` green; CSS rebuilt via `npm run build:css`.

## Relationship to other branches

NOT independent of `feat/socketlib-downtime` as originally assumed: that
unmerged branch heavily rewrites `gm-console.mjs`, `player-prompt.mjs`, their
templates, and `_downtime.scss`. Decision (2026-07-18): this PR ships the
pattern + wizard migration only, off `main`. The downtime apps migrate in a
follow-up performed on/after the socketlib branch, against the current code —
that follow-up covers the `open()`/`_onReopen` adoption, `closeIfOpen` via
`instance`, replacing the `dataset.kaihouBound` select wiring with
`_wireChangeActions` (requires adding a `data-action` to the prompt's action
`<select>`), and `@include kaihou-window` in `_downtime.scss`.
