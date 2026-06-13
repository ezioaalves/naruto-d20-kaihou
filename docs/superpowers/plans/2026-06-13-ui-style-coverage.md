# UI Style Coverage Audit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every unstyled UI surface in naruto-d20-kaihou so the module is game-ready for the VPS session.

**Architecture:** SCSS-only changes compile into `styles/theme/zen.css` via `npm run build:css`. JS changes (status effects, occupation dialog) live in `scripts/` and are imported through `scripts/kaihou.mjs` — the single `esmodules` entry in `module.json`. No new entry-point files; module.json does not change.

**Tech Stack:** Sass (SCSS), Foundry VTT v13, `foundry.applications.api.DialogV2`, vitest (JS tests), PF1e `CONFIG.statusEffects`

---

## File Map

| File | Role |
|---|---|
| `scss/_tokens.scss` | Add 6 `--zen-disc-*-icon` CSS custom property tokens |
| `scss/theme/_disciplines.scss` | Switch discipline icon map from `disciplines/` to `techs/` SVGs |
| `scss/theme/_naruto-module.scss` | Fix chakra tab grid + padding; add filter-tab + learn-check icon rendering |
| `scss/theme/_ui.scss` | Target icon CSS override |
| `scripts/setup/status-effects.mjs` | **New** — pure mapping function + `registerStatusEffects()` hook |
| `scripts/kaihou.mjs` | Import and call `registerStatusEffects()` in existing `init` hook |
| `scripts/grants/occupation-apply.mjs` | Migrate `new Dialog` → `DialogV2.wait`; export `renderOccupationSelectionContent` |
| `tests/setup/status-effects.test.mjs` | **New** — unit tests for `remapStatusEffectIcons` |
| `tests/grants/occupation-apply.test.mjs` | **New** — unit tests for `renderOccupationSelectionContent` |

---

## Task 1: Discipline icon tokens

**Files:**
- Modify: `scss/_tokens.scss`

- [ ] **Step 1: Add disc icon tokens to `_tokens.scss`**

Open `scss/_tokens.scss`. After the `--zen-village-tsuru` line (end of the village palette block, around line 108), add a new comment block:

```scss
  // ─── Discipline icons (L5R5e techs/ SVG mapping, keyed by naruto-d20 disc key) ─
  --zen-disc-tai-icon: url("../../assets/theme/icons/techs/kata.svg");
  --zen-disc-nin-icon: url("../../assets/theme/icons/techs/invocation.svg");
  --zen-disc-gnj-icon: url("../../assets/theme/icons/techs/mantra.svg");
  --zen-disc-ckc-icon: url("../../assets/theme/icons/techs/ritual.svg");
  --zen-disc-fui-icon: url("../../assets/theme/icons/techs/shuji.svg");
  --zen-disc-kin-icon: url("../../assets/theme/icons/techs/maho.svg");
```

Place this inside the existing `:root { }` block (before the closing `}`).

- [ ] **Step 2: Build CSS and verify compilation**

```bash
cd /home/ezioaalves/Documents/foundry/foundrydata/Data/modules/naruto-d20-kaihou
npm run build:css
```

Expected: no errors, `styles/theme/zen.css` updated.

- [ ] **Step 3: Commit**

```bash
git add scss/_tokens.scss styles/theme/zen.css
git commit -m "feat(tokens): add zen-disc-*-icon tokens for L5R5e techs/ mapping"
```

---

## Task 2: Update discipline icon source

**Files:**
- Modify: `scss/theme/_disciplines.scss`

- [ ] **Step 1: Update the `$disciplines` map icon stubs**

In `scss/theme/_disciplines.scss`, replace the `$disciplines` map (lines 12–19):

```scss
// Before
$disciplines: (
    "tai": ("color": colors.$nzen-tai, "icon": "taijutsu"),
    "nin": ("color": colors.$nzen-nin, "icon": "ninjutsu"),
    "gnj": ("color": colors.$nzen-gnj, "icon": "genjutsu"),
    "ckc": ("color": colors.$nzen-ckc, "icon": "chakra-control"),
    "fui": ("color": colors.$nzen-fui, "icon": "fuinjutsu"),
    "kin": ("color": colors.$nzen-kin, "icon": "kinjutsu"),
);
```

```scss
// After
$disciplines: (
    "tai": ("color": colors.$nzen-tai, "icon": "kata"),
    "nin": ("color": colors.$nzen-nin, "icon": "invocation"),
    "gnj": ("color": colors.$nzen-gnj, "icon": "mantra"),
    "ckc": ("color": colors.$nzen-ckc, "icon": "ritual"),
    "fui": ("color": colors.$nzen-fui, "icon": "shuji"),
    "kin": ("color": colors.$nzen-kin, "icon": "maho"),
);
```

- [ ] **Step 2: Change the background path from `disciplines/` to `techs/`**

In the same file, find the `[data-discipline-icon]` rule (lines 21–37) and update the `background` line:

```scss
// Before
background: transparent url("../../assets/theme/icons/disciplines/#{$icon}.svg") no-repeat center / contain;

// After
background: transparent url("../../assets/theme/icons/techs/#{$icon}.svg") no-repeat center / contain;
```

- [ ] **Step 3: Build CSS and verify**

```bash
npm run build:css
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add scss/theme/_disciplines.scss styles/theme/zen.css
git commit -m "feat(disciplines): switch disc icons from disciplines/ to L5R5e techs/ SVGs"
```

---

## Task 3: Chakra tab layout fixes

**Files:**
- Modify: `scss/theme/_naruto-module.scss`

The file is scoped under `body.naruto-zen { ... }`. All selectors below are inside that scope.

- [ ] **Step 1: Fix learn-checks grid to force 5-column single row**

Find the existing `.defenses .combat-stats` block inside `.tab.chakra`:

```scss
// Before
.defenses .combat-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 0.5rem;
}

// After
.defenses .combat-stats {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 0.5rem;
}
```

- [ ] **Step 2: Fix top-cards double-padding**

Find the `.tab.chakra {` opening rule. Change `padding: 0.5rem` to `padding: 0 0.5rem 0.5rem`:

```scss
// Before
.tab.chakra {
    background-color: var(--zen-surface); background-image: var(--zen-surface-image); ...
    background-size: cover;
    padding: 0.5rem;

// After
.tab.chakra {
    background-color: var(--zen-surface); background-image: var(--zen-surface-image); ...
    background-size: cover;
    padding: 0 0.5rem 0.5rem;
```

- [ ] **Step 3: Add icon rendering to technique discipline filter tabs**

Inside `.tab.chakra { .technique-disc-tabs { ... } }`, after the existing `.technique-filter` block and its `@each` loop, add two new blocks. The full `.technique-disc-tabs` section should end up as:

```scss
.technique-disc-tabs {
    gap: 0.25rem;
    padding: 0.25rem 0;
    border-bottom: 1px solid var(--zen-border);

    .technique-filter {
        font-family: var(--zen-font-body);
        text-transform: uppercase;
        letter-spacing: 0.05rem;
        font-size: 0.85rem;
        padding: 0.15rem 0.5rem;
        color: var(--zen-ink);
        border: none;
        border-bottom: 2px solid transparent;
        background: transparent;
        cursor: pointer;

        &:hover {
            color: var(--zen-ink-accent);
        }

        &.active {
            color: var(--zen-ink-accent);
            border-bottom-color: var(--zen-ink-accent);
        }

        @each $key, $color in $discipline-color {
            &[data-disc="#{$key}"] {
                &:hover,
                &.active {
                    color: $color;
                    border-bottom-color: $color;
                }
            }
        }
    }

    // Icon-only for discipline filter chips.
    // font-size:0 hides the text node; the ::before pseudo renders the icon.
    // "ALL" and "OTHER" (no data-disc) are unaffected and keep their text.
    .technique-filter[data-disc] {
        font-size: 0;
        padding: 0.2rem 0.35rem;

        &::before {
            content: "";
            display: inline-block;
            width: 1.1rem;
            height: 1.1rem;
            background-color: currentColor;
            vertical-align: middle;
        }
    }

    @each $key, $color in $discipline-color {
        .technique-filter[data-disc="#{$key}"]::before {
            mask: var(--zen-disc-#{$key}-icon) no-repeat center / contain;
            -webkit-mask: var(--zen-disc-#{$key}-icon) no-repeat center / contain;
        }
    }
}
```

- [ ] **Step 4: Add discipline icon to learn-check-box headers**

Find the existing `@each $key, $color in $discipline-color` block that styles `.learn-check-box[data-naruto-tooltip="learn.#{$key}"]`. Add the `::before` rule inside it:

```scss
@each $key, $color in $discipline-color {
    .learn-check-box[data-naruto-tooltip="learn.#{$key}"] {
        border-left-color: $color;

        .learn-check-header {
            color: $color;
        }
        .learn-check-total {
            color: $color;
        }

        // Discipline icon before the learn-check header label.
        .learn-check-header::before {
            content: "";
            display: inline-block;
            width: 1rem;
            height: 1rem;
            background-color: currentColor;
            mask: var(--zen-disc-#{$key}-icon) no-repeat center / contain;
            -webkit-mask: var(--zen-disc-#{$key}-icon) no-repeat center / contain;
            vertical-align: middle;
            margin-right: 0.3rem;
        }
    }
}
```

- [ ] **Step 5: Build CSS and verify**

```bash
npm run build:css
```

Expected: no errors, `styles/theme/zen.css` updated.

- [ ] **Step 6: Commit**

```bash
git add scss/theme/_naruto-module.scss styles/theme/zen.css
git commit -m "fix(chakra-tab): force 5-col learn-check grid, fix double-padding, add disc icons to filter/header"
```

---

## Task 4: Status effects wiring (TDD)

**Files:**
- Create: `scripts/setup/status-effects.mjs`
- Create: `tests/setup/status-effects.test.mjs`
- Modify: `scripts/kaihou.mjs`

- [ ] **Step 1: Write the failing test**

Create `tests/setup/status-effects.test.mjs`:

```js
import { describe, it, expect } from "vitest";
import { remapStatusEffectIcons } from "../../scripts/setup/status-effects.mjs";

const BASE = "modules/naruto-d20-kaihou/assets/theme/icons/conditions/";

describe("remapStatusEffectIcons", () => {
  it("replaces icon for a known condition", () => {
    const effects = [{ id: "prone", icon: "icons/conditions/prone.png", label: "Prone" }];
    const result = remapStatusEffectIcons(effects);
    expect(result[0].icon).toBe(`${BASE}prone.webp`);
    expect(result[0].id).toBe("prone");
    expect(result[0].label).toBe("Prone");
  });

  it("leaves a deferred condition unchanged", () => {
    const effects = [{ id: "shaken", icon: "icons/conditions/shaken.png", label: "Shaken" }];
    const result = remapStatusEffectIcons(effects);
    expect(result[0].icon).toBe("icons/conditions/shaken.png");
  });

  it("does not mutate the input objects", () => {
    const original = { id: "prone", icon: "old.png" };
    remapStatusEffectIcons([original]);
    expect(original.icon).toBe("old.png");
  });

  it("maps all 12 active conditions", () => {
    const ids = [
      "dying", "unconscious", "exhausted", "stunned", "nauseated",
      "confused", "paralyzed", "entangled", "prone",
      "bleeding", "burning", "silenced",
    ];
    const effects = ids.map((id) => ({ id, icon: "old.png" }));
    const result = remapStatusEffectIcons(effects);
    for (const r of result) {
      expect(r.icon).toContain("naruto-d20-kaihou");
      expect(r.icon).toContain(".webp");
    }
  });

  it("returns a new array, not the original", () => {
    const effects = [{ id: "prone", icon: "old.png" }];
    const result = remapStatusEffectIcons(effects);
    expect(result).not.toBe(effects);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:js
```

Expected: FAIL — `Cannot find module '../../scripts/setup/status-effects.mjs'`

- [ ] **Step 3: Create `scripts/setup/status-effects.mjs`**

```js
const MODULE_BASE = "modules/naruto-d20-kaihou/assets/theme/icons/conditions/";

const CONDITION_ICON_MAP = {
  dying:       `${MODULE_BASE}dying_1.webp`,
  unconscious: `${MODULE_BASE}unconscious.webp`,
  exhausted:   `${MODULE_BASE}exhausted.webp`,
  stunned:     `${MODULE_BASE}dazed.webp`,
  nauseated:   `${MODULE_BASE}intoxicated.webp`,
  confused:    `${MODULE_BASE}disoriented.webp`,
  paralyzed:   `${MODULE_BASE}incapacitated.webp`,
  entangled:   `${MODULE_BASE}immobilized.webp`,
  prone:       `${MODULE_BASE}prone.webp`,
  bleeding:    `${MODULE_BASE}bleeding.webp`,
  burning:     `${MODULE_BASE}burning.webp`,
  silenced:    `${MODULE_BASE}silenced.webp`,
};

export function remapStatusEffectIcons(statusEffects) {
  return statusEffects.map((effect) => {
    const newIcon = CONDITION_ICON_MAP[effect.id];
    return newIcon ? { ...effect, icon: newIcon } : effect;
  });
}

export function registerStatusEffects() {
  Hooks.once("init", () => {
    CONFIG.statusEffects = remapStatusEffectIcons(CONFIG.statusEffects ?? []);
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:js
```

Expected: all `remapStatusEffectIcons` tests PASS.

- [ ] **Step 5: Wire `registerStatusEffects` into `kaihou.mjs`**

In `scripts/kaihou.mjs`, add the import at the top with the other imports:

```js
import { registerStatusEffects } from "./setup/status-effects.mjs";
```

Inside the existing `Hooks.once("init", async () => { ... })` block, add the call **before** the template preload:

```js
Hooks.once("init", async () => {
  console.log(`${MODULE_ID} | init`);
  registerStatusEffects();   // ← add this line

  if (!Handlebars.helpers.eq) {
    Handlebars.registerHelper("eq", (a, b) => a === b);
  }
  // ... rest of init unchanged
```

- [ ] **Step 6: Run full test suite**

```bash
npm run test:js
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add scripts/setup/status-effects.mjs scripts/kaihou.mjs tests/setup/status-effects.test.mjs
git commit -m "feat(status-effects): wire 12 kaihou condition icons into CONFIG.statusEffects"
```

---

## Task 5: Occupation dialog V1 → DialogV2

**Files:**
- Modify: `scripts/grants/occupation-apply.mjs`
- Create: `tests/grants/occupation-apply.test.mjs`

- [ ] **Step 1: Export `renderOccupationSelectionContent` for testability**

In `scripts/grants/occupation-apply.mjs`, change the function declaration from:

```js
function renderOccupationSelectionContent({ classSkillOptions, skillSelectCount, featOptions, techniqueOptions }) {
```

to:

```js
export function renderOccupationSelectionContent({ classSkillOptions, skillSelectCount, featOptions, techniqueOptions }) {
```

No other changes yet.

- [ ] **Step 2: Write the failing tests**

Create `tests/grants/occupation-apply.test.mjs`:

```js
import { describe, it, expect } from "vitest";
import { renderOccupationSelectionContent } from "../../scripts/grants/occupation-apply.mjs";

describe("renderOccupationSelectionContent", () => {
  it("renders skill checkboxes for each class skill option", () => {
    const html = renderOccupationSelectionContent({
      classSkillOptions: [{ key: "skl", label: "Stealth" }],
      skillSelectCount: 1,
      featOptions: [],
      techniqueOptions: [],
    });
    expect(html).toContain('name="classSkill"');
    expect(html).toContain('value="skl"');
    expect(html).toContain("Stealth");
    expect(html).toContain("Select exactly 1");
  });

  it("renders feat radio buttons for multiple options", () => {
    const html = renderOccupationSelectionContent({
      classSkillOptions: [],
      skillSelectCount: 0,
      featOptions: ["Iron Will", "Combat Expertise"],
      techniqueOptions: [],
    });
    expect(html).toContain('name="featOption"');
    expect(html).toContain("Iron Will");
    expect(html).toContain("Combat Expertise");
  });

  it("renders technique radio buttons for multiple options", () => {
    const html = renderOccupationSelectionContent({
      classSkillOptions: [],
      skillSelectCount: 0,
      featOptions: [],
      techniqueOptions: ["Bunshin no Jutsu", "Kawarimi no Jutsu"],
    });
    expect(html).toContain('name="techniqueOption"');
    expect(html).toContain("Bunshin no Jutsu");
  });

  it("omits sections when no options exist", () => {
    const html = renderOccupationSelectionContent({
      classSkillOptions: [],
      skillSelectCount: 0,
      featOptions: [],
      techniqueOptions: [],
    });
    expect(html).not.toContain('name="classSkill"');
    expect(html).not.toContain('name="featOption"');
    expect(html).not.toContain('name="techniqueOption"');
  });

  it("wraps output in .kaihou-occupation-selector form", () => {
    const html = renderOccupationSelectionContent({
      classSkillOptions: [],
      skillSelectCount: 0,
      featOptions: ["Iron Will"],
      techniqueOptions: [],
    });
    expect(html).toContain("kaihou-occupation-selector");
  });

  it("escapes HTML in option labels", () => {
    const html = renderOccupationSelectionContent({
      classSkillOptions: [{ key: "x", label: '<script>alert(1)</script>' }],
      skillSelectCount: 1,
      featOptions: [],
      techniqueOptions: [],
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
```

- [ ] **Step 3: Run tests to verify they pass (function already exists)**

```bash
npm run test:js
```

Expected: all 6 `renderOccupationSelectionContent` tests PASS (the function logic is unchanged; only the export was added).

- [ ] **Step 4: Migrate `promptOccupationSelections` to DialogV2**

In `scripts/grants/occupation-apply.mjs`, replace the entire `promptOccupationSelections` function (lines ~213–263):

```js
async function promptOccupationSelections(
  occupationItem,
  { classSkillOptions, skillSelectCount, featOptions, techniqueOptions },
) {
  const content = renderOccupationSelectionContent({
    classSkillOptions,
    skillSelectCount,
    featOptions,
    techniqueOptions,
  });

  const result = await foundry.applications.api.DialogV2.wait({
    window: { title: `${occupationItem.name}: Select Occupation Grants` },
    content,
    buttons: [
      {
        action: "apply",
        label: "Apply",
        default: true,
        callback: (_event, _button, dialog) => {
          const root =
            dialog.element.querySelector(".kaihou-occupation-selector") ?? dialog.element;
          const selectedSkillKeys = [
            ...root.querySelectorAll("input[name='classSkill']:checked"),
          ].map((input) => input.value);
          const selectedFeat =
            root.querySelector("input[name='featOption']:checked")?.value ?? null;
          const selectedTechnique =
            root.querySelector("input[name='techniqueOption']:checked")?.value ?? null;
          return {
            classSkillKeys: selectedSkillKeys,
            featName: selectedFeat ?? featOptions[0] ?? null,
            techniqueName: selectedTechnique ?? techniqueOptions[0] ?? null,
          };
        },
      },
      {
        action: "cancel",
        label: "Cancel",
        callback: () => null,
      },
    ],
    render: (_event, html) => {
      wireOccupationDialogConstraints(html, {
        skillSelectCount,
        requireFeat: featOptions.length > 1,
        requireTechnique: techniqueOptions.length > 1,
      });
    },
    rejectClose: false,
  });

  return result ?? null;
}
```

- [ ] **Step 5: Update `wireOccupationDialogConstraints` button selector**

In `wireOccupationDialogConstraints`, replace the `applyButton` lookup:

```js
// Before (V1 — uses .app and data-button)
const applyButton =
    root.closest(".app")?.querySelector("button[data-button='apply']") ??
    root.parentElement?.querySelector("button[data-button='apply']");

// After (V2 — uses .application and data-action)
const applyButton =
    root.closest(".application")?.querySelector("button[data-action='apply']") ??
    root.parentElement?.querySelector("button[data-action='apply']");
```

- [ ] **Step 6: Run tests**

```bash
npm run test:js
```

Expected: all tests pass (the migrated function is not testable in unit tests; the HTML tests still pass).

- [ ] **Step 7: Commit**

```bash
git add scripts/grants/occupation-apply.mjs tests/grants/occupation-apply.test.mjs
git commit -m "feat(occupation-dialog): migrate V1 Dialog to DialogV2; export renderOccupationSelectionContent"
```

---

## Task 6: Target icon

**Files:**
- Modify: `scss/theme/_ui.scss`

- [ ] **Step 1: Inspect the live Foundry DOM**

Start Foundry locally. Target a token by right-clicking it and selecting "Target". Open DevTools (`F12`), inspect the targeting indicator that appears around/under the token. Note the selector. Common selectors in Foundry v13:

```
.token-targeting          (canvas layer element)
.target-indicator         (SVG element on canvas)
[data-action="target"]    (HUD button)
```

The token HUD target button is at:
```html
<div class="control-icon" data-action="target">
  <i class="fas fa-bullseye"></i>
</div>
```

- [ ] **Step 2: Add CSS override to `_ui.scss`**

If the target icon is the HUD button's `<i>` element (Font Awesome bullseye), replace it with the SVG via mask. Add this block inside `body.naruto-zen { }` in `scss/theme/_ui.scss`:

```scss
// Token HUD — target action button icon
.token-hud .control-icon[data-action="target"] i {
    display: none;

    &::before {
        content: "";
        display: block;
        width: 1em;
        height: 1em;
        background-color: currentColor;
        mask: url("../../assets/theme/imgs/target-round.svg") no-repeat center / contain;
        -webkit-mask: url("../../assets/theme/imgs/target-round.svg") no-repeat center / contain;
    }
}
```

If the targeting ring on the canvas token is what needs changing (SVG circle drawn by PIXI), it cannot be overridden via CSS — skip this step and note it for a future JS implementation.

- [ ] **Step 3: Build CSS and verify**

```bash
npm run build:css
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add scss/theme/_ui.scss styles/theme/zen.css
git commit -m "feat(ui): wire target-round.svg to token HUD target icon"
```

---

## Task 7: Final build + compendium audit

**Files:**
- Possibly modify: `scss/theme/_naruto-module.scss` (if audit finds gaps)

- [ ] **Step 1: Run the CSS freshness check**

```bash
npm run test:css-fresh
```

Expected: exits 0 (CSS is up to date, git diff is clean for `styles/`).

- [ ] **Step 2: Run full test suite**

```bash
npm run test:js
```

Expected: all tests pass.

- [ ] **Step 3: Open Foundry and audit each surface**

Start Foundry locally (`http://localhost:30000`). Check each surface in order:

| Surface | What to check |
|---|---|
| Chakra tab | 5 learn-checks on one row; icons on filter tabs and card headers; no extra top padding |
| Status effects | Target a test actor; apply "Prone" and "Stunned" conditions; verify kaihou icons appear on token |
| Occupation dialog | Drag an occupation item onto a character actor; verify the picker dialog appears with zen styling |
| Compendium browser | Open each kaihou compendium; verify items show zen theming (ink color, surface background, no raw grey chrome) |
| Token HUD target | Right-click token → target; check the target icon in the HUD |

For any surface that still shows unstyled default Foundry chrome, add targeted CSS to the appropriate existing partial:
- Chakra-related → `scss/theme/_naruto-module.scss`
- Global chrome → `scss/theme/_global.scss` or `scss/theme/_global-appv2.scss`
- PF1e sheet surfaces → `scss/theme/_pf1-sheets.scss`

- [ ] **Step 4: Rebuild after any gap fixes**

```bash
npm run build:css
```

- [ ] **Step 5: Final commit**

```bash
git add -p   # stage only intentional changes
git commit -m "fix(style-audit): close compendium/surface gaps found in live Foundry audit"
```

---

## Completion Checklist

- [ ] All 5 learn-check cards on one row in the chakra tab
- [ ] Discipline icons visible on filter tabs (icon-only chips)
- [ ] Discipline icons visible on learn-check card headers
- [ ] 12 kaihou condition icons wired to `CONFIG.statusEffects`
- [ ] Occupation dialog uses DialogV2 (no deprecation warning in console)
- [ ] Target icon uses `target-round.svg`
- [ ] `npm run test:js` passes
- [ ] `npm run test:css-fresh` passes (CSS not stale)
