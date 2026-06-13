# Kaihou Databook Actor Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace PF1e's stock character sheet with a bespoke, campaign-specific Naruto-databook sheet that re-composes PF1e's own fields (never re-implementing mechanics) and adds a databook header band, two auto-derived radars, natures+void/KKG, and lore panels.

**Architecture:** A thin Foundry sheet class `KaihouCharacterSheet extends pf1.applications.actor.ActorSheetPFCharacter` does only Foundry wiring (register, `getData`, `_renderInner` injection, listeners). All real logic lives in three **pure, Foundry-free, node-testable** modules — `radar.mjs` (polygon math), `view-model.mjs` (actor → view data), `databook-html.mjs` (view data → HTML strings). The look is a new databook token + component SCSS layer, reusing already-vendored L5R5E assets. naruto-d20's chakra-tab injection keeps working because we preserve its anchor selectors.

**Tech Stack:** Foundry VTT v13, PF1e v11.11 (ApplicationV1 sheets), SCSS (compiled by `npm run build:css`), Vitest (node env), jQuery (V1 sheet DOM is jQuery).

---

## Reference facts (verified in codebase — do not re-derive)

- **Extend:** `pf1.applications.actor.ActorSheetPFCharacter` (base `ActorSheetPF`). naruto-d20 monkey-patches `ActorSheetPF.prototype._renderInner` (`naruto-d20/scripts/ui/render-patch.mjs:98`) to append the chakra `<a data-tab="chakra">` into `nav.sheet-navigation.tabs[data-group='primary']` and a panel into `section.primary-body`. **Our rendered DOM MUST keep both selectors.**
- **Render flow (V1):** `getData()` (async) → `_renderInner(data)` returns a **jQuery** object. Our subclass `_renderInner` calls `super._renderInner(...)` (which runs PF1e + naruto-d20 chakra injection), then injects databook nodes.
- **Ability data:** `actor.system.abilities.{str,dex,con,int,wis,cha}.total` (number).
- **Discipline skills:** `actor.system.skills.{nin,fui,ckc,tai,gnj}.rank` (number). Source map: `naruto-d20/scripts/data/skills.mjs` `NARUTO_SKILLS`.
- **Natures:** `actor.flags["naruto-d20"].chakra.nature = { primary: "<element>", secondary: ["<element>", …] }` (element strings, match case-insensitively to fire/water/wind/earth/lightning).
- **Advanced/KKG nature:** no clean naruto-d20 getter yet → interim Kaihou flag `flags["naruto-d20-kaihou"].advancedNature = { kanji, label }` (coordination item to upstream later).
- **Module entry:** `scripts/kaihou.mjs` — register settings/sheet in its `Hooks.once("init")`; it already injects the 20Q bio grid via a generic `renderActorSheet` hook (keep — still fires for our sheet).
- **Build:** `npm run build:css` compiles `scss/kaihou.scss` → `styles/theme/zen.css`. After any SCSS change, rebuild and commit `styles/` or `test:css-fresh` fails.
- **Tests:** `npm run test:js` (vitest). CSS scoping guard: `tests/theme/css-scoping.test.mjs`.
- **Vendored assets:** fonts in `assets/theme/fonts/` (incl. `RotisSemiSansStd.otf`, `RotisSemiSerifStd.otf`); icons in `assets/theme/icons/{natures,rings,villages,techs}/`.

## File structure

**Create:**
- `scripts/sheets/radar.mjs` — pure radar polygon math.
- `scripts/sheets/view-model.mjs` — pure actor→view-model builder.
- `scripts/sheets/databook-html.mjs` — pure HTML-string builders (header band, radar SVG, natures, mission record, lore panels).
- `scripts/sheets/kaihou-character-sheet.mjs` — Foundry sheet class + registration (the only Foundry-touching file).
- `scss/_databook-tokens.scss` — databook design tokens (`--db-*`).
- `scss/components/_databook.scss` — databook component primitives (`.db-band`, `.db-badge`, `.db-pip`, `.db-radar`, `.db-panel`, `.db-nat`).
- `scss/theme/_kaihou-character-sheet.scss` — the bespoke-sheet surface rules.
- `tests/sheets/radar.test.mjs`, `tests/sheets/view-model.test.mjs`, `tests/sheets/databook-html.test.mjs` — vitest.
- `tests/theme/databook.test.mjs` — compiled-CSS scoping/token guard.
- `docs/cross-module-contract.md` — the seam doc to hand the friend.

**Modify:**
- `scripts/kaihou.mjs` — import + register the sheet and its world setting in `init`.
- `scss/kaihou.scss` — `@use` databook tokens, `@forward`/`@import` databook component + sheet partials.
- `scss/components/_index.scss` — `@forward "databook"`.
- `lang/en.json`, `lang/pt-BR.json` — setting + sheet label strings.
- `module.json`, `package.json`, `CHANGELOG.md` — version bump at the end.

---

## Task 1: Databook design tokens

**Files:**
- Create: `scss/_databook-tokens.scss`
- Modify: `scss/kaihou.scss`
- Test: `tests/theme/databook.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// tests/theme/databook.test.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, it, expect } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(resolve(here, "../../styles/theme/zen.css"), "utf8");

function selectorTexts(src) {
  const out = [];
  const re = /([^{}]+)\{/g;
  let m;
  while ((m = re.exec(src)) !== null) out.push(m[1].trim());
  return out;
}

describe("databook tokens", () => {
  it("publishes the core --db-* tokens", () => {
    for (const t of ["--db-red", "--db-ink", "--db-cream", "--db-panel", "--db-void"]) {
      expect(css).toContain(t);
    }
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm run build:css --silent && npx vitest run tests/theme/databook.test.mjs`
Expected: FAIL — `--db-red` not found in compiled CSS.

- [ ] **Step 3: Create the tokens partial**

```scss
// scss/_databook-tokens.scss
//
// Databook design tokens (--db-*). Global on :root so the sheet resolves them
// regardless of theme-enabled state. The databook palette is the module's
// forward visual language (spec 2026-06-13 §10). Authored databook-native;
// fonts reuse already-vendored Rotis faces (L5R5E asset reuse, soft pref).

:root {
  // Palette
  --db-red: #b23a2e;          // registry red / accent
  --db-red-deep: #8a2b22;
  --db-ink: #2e271d;          // primary text
  --db-cream: #efe9d8;        // page
  --db-panel: #f4efe0;        // raised panel
  --db-border: #cdbf99;
  --db-border-soft: #ddd0ab;
  --db-muted: #8a7c5c;        // labels / secondary
  --db-void: #6a3d8f;         // Kekkei Genkai / void slot

  // Typography (Rotis = vendored; system sans/serif fallbacks)
  --db-font-name: "RotisSemiSans", "Trebuchet MS", system-ui, sans-serif;
  --db-font-label: "RotisSemiSans", system-ui, sans-serif;
  --db-font-body: "RotisSemiSerif", "Hiroshige", Georgia, serif;

  // Radar
  --db-radar-grid: #cbbd97;
  --db-radar-ability-fill: rgba(178, 58, 46, 0.26);
  --db-radar-ability-stroke: #b23a2e;
  --db-radar-discipline-fill: rgba(106, 61, 143, 0.20);
  --db-radar-discipline-stroke: #6a3d8f;
}
```

- [ ] **Step 4: Wire it into the entry point**

In `scss/kaihou.scss`, add directly under `@use "tokens";` (line ~21):

```scss
@use "tokens";
@use "databook-tokens";
```

- [ ] **Step 5: Run test, verify it passes**

Run: `npm run build:css --silent && npx vitest run tests/theme/databook.test.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scss/_databook-tokens.scss scss/kaihou.scss styles/theme/zen.css tests/theme/databook.test.mjs
git commit -m "feat(sheet): databook design tokens (--db-*)"
```

---

## Task 2: Databook component primitives (SCSS)

**Files:**
- Create: `scss/components/_databook.scss`
- Modify: `scss/components/_index.scss`
- Test: `tests/theme/databook.test.mjs` (extend)

- [ ] **Step 1: Add the failing assertions**

Append a `describe` block to `tests/theme/databook.test.mjs`:

```js
describe("databook component classes", () => {
  it("emits the component primitives", () => {
    for (const c of [".db-band", ".db-badge", ".db-pip", ".db-radar", ".db-panel", ".db-nat"]) {
      expect(css).toContain(c);
    }
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm run build:css --silent && npx vitest run tests/theme/databook.test.mjs`
Expected: FAIL — `.db-band` not in CSS.

- [ ] **Step 3: Create the component partial**

```scss
// scss/components/_databook.scss
//
// Databook component primitives. Theme-agnostic class names (.db-*) consumed by
// the bespoke character sheet. Visual identity authored databook-native.

.db-band {
  display: flex;
  gap: var(--zen-space-3);
  padding: var(--zen-space-3) var(--zen-space-4);
  background: var(--db-panel);
  border-bottom: 2px solid var(--db-red);
}

.db-band__port {
  width: 96px;
  height: 120px;
  flex: 0 0 auto;
  border: 2px solid var(--db-ink);
  border-radius: 2px;
  object-fit: cover;
  background: #ded2b2;
}

.db-band__name {
  font-family: var(--db-font-name);
  font-size: var(--zen-text-2xl);
  font-weight: 800;
  line-height: 1.05;
  color: var(--db-ink);
}

.db-band__kanji { font-size: var(--zen-text-sm); letter-spacing: 0.12em; color: var(--db-muted); }
.db-band__alias { font-style: italic; color: var(--db-red); }
.db-band__alias::before { content: "「"; }
.db-band__alias::after { content: "」"; }

.db-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-family: var(--db-font-label);
  font-size: var(--zen-text-xs);
  background: #e7dcbf;
  border: 1px solid var(--db-border);
  border-radius: var(--zen-radius-sm);
}
.db-badge--rank { background: var(--db-red); color: #fff; border-color: var(--db-red); font-weight: 700; }
.db-badge--allegiance { background: var(--db-ink); color: var(--db-cream); border-color: var(--db-ink); }

.db-pip {
  min-width: 66px;
  padding: 3px 9px;
  text-align: center;
  background: #e7dcbf;
  border: 1px solid var(--db-border);
  border-radius: var(--zen-radius-sm);
}
.db-pip b { display: block; font-size: var(--zen-text-lg); }
.db-pip small { font-size: var(--zen-text-xs); text-transform: uppercase; letter-spacing: 0.05em; color: var(--db-muted); }

.db-nat {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--db-border);
  border-radius: var(--zen-radius-round);
  background: #efe6cf;
}
.db-nat--on { border-color: var(--db-ink); background: #fff7e6; }
.db-nat--void { border: 3px double var(--db-void); color: var(--db-void); font-weight: 700; background: #f0e9f5; }
.db-nat--void.db-nat--locked { border-color: var(--db-border); color: var(--db-border); background: var(--db-cream); }

.db-panel {
  padding: var(--zen-space-2);
  background: var(--db-panel);
  border: 1px solid var(--db-border);
  border-radius: var(--zen-radius-sm);
}
.db-panel__h {
  margin: 0 0 var(--zen-space-1);
  padding-bottom: 3px;
  font-family: var(--db-font-label);
  font-size: var(--zen-text-xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--db-red);
  border-bottom: 1px solid var(--db-border-soft);
}

.db-radar { width: 100%; max-width: 185px; display: block; margin: 0 auto; }
.db-radar__grid { fill: none; stroke: var(--db-radar-grid); stroke-width: 1; }
.db-radar__axis { font-size: 7.5px; fill: #5a4d36; font-family: var(--db-font-label); }
.db-radar__plot--ability { fill: var(--db-radar-ability-fill); stroke: var(--db-radar-ability-stroke); stroke-width: 1.5; }
.db-radar__plot--discipline { fill: var(--db-radar-discipline-fill); stroke: var(--db-radar-discipline-stroke); stroke-width: 1.5; }
```

- [ ] **Step 4: Forward the partial**

In `scss/components/_index.scss`, add after the existing `@forward` lines:

```scss
@forward "databook";
```

- [ ] **Step 5: Run test, verify it passes**

Run: `npm run build:css --silent && npx vitest run tests/theme/databook.test.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scss/components/_databook.scss scss/components/_index.scss styles/theme/zen.css tests/theme/databook.test.mjs
git commit -m "feat(sheet): databook component primitives (.db-*)"
```

---

## Task 3: Radar polygon math (pure module)

**Files:**
- Create: `scripts/sheets/radar.mjs`
- Test: `tests/sheets/radar.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// tests/sheets/radar.test.mjs
import { describe, it, expect } from "vitest";
import { axisPoints, valuePoints, pointsAttr } from "../../scripts/sheets/radar.mjs";

describe("axisPoints", () => {
  it("places the first axis at top and spaces the rest evenly", () => {
    const p = axisPoints(4, 100, 100, 70); // square: top, right, bottom, left
    expect(p[0]).toEqual({ x: 100, y: 30 });
    expect(p[1].x).toBeCloseTo(170);
    expect(p[1].y).toBeCloseTo(100);
    expect(p[2]).toMatchObject({ x: expect.closeTo(100, 5), y: expect.closeTo(170, 5) });
  });
});

describe("valuePoints", () => {
  it("scales value/max to radius and clamps out-of-range to the rim/centre", () => {
    const [full, over, zero] = valuePoints([5, 99, 0], 5, 100, 100, 70);
    expect(full).toEqual({ x: 100, y: 30 });           // 5/5 → full radius (top)
    expect(over.y).toBeCloseTo(30 + 240, 5);           // index 1 (bottom-right area), clamped to max radius
    expect(zero).toMatchObject({ x: expect.closeTo(100, 5), y: expect.closeTo(100, 5) }); // 0 → centre
  });

  it("treats NaN / non-numeric as 0 (centre), never NaN coords", () => {
    const [p] = valuePoints([NaN], 5, 100, 100, 70);
    expect(Number.isFinite(p.x)).toBe(true);
    expect(p).toMatchObject({ x: 100, y: 100 });
  });

  it("returns centre for all axes when max is 0", () => {
    const pts = valuePoints([3, 4], 0, 100, 100, 70);
    expect(pts.every((p) => p.x === 100 && p.y === 100)).toBe(true);
  });
});

describe("pointsAttr", () => {
  it("formats an SVG points string, rounded to 2dp", () => {
    expect(pointsAttr([{ x: 1.234, y: 5.678 }, { x: 9, y: 10 }])).toBe("1.23,5.68 9,10");
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run tests/sheets/radar.test.mjs`
Expected: FAIL — cannot find module `radar.mjs`.

- [ ] **Step 3: Implement the module**

```js
// scripts/sheets/radar.mjs
//
// Pure radar-polygon geometry. No Foundry globals — unit-tested in node.
// Axis 0 sits at the top (-90°); axes advance clockwise, evenly spaced.

function pointAt(angleDeg, radius, cx, cy) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) };
}

/** N evenly-spaced points on the rim (for grid outlines / axis ends). */
export function axisPoints(count, cx, cy, r, startAngleDeg = -90) {
  const step = 360 / count;
  return Array.from({ length: count }, (_, i) => pointAt(startAngleDeg + i * step, r, cx, cy));
}

/** One point per value, radius scaled by clamp(value,0,max)/max. */
export function valuePoints(values, max, cx, cy, r, startAngleDeg = -90) {
  const step = 360 / values.length;
  return values.map((v, i) => {
    const n = Number(v);
    const safe = Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : 0;
    const radius = max > 0 ? (safe / max) * r : 0;
    return pointAt(startAngleDeg + i * step, radius, cx, cy);
  });
}

const round2 = (n) => Math.round(n * 100) / 100;

/** "x,y x,y …" for an SVG <polygon points>. */
export function pointsAttr(points) {
  return points.map((p) => `${round2(p.x)},${round2(p.y)}`).join(" ");
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npx vitest run tests/sheets/radar.test.mjs`
Expected: PASS (all 5).

- [ ] **Step 5: Commit**

```bash
git add scripts/sheets/radar.mjs tests/sheets/radar.test.mjs
git commit -m "feat(sheet): pure radar polygon math"
```

---

## Task 4: View-model builder (pure module)

**Files:**
- Create: `scripts/sheets/view-model.mjs`
- Test: `tests/sheets/view-model.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// tests/sheets/view-model.test.mjs
import { describe, it, expect } from "vitest";
import { buildKaihouViewModel, ABILITY_AXES, DISCIPLINE_AXES, MISSION_RANKS } from "../../scripts/sheets/view-model.mjs";

const actor = {
  system: {
    abilities: { str: { total: 16 }, dex: { total: 14 }, con: { total: 15 }, int: { total: 13 }, wis: { total: 12 }, cha: { total: 17 } },
    skills: { nin: { rank: 8 }, fui: { rank: 5 }, ckc: { rank: 9 }, tai: { rank: 6 }, gnj: { rank: 7 } },
  },
  flags: {
    "naruto-d20": { chakra: { nature: { primary: "Fire", secondary: ["Lightning"] } } },
    "naruto-d20-kaihou": {
      alias: "Crimson Mirage",
      allegiance: "13th Tantō",
      missions: { D: 0, C: 24, B: 11, A: 5, S: 1 },
      advancedNature: { kanji: "木", label: "Mokuton" },
    },
  },
};

describe("buildKaihouViewModel", () => {
  it("maps identity, missions (with derived total), and KKG nature", () => {
    const vm = buildKaihouViewModel(actor);
    expect(vm.identity.alias).toBe("Crimson Mirage");
    expect(vm.identity.allegiance).toBe("13th Tantō");
    expect(vm.identity.missions.counts.C).toBe(24);
    expect(vm.identity.missions.total).toBe(41);
    expect(vm.natures.advanced).toEqual({ kanji: "木", label: "Mokuton" });
  });

  it("builds 6 ability axes and 5 discipline axes in fixed order from live data", () => {
    const vm = buildKaihouViewModel(actor);
    expect(vm.radars.abilities.map((a) => a.key)).toEqual(ABILITY_AXES);
    expect(vm.radars.abilities[0]).toMatchObject({ key: "str", value: 16 });
    expect(vm.radars.disciplines.map((d) => d.key)).toEqual(DISCIPLINE_AXES.map((d) => d.key));
    expect(vm.radars.disciplines[0]).toMatchObject({ key: "nin", label: "Ninjutsu", value: 8 });
  });

  it("flags only owned basic natures, case-insensitively", () => {
    const vm = buildKaihouViewModel(actor);
    const on = vm.natures.basic.filter((n) => n.on).map((n) => n.key);
    expect(on.sort()).toEqual(["fire", "lightning"]);
  });

  it("never throws on an empty actor and yields zeroed, safe defaults", () => {
    const vm = buildKaihouViewModel({});
    expect(vm.identity.missions.total).toBe(0);
    expect(vm.identity.alias).toBe("");
    expect(vm.radars.abilities).toHaveLength(ABILITY_AXES.length);
    expect(vm.radars.abilities.every((a) => a.value === 0)).toBe(true);
    expect(vm.natures.advanced).toBeNull();
    expect(MISSION_RANKS).toHaveLength(5);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run tests/sheets/view-model.test.mjs`
Expected: FAIL — cannot find module `view-model.mjs`.

- [ ] **Step 3: Implement the module**

```js
// scripts/sheets/view-model.mjs
//
// Pure actor → databook view-model. No Foundry globals — unit-tested in node.
// Reads PF1e ability/skill data + naruto-d20 nature flags + Kaihou lore flags;
// writes nothing.

const ND = "naruto-d20";
const KH = "naruto-d20-kaihou";

export const ABILITY_AXES = ["str", "dex", "con", "int", "wis", "cha"];

export const DISCIPLINE_AXES = [
  { key: "nin", label: "Ninjutsu" },
  { key: "fui", label: "Fūinjutsu" },
  { key: "ckc", label: "Chakra Control" },
  { key: "tai", label: "Taijutsu" },
  { key: "gnj", label: "Genjutsu" },
];

export const BASIC_NATURES = [
  { key: "fire", kanji: "火" },
  { key: "water", kanji: "水" },
  { key: "wind", kanji: "風" },
  { key: "earth", kanji: "土" },
  { key: "lightning", kanji: "雷" },
];

export const MISSION_RANKS = ["D", "C", "B", "A", "S"];

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const int = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
};

function buildMissions(m = {}) {
  const counts = Object.fromEntries(MISSION_RANKS.map((r) => [r, int(m?.[r])]));
  const total = MISSION_RANKS.reduce((s, r) => s + counts[r], 0);
  return { counts, total };
}

function buildNatures(nd = {}, kh = {}) {
  const nature = nd?.chakra?.nature ?? {};
  const owned = new Set(
    [nature.primary, ...(Array.isArray(nature.secondary) ? nature.secondary : [])]
      .filter(Boolean)
      .map((s) => String(s).toLowerCase()),
  );
  const basic = BASIC_NATURES.map((n) => ({ ...n, on: owned.has(n.key) }));
  const adv = kh?.advancedNature ?? null;
  return { basic, advanced: adv && adv.kanji ? { kanji: adv.kanji, label: adv.label ?? "" } : null };
}

export function buildKaihouViewModel(actor) {
  const sys = actor?.system ?? {};
  const flags = actor?.flags ?? {};
  const kh = flags[KH] ?? {};
  const nd = flags[ND] ?? {};
  return {
    identity: {
      alias: kh.alias ?? "",
      allegiance: kh.allegiance ?? "",
      missions: buildMissions(kh.missions),
    },
    radars: {
      abilities: ABILITY_AXES.map((k) => ({ key: k, label: k.toUpperCase(), value: num(sys.abilities?.[k]?.total) })),
      disciplines: DISCIPLINE_AXES.map((a) => ({ ...a, value: num(sys.skills?.[a.key]?.rank) })),
    },
    natures: buildNatures(nd, kh),
  };
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npx vitest run tests/sheets/view-model.test.mjs`
Expected: PASS (all 4).

- [ ] **Step 5: Commit**

```bash
git add scripts/sheets/view-model.mjs tests/sheets/view-model.test.mjs
git commit -m "feat(sheet): pure actor->databook view-model builder"
```

---

## Task 5: HTML-string builders (pure module)

**Files:**
- Create: `scripts/sheets/databook-html.mjs`
- Test: `tests/sheets/databook-html.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// tests/sheets/databook-html.test.mjs
import { describe, it, expect } from "vitest";
import { radarSvg, naturesRow, missionRecord, headerBand } from "../../scripts/sheets/databook-html.mjs";
import { buildKaihouViewModel } from "../../scripts/sheets/view-model.mjs";

const vm = buildKaihouViewModel({
  system: {
    abilities: { str: { total: 16 }, dex: { total: 14 }, con: { total: 15 }, int: { total: 13 }, wis: { total: 12 }, cha: { total: 17 } },
    skills: { nin: { rank: 8 }, fui: { rank: 5 }, ckc: { rank: 9 }, tai: { rank: 6 }, gnj: { rank: 7 } },
  },
  flags: {
    "naruto-d20": { chakra: { nature: { primary: "Fire", secondary: ["Lightning"] } } },
    "naruto-d20-kaihou": { alias: "Crimson Mirage", allegiance: "13th Tantō", missions: { C: 24, B: 11, A: 5, S: 1 }, advancedNature: { kanji: "木", label: "Mokuton" } },
  },
});

describe("radarSvg", () => {
  it("renders one polygon plot + N axis labels with the variant class", () => {
    const svg = radarSvg(vm.radars.abilities, { max: 20, variant: "ability" });
    expect(svg).toContain("db-radar__plot--ability");
    expect(svg).toContain(">STR<");
    expect((svg.match(/db-radar__axis/g) || []).length).toBe(6);
    expect(svg).not.toContain("NaN");
  });
});

describe("naturesRow", () => {
  it("marks owned natures --on and renders the void slot when KKG present", () => {
    const html = naturesRow(vm.natures);
    expect(html).toContain("db-nat--void");
    expect(html).toContain("木");
    expect((html.match(/db-nat--on/g) || []).length).toBe(2); // fire + lightning
  });
  it("locks the void slot when no advanced nature", () => {
    const html = naturesRow({ basic: vm.natures.basic, advanced: null });
    expect(html).toContain("db-nat--locked");
  });
});

describe("missionRecord & headerBand", () => {
  it("renders all five rank cells + total and escapes identity text", () => {
    expect(missionRecord(vm.identity.missions)).toContain(">41<");
    const band = headerBand(vm, { name: "Uchiha <b>Takeshi</b>", img: "p.png", village: "Konoha", rank: "Chūnin" });
    expect(band).toContain("Crimson Mirage");
    expect(band).toContain("13th Tantō");
    expect(band).toContain("Uchiha &lt;b&gt;Takeshi&lt;/b&gt;"); // escaped, no raw tag injection
    expect(band).not.toContain("<b>Takeshi</b>");
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run tests/sheets/databook-html.test.mjs`
Expected: FAIL — cannot find module `databook-html.mjs`.

- [ ] **Step 3: Implement the module**

```js
// scripts/sheets/databook-html.mjs
//
// Pure HTML-string builders for the databook sheet. No Foundry globals — the
// SVG/markup is produced from the view-model and injected by the sheet class.
// All caller-supplied text is escaped here.

import { axisPoints, valuePoints, pointsAttr } from "./radar.mjs";

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

const C = 100; // svg centre
const R = 70;  // svg max radius

function gridRings(count) {
  const outer = pointsAttr(axisPoints(count, C, C, R));
  const inner = pointsAttr(axisPoints(count, C, C, R / 2));
  return `<polygon class="db-radar__grid" points="${outer}"/><polygon class="db-radar__grid" points="${inner}"/>`;
}

function axisLabels(axes) {
  const ends = axisPoints(axes.length, C, C, R + 14);
  return axes
    .map((a, i) => {
      const p = ends[i];
      const anchor = p.x < C - 1 ? "end" : p.x > C + 1 ? "start" : "middle";
      return `<text class="db-radar__axis" x="${Math.round(p.x)}" y="${Math.round(p.y)}" text-anchor="${anchor}">${esc(a.label)}</text>`;
    })
    .join("");
}

/** axes: [{label,value}]; opts: {max, variant:"ability"|"discipline"}. */
export function radarSvg(axes, { max, variant }) {
  const plot = pointsAttr(valuePoints(axes.map((a) => a.value), max, C, C, R));
  return [
    `<svg class="db-radar" viewBox="0 0 200 210" role="img" aria-label="${esc(variant)} radar">`,
    gridRings(axes.length),
    `<polygon class="db-radar__plot--${esc(variant)}" points="${plot}"/>`,
    axisLabels(axes),
    `</svg>`,
  ].join("");
}

export function naturesRow(natures) {
  const basic = natures.basic
    .map((n) => `<span class="db-nat${n.on ? " db-nat--on" : ""}" title="${esc(n.key)}">${esc(n.kanji)}</span>`)
    .join("");
  const adv = natures.advanced;
  const voidSlot = adv
    ? `<span class="db-nat db-nat--void" title="${esc(adv.label)}">${esc(adv.kanji)}</span>`
    : `<span class="db-nat db-nat--void db-nat--locked" title="No Kekkei Genkai">—</span>`;
  return `<div class="db-natures"><span class="db-natures__lbl">Natures</span>${basic}<span class="db-natures__lbl">KKG</span>${voidSlot}</div>`;
}

export function missionRecord(missions) {
  const cells = ["D", "C", "B", "A", "S"]
    .map((r) => `<div><b>${missions.counts[r] || 0}</b><small>${r}</small></div>`)
    .join("");
  return `<div class="db-panel"><h4 class="db-panel__h">Mission Record</h4><div class="db-missions">${cells}<div><b>${missions.total}</b><small>Total</small></div></div></div>`;
}

/** vm = view-model; meta = {name,img,village,rank} pulled from the actor by the sheet. */
export function headerBand(vm, meta) {
  const { alias, allegiance } = vm.identity;
  const badges = [
    meta.village ? `<span class="db-badge">${esc(meta.village)}</span>` : "",
    meta.rank ? `<span class="db-badge db-badge--rank">${esc(meta.rank)}</span>` : "",
    allegiance ? `<span class="db-badge db-badge--allegiance">⚔ ${esc(allegiance)}</span>` : "",
  ].join("");
  return [
    `<header class="db-band">`,
    `<img class="db-band__port" src="${esc(meta.img)}" alt="">`,
    `<div class="db-band__id">`,
    `<div class="db-band__name">${esc(meta.name)}</div>`,
    alias ? `<div class="db-band__alias">${esc(alias)}</div>` : "",
    `<div class="db-band__badges">${badges}</div>`,
    naturesRow(vm.natures),
    `</div>`,
    `</header>`,
  ].join("");
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npx vitest run tests/sheets/databook-html.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/sheets/databook-html.mjs tests/sheets/databook-html.test.mjs
git commit -m "feat(sheet): pure databook HTML-string builders"
```

---

## Task 6: Sheet class + registration (Foundry — opens & selectable)

**Files:**
- Create: `scripts/sheets/kaihou-character-sheet.mjs`
- Modify: `scripts/kaihou.mjs`, `lang/en.json`, `lang/pt-BR.json`

> Foundry-touching code is verified manually in the running game, not by vitest. Each manual step lists exactly what to check.

- [ ] **Step 1: Create the sheet class (getData only, no injection yet)**

```js
// scripts/sheets/kaihou-character-sheet.mjs
//
// Bespoke campaign character sheet. Extends PF1e's character sheet so ALL
// mechanics (rolls, items, listeners) — and naruto-d20's chakra-tab prototype
// patch — are inherited. We only ADD: a view-model in getData and databook DOM
// in _renderInner (Task 7+). Anchor selectors (nav.sheet-navigation.tabs,
// section.primary-body) are never removed, so the chakra tab keeps injecting.

import { buildKaihouViewModel } from "./view-model.mjs";

export const MODULE_ID = "naruto-d20-kaihou";

export function getKaihouCharacterSheetClass() {
  const Base = pf1?.applications?.actor?.ActorSheetPFCharacter;
  if (!Base) {
    console.error(`${MODULE_ID} | pf1 ActorSheetPFCharacter not found — sheet not registered`);
    return null;
  }

  return class KaihouCharacterSheet extends Base {
    static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
        classes: [...super.defaultOptions.classes, "kaihou-databook"],
      });
    }

    async getData(options) {
      const data = await super.getData(options);
      try {
        data.kaihou = buildKaihouViewModel(this.actor);
      } catch (e) {
        console.error(`${MODULE_ID} | view-model build failed`, e);
        data.kaihou = null;
      }
      return data;
    }
  };
}

export function registerKaihouCharacterSheet() {
  const cls = getKaihouCharacterSheetClass();
  if (!cls) return;
  const DSC = foundry.applications?.apps?.DocumentSheetConfig ?? globalThis.DocumentSheetConfig;
  const makeDefault = game.settings.get(MODULE_ID, "kaihouSheetDefault");
  DSC.registerSheet(Actor, MODULE_ID, cls, {
    types: ["character"],
    label: game.i18n.localize("Kaihou.Sheet.Label"),
    makeDefault,
  });
  console.log(`${MODULE_ID} | character sheet registered (default=${makeDefault})`);
}
```

- [ ] **Step 2: Register the setting + sheet in the module entry**

In `scripts/kaihou.mjs`, add the import near the top (after the existing imports):

```js
import { registerKaihouCharacterSheet, MODULE_ID as SHEET_MODULE_ID } from "./sheets/kaihou-character-sheet.mjs";
```

Then inside the existing `Hooks.once("init", …)` callback, before its closing `}`, add:

```js
  game.settings.register(MODULE_ID, "kaihouSheetDefault", {
    name: "Kaihou.Settings.SheetDefault.Name",
    hint: "Kaihou.Settings.SheetDefault.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });
  registerKaihouCharacterSheet();
```

- [ ] **Step 3: Add the language strings**

In `lang/en.json` add:

```json
  "Kaihou.Sheet.Label": "Kaihou — Databook",
  "Kaihou.Settings.SheetDefault.Name": "Kaihou Databook sheet as default",
  "Kaihou.Settings.SheetDefault.Hint": "Use the Kaihou databook character sheet as the default for character actors. Individual actors can still be switched back to PF1e's sheet via their sheet config."
```

In `lang/pt-BR.json` add:

```json
  "Kaihou.Sheet.Label": "Kaihou — Databook",
  "Kaihou.Settings.SheetDefault.Name": "Ficha Databook Kaihou como padrão",
  "Kaihou.Settings.SheetDefault.Hint": "Usar a ficha de personagem databook Kaihou como padrão para atores do tipo personagem. Cada ator ainda pode voltar à ficha do PF1e na configuração de ficha."
```

- [ ] **Step 4: Lint**

Run: `npm run lint:js`
Expected: PASS (no unused vars; if `SHEET_MODULE_ID` is unused, drop it from the import).

- [ ] **Step 5: Manual Foundry verification**

1. In `~/Documents/foundry/`, restart the world (or `Return to Setup` → launch) so the new esmodule loads.
2. Open a **character** actor. Confirm it opens **without console errors** and the window has the `kaihou-databook` class (inspect the outer `.window-app`).
3. Open the actor's **sheet config** (header cog → "Sheet") — confirm "Kaihou — Databook" is listed and selected by default.
4. **Confirm the chakra tab still appears** and the "Sync Techniques" header button still works (proves the prototype patch survived subclassing).
5. In the console, run and **record the exact tab selectors** for Task 7:
   `[...document.querySelector('.kaihou-databook .sheet-navigation.tabs').querySelectorAll('a')].map(a => a.dataset.tab)`
   Expected something like `["summary","attributes","combat","skills","inventory","feats","buffs","biography","chakra"]`. Note the real values — Task 7 selectors depend on them.

- [ ] **Step 6: Commit**

```bash
git add scripts/sheets/kaihou-character-sheet.mjs scripts/kaihou.mjs lang/en.json lang/pt-BR.json
git commit -m "feat(sheet): register KaihouCharacterSheet + world setting"
```

---

## Task 7: Inject the header band + radars (Foundry)

**Files:**
- Modify: `scripts/sheets/kaihou-character-sheet.mjs`

> Uses the tab selectors recorded in Task 5 Step 5. The placeholders below assume PF1e's defaults `summary` / `combat` / `skills`; **substitute the real values you recorded.**

- [ ] **Step 1: Add an injection helper + `_renderInner` override**

Add these imports to the top of `kaihou-character-sheet.mjs`:

```js
import { headerBand, radarSvg, missionRecord } from "./databook-html.mjs";
```

Inside the `KaihouCharacterSheet` class body (after `getData`), add:

```js
    async _renderInner(...args) {
      const $html = await super._renderInner(...args); // PF1e DOM + naruto-d20 chakra injection
      try {
        this._injectDatabook($html, args[0]?.kaihou);
      } catch (e) {
        console.error(`${MODULE_ID} | databook injection failed`, e);
      }
      return $html;
    }

    _injectDatabook($html, vm) {
      if (!vm) return;
      const root = $html[0] ?? $html;

      // 1. Header band — prepend above the tab nav (anchors untouched).
      const nav = root.querySelector("nav.sheet-navigation.tabs[data-group='primary']");
      if (nav && !root.querySelector(".db-band")) {
        const meta = {
          name: this.actor.name,
          img: this.actor.img,
          village: this.actor.flags?.["naruto-d20-kaihou"]?.village ?? "",
          rank: this.actor.flags?.["naruto-d20-kaihou"]?.rank ?? "",
        };
        nav.insertAdjacentHTML("beforebegin", headerBand(vm, meta));
      }

      // 2. Compact radars on the Identity (summary) tab; full radars on Combat/Skills.
      const inject = (tabName, html, mountClass) => {
        const tab = root.querySelector(`.primary-body .tab[data-tab="${tabName}"]`);
        if (tab && !tab.querySelector(`.${mountClass}`)) {
          const mount = document.createElement("div");
          mount.className = mountClass;
          mount.innerHTML = html;
          tab.prepend(mount);
        }
      };

      const ability = radarSvg(vm.radars.abilities, { max: 20, variant: "ability" });
      const discipline = radarSvg(vm.radars.disciplines, { max: 10, variant: "discipline" });

      inject(
        "summary", // ← Identity; replace with recorded value if different
        `<div class="db-frontmatter">
           <div class="db-radars">
             <div class="db-panel"><h4 class="db-panel__h">Ability Scores</h4>${ability}</div>
             <div class="db-panel"><h4 class="db-panel__h">Disciplines</h4>${discipline}</div>
           </div>
           ${missionRecord(vm.identity.missions)}
         </div>`,
        "db-mount-identity",
      );
      inject("combat", `<div class="db-panel"><h4 class="db-panel__h">Ability Scores</h4>${ability}</div>`, "db-mount-combat");
      inject("skills", `<div class="db-panel"><h4 class="db-panel__h">Disciplines</h4>${discipline}</div>`, "db-mount-skills");
    }
```

- [ ] **Step 2: Manual Foundry verification**

1. Reload the world; open a character with known abilities/skills and a nature affinity set in the chakra tab.
2. Confirm the **header band** renders above the tabs with portrait, name, alias (set `flags.naruto-d20-kaihou.alias` via console if empty: `actor.setFlag("naruto-d20-kaihou","alias","Crimson Mirage")`), rank/village badges, and the **natures row** with owned elements highlighted.
3. Open the **Identity/summary** tab → two compact radars + mission record present, polygons match the character's stats, no `NaN`.
4. Open **Combat** → ability radar; **Skills** → discipline radar.
5. Re-render twice (close/open) → **no duplicate** bands/radars (idempotency guard works).
6. Switch the actor to PF1e's stock sheet and back → no errors.

- [ ] **Step 3: Commit**

```bash
git add scripts/sheets/kaihou-character-sheet.mjs
git commit -m "feat(sheet): inject databook header band + dual radars"
```

---

## Task 8: Identity lore panels + mission/identity editing (Foundry)

**Files:**
- Modify: `scripts/sheets/kaihou-character-sheet.mjs`

- [ ] **Step 1: Extend the identity front-matter with an editable Origin/Path + identity panel**

In `_injectDatabook`, replace the `"summary"` `inject(...)` call's HTML with the version below (adds editable alias/allegiance + mission inputs + origin panel). Origin values read from Kaihou lore: village/school/occupation/bloodline/flaw are surfaced from actor items/flags (use what exists; show "—" when absent).

```js
      const originRows = [
        ["Village", this.actor.flags?.["naruto-d20-kaihou"]?.village],
        ["School", this._kaihouItemName("school")],
        ["Occupation", this._kaihouItemName("occupation")],
        ["Bloodline", this._kaihouItemName("bloodline")],
        ["Flaw", this._kaihouItemName("flaw")],
      ]
        .map(([k, v]) => `<div class="db-line"><span>${k}</span><span>${v ? String(v) : "—"}</span></div>`)
        .join("");

      inject(
        "summary",
        `<div class="db-frontmatter">
           <div class="db-identity-edit">
             <label>Alias <input type="text" name="flags.naruto-d20-kaihou.alias" value="${vm.identity.alias}"></label>
             <label>Allegiance <input type="text" name="flags.naruto-d20-kaihou.allegiance" value="${vm.identity.allegiance}"></label>
           </div>
           <div class="db-radars">
             <div class="db-panel"><h4 class="db-panel__h">Ability Scores</h4>${ability}</div>
             <div class="db-panel"><h4 class="db-panel__h">Disciplines</h4>${discipline}</div>
           </div>
           <div class="db-row2">
             ${missionRecord(vm.identity.missions)}
             <div class="db-panel"><h4 class="db-panel__h">Origin &amp; Path</h4>${originRows}</div>
           </div>
         </div>`,
        "db-mount-identity",
      );
```

Add this helper method to the class (returns the first matching Kaihou-grant item's name, else ""):

```js
    _kaihouItemName(kind) {
      const item = this.actor.items?.find?.((i) => i.flags?.["naruto-d20-kaihou"]?.kind === kind);
      return item?.name ?? "";
    }
```

> Note: the alias/allegiance `<input name="flags.naruto-d20-kaihou.…">` fields are saved automatically by PF1e's form `_updateObject` because they live inside the sheet `<form>` and use Foundry's flag-path naming — no custom handler needed. Verify in Step 3.

- [ ] **Step 2: Make mission counts editable (separate inputs)**

In `databook-html.mjs`, change `missionRecord` cells from static `<b>` to inputs bound to flag paths (replace the `cells` map and the total cell):

```js
  const cells = ["D", "C", "B", "A", "S"]
    .map(
      (r) =>
        `<div><input type="number" class="db-mission" name="flags.naruto-d20-kaihou.missions.${r}" value="${missions.counts[r] || 0}" min="0"><small>${r}</small></div>`,
    )
    .join("");
  return `<div class="db-panel"><h4 class="db-panel__h">Mission Record</h4><div class="db-missions">${cells}<div><b>${missions.total}</b><small>Total</small></div></div></div>`;
```

Update the assertion in `tests/sheets/databook-html.test.mjs` `missionRecord` test to match the new markup:

```js
    expect(missionRecord(vm.identity.missions)).toContain('name="flags.naruto-d20-kaihou.missions.C"');
    expect(missionRecord(vm.identity.missions)).toContain(">41<"); // total still rendered
```

- [ ] **Step 3: Run the unit tests + lint**

Run: `npx vitest run tests/sheets/databook-html.test.mjs && npm run lint:js`
Expected: PASS.

- [ ] **Step 4: Manual Foundry verification**

1. Open a character; on Identity, type an **alias** and **allegiance**, change a **mission count**, then close/reopen the sheet → values persisted (read back via `actor.getFlag("naruto-d20-kaihou","alias")`).
2. The **Total** mission cell updates after a re-render.
3. Origin & Path shows the character's village/school/occupation/bloodline/flaw (or "—").

- [ ] **Step 5: Commit**

```bash
git add scripts/sheets/kaihou-character-sheet.mjs scripts/sheets/databook-html.mjs tests/sheets/databook-html.test.mjs
git commit -m "feat(sheet): editable identity + mission record + origin panel"
```

---

## Task 9: Databook sheet surface styling (SCSS)

**Files:**
- Create: `scss/theme/_kaihou-character-sheet.scss`
- Modify: `scss/kaihou.scss`
- Test: `tests/theme/databook.test.mjs` (extend)

- [ ] **Step 1: Add the failing scoping assertion**

Append to `tests/theme/databook.test.mjs`:

```js
describe("kaihou sheet scoping", () => {
  it("scopes every .kaihou-databook rule under body.naruto-zen .naruto-zen-target", () => {
    const offenders = selectorTexts(css)
      .filter((sel) => sel.includes(".kaihou-databook"))
      .filter((sel) =>
        sel.split(",").some(
          (one) => one.includes(".kaihou-databook") && !one.includes(".naruto-zen-target"),
        ),
      );
    expect(offenders).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm run build:css --silent && npx vitest run tests/theme/databook.test.mjs`
Expected: FAIL — no `.kaihou-databook` rules emitted yet (filter empty → passes vacuously?). To make it a real red: first add an UNSCOPED rule to confirm the guard bites, then scope it. Simpler: proceed to Step 3 (scoped partial), then confirm the test passes and add a temporary unscoped rule locally to confirm it fails, then remove. (Document: the guard only has teeth once rules exist.)

- [ ] **Step 3: Create the surface partial**

```scss
// scss/theme/_kaihou-character-sheet.scss
//
// Bespoke databook character sheet. Resolves under
// body.naruto-zen .naruto-zen-target { … }; `&` = .naruto-zen-target.
// Qualify with .kaihou-databook so only our sheet is affected.

&.kaihou-databook {
  .window-content { background: var(--db-cream); color: var(--db-ink); padding: 0; }

  .db-frontmatter { padding: var(--zen-space-3); display: flex; flex-direction: column; gap: var(--zen-space-3); }
  .db-identity-edit { display: flex; gap: var(--zen-space-3); }
  .db-identity-edit label { flex: 1; font: var(--zen-text-xs)/1.4 var(--db-font-label); text-transform: uppercase; letter-spacing: 0.06em; color: var(--db-muted); }
  .db-identity-edit input { width: 100%; background: #fff7e6; border: 1px solid var(--db-border); border-radius: var(--zen-radius-sm); color: var(--db-ink); padding: 2px 6px; }

  .db-radars { display: grid; grid-template-columns: 1fr 1fr; gap: var(--zen-space-3); }
  .db-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--zen-space-3); }

  .db-band__id { flex: 1; min-width: 0; }
  .db-band__badges { display: flex; gap: 6px; flex-wrap: wrap; margin-top: var(--zen-space-2); }
  .db-natures { display: flex; gap: 6px; align-items: center; margin-top: var(--zen-space-2); }
  .db-natures__lbl { font: var(--zen-text-xs) var(--db-font-label); text-transform: uppercase; letter-spacing: 0.07em; color: var(--db-muted); }

  .db-missions { display: grid; grid-template-columns: repeat(6, 1fr); gap: 3px; text-align: center; }
  .db-missions > div { background: #e7dcbf; border: 1px solid var(--db-border); border-radius: var(--zen-radius-sm); padding: 3px 0; }
  .db-missions b { display: block; font-size: var(--zen-text-base); }
  .db-missions small { font-size: var(--zen-text-xs); color: var(--db-muted); }
  .db-mission { width: 100%; text-align: center; border: none; background: transparent; font-size: var(--zen-text-base); color: var(--db-ink); }

  .db-line { display: flex; justify-content: space-between; font-size: var(--zen-text-xs); padding: 2px 0; border-bottom: 1px dotted var(--db-border-soft); }

  // Relabelled tab strip styled databook-red (PF1e nav reused).
  .sheet-navigation.tabs { background: #e3d7b8; border-bottom: 2px solid var(--db-red); }
  .sheet-navigation.tabs .item.active { background: var(--db-red); color: #fff; }
}
```

- [ ] **Step 4: Wire the partial into the scoped block**

In `scss/kaihou.scss`, inside the `.naruto-zen-target { … }` block, add as the first `@import` (so later partials can still override if needed):

```scss
    @import "theme/kaihou-character-sheet";
```

- [ ] **Step 5: Build + run the guard**

Run: `npm run build:css --silent && npx vitest run tests/theme/databook.test.mjs`
Expected: PASS (all databook describe blocks).

- [ ] **Step 6: Manual Foundry verification**

1. Reload; open a character. The sheet now reads as a **cream databook**: red tab strip, panelled radars, mission grid, natures row, alias/allegiance fields.
2. Toggle the world setting **"Zen Scroll Theme — Enabled"** off → confirm databook styling reverts (proves scoping under `body.naruto-zen`), sheet still functional.
3. Compare against the approved mockup (`.superpowers/brainstorm/…/sheet-final.html`) for parity.

- [ ] **Step 7: Commit**

```bash
git add scss/theme/_kaihou-character-sheet.scss scss/kaihou.scss styles/theme/zen.css tests/theme/databook.test.mjs
git commit -m "feat(sheet): databook character-sheet surface styling"
```

---

## Task 10: Cross-module contract doc + tickets

**Files:**
- Create: `docs/cross-module-contract.md`
- Modify (vault): `Campaign Management/operational/tickets/kaihou-ui-style-coverage-audit.md`

- [ ] **Step 1: Write the contract doc for the friend**

```markdown
# Cross-module contract: naruto-d20 ⇄ naruto-d20-kaihou

Kaihou ships a campaign character sheet (`KaihouCharacterSheet extends
pf1.applications.actor.ActorSheetPFCharacter`). For naruto-d20's chakra-tab
injection and synckit button to keep working on it, both sides honour:

## naruto-d20 keeps stable (already true today)
- Injects the chakra tab via `ActorSheetPF.prototype._renderInner`, appending:
  - `<a data-tab="chakra" data-group="primary">` into `nav.sheet-navigation.tabs[data-group='primary']`
  - the chakra panel into `section.primary-body`
- The synckit button via `ActorSheetPF.prototype._getHeaderButtons`.

## Kaihou guarantees
- Its sheet preserves both anchor selectors (never removes nav or primary-body).
- It only ADDS sibling nodes; it never re-renders chakra fields itself.

## Optional (nice-to-have) general getters for naruto-d20
Purely general-purpose, usable by any sheet — not Kaihou-specific:
1. A documented getter for affinities + advanced/Kekkei-Genkai nature
   (Kaihou currently reads `flags["naruto-d20"].chakra.nature.{primary,secondary}`
   for basics and falls back to a Kaihou flag for the advanced nature).
2. A documented export of the discipline→skill-key map
   (Kaihou currently hard-codes `nin/fui/ckc/tai/gnj`).
```

- [ ] **Step 2: Update the parent audit ticket (vault)**

In the vault file, under "Remaining open surfaces", add a line noting the bespoke databook sheet is in progress and link this plan; do not close the ticket.

- [ ] **Step 3: Validate + rebuild the vault dashboard**

Run from the vault root:
`python3 "Creation Zone/automation_scripts/validate_operational.py" --vault . && python3 "Creation Zone/automation_scripts/build_operational_dashboard.py" --vault . --apply`
Expected: validation OK; dashboard rewritten.

- [ ] **Step 4: Commit (module repo)**

```bash
git add docs/cross-module-contract.md
git commit -m "docs(sheet): cross-module injection contract for naruto-d20"
```

(The vault ticket change is committed in the vault repo separately, per existing vault workflow.)

---

## Task 11: Full verification + version bump

**Files:**
- Modify: `module.json`, `package.json`, `CHANGELOG.md`

- [ ] **Step 1: Full automated suite**

Run: `npm test`
Expected: pytest + vitest all pass; `test:css-fresh` reports CSS up-to-date (if not, run `npm run build:css` and commit `styles/`).

- [ ] **Step 2: Manual Foundry verification checklist (required before any tag)**

In `~/Documents/foundry/`, on a real PC actor confirm: header band + alias/allegiance persistence; both radars (front matter + Combat/Skills) match stats; natures + void slot; mission editing; **chakra tab still injects**; synckit button works; theme-toggle reverts cleanly; switching to PF1e's stock sheet and back is error-free. (Per project rule: CI green ≠ shippable.)

- [ ] **Step 3: Bump version (patch) + changelog**

Set `version` to the next patch (`2.1.5` → `2.1.6`) in **both** `module.json` and `package.json`. Add a `## v2.1.6 — <date>` entry to `CHANGELOG.md` summarizing the bespoke databook character sheet.

> Semver note (project rule): patch `z` by default; only bump `y`/`x` for breaking changes. A new opt-in sheet is additive. If the GM wants to mark it as a feature milestone, that's their call to bump `y` — confirm before doing so.

- [ ] **Step 4: Commit (do NOT tag — the GM tags after their own Foundry check)**

```bash
git add module.json package.json CHANGELOG.md
git commit -m "chore(release): v2.1.6 — bespoke databook character sheet"
```

> Release/tag is the GM's manual step after verifying in their Foundry, per `feedback_test_foundry_before_shipping`. Do not push a `v*` tag from this plan.

---

## Self-review

**Spec coverage:**
- §4.1 sheet class/registration → Task 6. §4.2 anchor contract → Tasks 6–7 + Task 10 doc. §4.3 re-compose strategy → Tasks 6–8. §4.4 view-model → Task 4.
- §5 layout (header band, tabs, identity radars, combat/skills radars, mission, origin) → Tasks 7–8. §6 flags data model → Tasks 4/8. §7 radars → Tasks 3/5/7. §8 natures+void → Tasks 4/5/7.
- §9 coordination → Task 10. §10 design-system foundation → Tasks 1–2, 9. §13 resilience → guards in Tasks 4/6/7. §14 testing/release → Tasks 1–9 (unit + CSS guard) + Task 11 (manual + release).
- Not in this plan (correctly deferred per spec §3): NPC sheet, item sheets, migrating wizard/dialog/compendium chrome.

**Placeholder scan:** Tab selector names in Task 7 are explicitly marked to substitute from the value recorded in Task 6 Step 5 (a real verification step), not a vague TODO. No "add error handling"/"TBD" left.

**Type consistency:** `buildKaihouViewModel` shape (`identity.{alias,allegiance,missions:{counts,total}}`, `radars.{abilities,disciplines}` as `[{key,label,value}]`, `natures.{basic:[{key,kanji,on}],advanced}`) is identical across Tasks 4, 5, 7, 8. `radarSvg(axes,{max,variant})`, `headerBand(vm,meta)`, `missionRecord(missions)`, `naturesRow(natures)` signatures match between Task 5 definition and Task 7/8 calls. Variant strings `"ability"`/`"discipline"` match the `.db-radar__plot--*` classes in Task 2.
