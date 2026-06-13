# Kaihou UI Style Coverage Audit — Design Spec
**Date:** 2026-06-13
**Ticket:** kaihou-ui-style-coverage-audit
**Goal:** Close all un-styled UI surfaces in naruto-d20-kaihou so the module is game-ready for the VPS session.

---

## Context

The zen design system (tokens, components, theme partials) is in place. Several surfaces were known gaps:
the chakra tab had layout bugs and unwired discipline icons; condition/status icons were sitting unused
in `assets/theme/icons/conditions/`; the occupation dialog used the deprecated V1 `Dialog` API; and
the L5R5e `techs/` SVGs had never been plumbed into the discipline icon system.

The biography section (`_bio-section.scss`) and the 20Q wizard (`_twenty-questions-wizard.scss`) are
already complete and out of scope.

---

## Priority order (game-ready milestone)

1. Chakra tab — layout fixes + discipline icons
2. Compendium entries audit — sweep for unstyled default chrome
3. Occupation dialog — V1 → DialogV2 migration
4. Status effects — wire `conditions/` icons to `CONFIG.statusEffects`
5. Target icon — wire `target-round.svg`

---

## Section 1 — Discipline icon system

### Tokens (`scss/_tokens.scss`)

Add six `--zen-disc-*-icon` custom properties under `:root` pointing to the confirmed L5R5e `techs/` SVGs:

```scss
--zen-disc-tai-icon: url("../../assets/theme/icons/techs/kata.svg");
--zen-disc-nin-icon: url("../../assets/theme/icons/techs/invocation.svg");
--zen-disc-gnj-icon: url("../../assets/theme/icons/techs/mantra.svg");
--zen-disc-ckc-icon: url("../../assets/theme/icons/techs/ritual.svg");
--zen-disc-fui-icon: url("../../assets/theme/icons/techs/shuji.svg");
--zen-disc-kin-icon: url("../../assets/theme/icons/techs/maho.svg");
```

### `scss/theme/_disciplines.scss`

Update the `$disciplines` map so each entry references the matching token. Change the
`[data-discipline-icon]` / `i.i_discipline-*` background rule to use the token:

```scss
[data-discipline-icon="#{$key}"],
i.i_discipline-#{$key} {
    background: transparent var(--zen-disc-#{$key}-icon) no-repeat center / contain;
    display: inline-block;
    width: 1rem;
    height: 1rem;
    vertical-align: text-bottom;
}
```

The `disciplines/*.svg` files remain on disk as fallbacks but are no longer the active source.

---

## Section 2 — Chakra tab layout fixes

All changes in `scss/theme/_naruto-module.scss`.

### 2a — Learn checks: force single row

```scss
.defenses .combat-stats {
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 0.5rem;
}
```

Replaces the `auto-fit, minmax(160px, 1fr)` that wraps Fuinjutsu onto a second row.

### 2b — Top cards double-padding

`.window-content > form` already applies `padding: 0.5rem` from the global theme. Remove the
redundant `padding: 0.5rem` from `.tab.chakra` and keep only bottom/horizontal if needed:

```scss
.tab.chakra {
    padding: 0 0.5rem 0.5rem;
}
```

Exact value confirmed by inspecting the live Foundry layout; adjust if the inner `.attributes`
row needs different spacing.

### 2c — Discipline filter tabs: icon + abbreviation

`.technique-filter[data-disc="<key>"]` gets a `::before` pseudo-element rendering the disc icon
via CSS mask (consistent with the existing sidebar icon pattern):

```scss
.technique-filter[data-disc="#{$key}"] {
    &::before {
        content: "";
        display: inline-block;
        width: 1em;
        height: 1em;
        background-color: currentColor;
        mask: var(--zen-disc-#{$key}-icon) no-repeat center / contain;
        -webkit-mask: var(--zen-disc-#{$key}-icon) no-repeat center / contain;
        vertical-align: middle;
        margin-right: 0.25em;
    }
}
```

The naruto-d20 module owns the button HTML — kaihou cannot change it. Instead, hide the text node
with `font-size: 0` on `.technique-filter[data-disc]` and restore size only on the `::before` icon.
Screen readers still see the text; the visual output becomes icon-only per discipline chip.
The "ALL" and "OTHER" filters (no `data-disc`) are unaffected and keep their text.

### 2d — Learn-check headers: disc icon

`.learn-check-header[data-key="<key>"]` — same `::before` mask pattern as above, applied via the
`_disciplines.scss` loop's `[data-discipline-icon]` hook **or** a new loop in `_naruto-module.scss`
targeting the `learn-check-header` element directly:

```scss
.learn-check-header[data-key="#{$key}"]::before { /* same mask pattern */ }
```

Color is already handled by the existing per-discipline `color: $color` rule.

---

## Section 3 — Status effects wiring

### New file: `scripts/setup/status-effects.mjs`

Hooks `Hooks.once("init")` to remap `CONFIG.statusEffects` icon paths for the subset of conditions
that have kaihou assets. Conditions not listed here keep their default PF1e icons.

**Active mapping:**

| PF1e `id` | Kaihou icon path |
|---|---|
| `dying` | `modules/naruto-d20-kaihou/assets/theme/icons/conditions/dying_1.webp` |
| `unconscious` | `…/conditions/unconscious.webp` |
| `exhausted` | `…/conditions/exhausted.webp` |
| `stunned` | `…/conditions/dazed.webp` |
| `nauseated` | `…/conditions/intoxicated.webp` |
| `confused` | `…/conditions/disoriented.webp` |
| `paralyzed` | `…/conditions/incapacitated.webp` |
| `entangled` | `…/conditions/immobilized.webp` |
| `prone` | `…/conditions/prone.webp` |
| `bleeding` | `…/conditions/bleeding.webp` |
| `burning` | `…/conditions/burning.webp` |
| `silenced` | `…/conditions/silenced.webp` |

**Deferred** (keep PF1e defaults until custom icons are provided):
`fatigued`, `staggered`, `shaken`, `frightened`, `panicked`, `pinned`, `blinded`

### `module.json`

Add `"scripts/setup/status-effects.mjs"` to the `esmodules` (or `scripts`) array, before the
existing grant scripts so it fires at `init`.

---

## Section 4 — Occupation dialog V1 → DialogV2

### `scripts/grants/occupation-apply.mjs`

Replace `promptOccupationSelections` inner `new Dialog({...})` with
`foundry.applications.api.DialogV2.wait({...})`.

**V1 → V2 shape:**

```js
// V1 (deprecated, remove)
new Dialog({
  title, content,
  buttons: { apply: { label, callback }, cancel: { label, callback } },
  render: (html) => wireOccupationDialogConstraints(html[0] ?? html, ...),
  default: "apply",
  close: () => resolve(null),
}).render(true);

// V2 (replacement)
const result = await foundry.applications.api.DialogV2.wait({
  window: { title },
  content,
  buttons: [
    {
      action: "apply",
      label: "Apply",
      default: true,
      callback: (event, button, dialog) => {
        const root = dialog.element;
        // ... same extraction logic ...
        return { classSkillKeys, featName, techniqueName };
      },
    },
    { action: "cancel", label: "Cancel", callback: () => null },
  ],
  render: (event, html) => wireOccupationDialogConstraints(html, ...),
  close: () => resolve(null),
});
resolve(result ?? null);
```

The `render` callback in V2 receives `(event, html)` where `html` is already a DOM element (no
`[0]` unwrap needed). The `wireOccupationDialogConstraints` function is otherwise unchanged.

The existing `_occupation-selector.scss` styles apply via the `.kaihou-occupation-selector` form
class — no SCSS changes required.

---

## Section 5 — Target icon

**File:** `scss/theme/_ui.scss` (or `_global-appv2.scss` if the selector lives in ApplicationV2 chrome)

Wire `assets/theme/imgs/target-round.svg` to Foundry's token targeting indicator. Exact CSS
selector determined by inspecting the live Foundry DOM; likely one of:

```scss
// Token targeting ring override
.canvas-layer .targeting .target-icon,
.token-targeting img,
[data-action="target"] i { ... }
```

Use `content: url(...)` or `background + mask` depending on the element type confirmed at runtime.

---

## Section 6 — Compendium entries audit

During implementation, open each naruto-d20 compendium in the live Foundry and visually inspect:
- Technique browser (`.technique-browser`) — already partially styled in `_naruto-module.scss`
- Item type sheets (technique, weapon, feat, occupation, school) — check for unstyled chrome
- Actor compendium entries — check portrait sizing and border treatment

Any gaps receive targeted rules in the appropriate existing partial. No new partials added unless
a surface requires more than 20 lines.

---

## Files changed

| File | Change |
|---|---|
| `scss/_tokens.scss` | Add 6 `--zen-disc-*-icon` tokens |
| `scss/theme/_disciplines.scss` | Switch icon paths to `techs/` via tokens |
| `scss/theme/_naruto-module.scss` | Chakra layout fixes + disc icon `::before` on filter tabs + learn-check headers |
| `scss/theme/_ui.scss` | Target icon CSS |
| `scripts/setup/status-effects.mjs` | **New** — condition icon wiring |
| `module.json` | Register `status-effects.mjs` |
| `scripts/grants/occupation-apply.mjs` | V1 Dialog → DialogV2 migration |

SCSS changes require a `npm run build` pass. JS changes hot-reload on Foundry world restart.
