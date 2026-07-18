# ApplicationV2 Window Pattern Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A shared `KaihouApplication` base class and `@mixin kaihou-window` SCSS baseline that every kaihou ApplicationV2 window builds on, with the Twenty Questions Wizard migrated as the first consumer.

**Architecture:** Thin utility base class (`scripts/apps/kaihou-application.mjs`) extending `HandlebarsApplicationMixin(ApplicationV2)` — singleton registry, once-guarded change-event delegation, opt-in centering, automatic `kaihou-app` CSS class. Plus an SCSS mixin (`scss/apps/_kaihou-window.scss`) holding the parchment/ink visual baseline. Spec: `docs/superpowers/specs/2026-07-18-appv2-window-pattern-design.md`.

**Tech Stack:** Foundry VTT v13 ApplicationV2 API, vanilla ES modules (.mjs), Dart Sass, vitest (node environment — no jsdom; DOM interactions tested via fake objects).

## Global Constraints

- Branch: `feat/appv2-window-pattern` (off `main`, post-v2.1.20). Ship via PR, never direct to main.
- **Downtime apps are OUT OF SCOPE.** `gm-console.mjs`, `player-prompt.mjs`, and `_downtime.scss` are heavily rewritten on the unmerged `feat/socketlib-downtime` branch; their migration is a follow-up done on/after that branch. Do not touch them here.
- The wizard must look and behave identically after migration. No visual redesign.
- Never set `position` on an app's root class in SCSS — it sits beside core's `.application`, whose fixed positioning must win.
- CSS is committed compiled: after any SCSS change run `npm run build:css` and commit `styles/` output (the `test:css-fresh` guard fails CI otherwise).
- vitest runs in `environment: "node"`: stub `foundry` globals BEFORE importing any module that reads `foundry.applications.api` at module scope.
- No version bump in this plan (release is a separate step; patch-z only per project convention).
- Commit messages end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: `KaihouApplication` base class

**Files:**
- Create: `scripts/apps/kaihou-application.mjs`
- Test: `tests/apps/kaihou-application.test.mjs` (new directory `tests/apps/` — vitest's `tests/**/*.test.mjs` include already covers it)

**Interfaces:**
- Consumes: `foundry.applications.api.{ApplicationV2, HandlebarsApplicationMixin}` (global, read at module-evaluation time).
- Produces (Task 3 relies on these exact names):
  - `class KaihouApplication` (named export)
  - `static MODULE_ID: string` = `"naruto-d20-kaihou"`
  - `static kaihouTemplate(relativePath: string): string` → `"modules/naruto-d20-kaihou/templates/<relativePath>"`
  - `static open(...args): instance` — singleton open; calls `_onReopen(...args)` + re-render if already rendered
  - `static get instance(): instance | null`
  - `_onReopen(...args): void` — subclass hook, default no-op
  - `_wireChangeActions(map: Record<string, Function>): void` — wires once per app root
  - `_onFirstRender(context, options)` — centers when `options.kaihou.centerOnFirstRender` is true
  - `static DEFAULT_OPTIONS = { kaihou: { centerOnFirstRender: false } }`

- [ ] **Step 1: Write the failing test**

Create `tests/apps/kaihou-application.test.mjs`:

```js
import { describe, it, expect, beforeAll, vi } from "vitest";

// KaihouApplication reads foundry.applications.api at module-evaluation time,
// so stub the minimum surface before importing it (same pattern as
// tests/wizard/twenty-questions-wizard-actions.test.mjs).
globalThis.foundry ??= {
  applications: {
    api: {
      ApplicationV2: class {},
      HandlebarsApplicationMixin: (Base) => class extends Base {},
    },
  },
};

let KaihouApplication;
beforeAll(async () => {
  ({ KaihouApplication } = await import("../../scripts/apps/kaihou-application.mjs"));
});

// Test double: the stub ApplicationV2 has no render/rendered, so provide them.
function makeDouble() {
  return class Double extends KaihouApplication {
    renderCalls = [];
    reopenArgs = null;
    _rendered = false;
    get rendered() { return this._rendered; }
    render(force) { this.renderCalls.push(force); this._rendered = true; return this; }
    _onReopen(...args) { this.reopenArgs = args; }
  };
}

describe("kaihouTemplate", () => {
  it("builds the module template path", () => {
    expect(KaihouApplication.kaihouTemplate("apps/tqw-v2/header.hbs"))
      .toBe("modules/naruto-d20-kaihou/templates/apps/tqw-v2/header.hbs");
  });

  it("is inherited by subclasses via `this`", () => {
    class Sub extends KaihouApplication {}
    expect(Sub.kaihouTemplate("x.hbs")).toBe("modules/naruto-d20-kaihou/templates/x.hbs");
  });
});

describe("singleton open()", () => {
  it("constructs, stores, and renders on first open", () => {
    const Double = makeDouble();
    const app = Double.open("a", 1);
    expect(app).toBeInstanceOf(Double);
    expect(app.renderCalls).toEqual([true]);
    expect(Double.instance).toBe(app);
  });

  it("reuses a rendered instance: _onReopen(...args) then re-render", () => {
    const Double = makeDouble();
    const first = Double.open();
    const second = Double.open("record", "actor");
    expect(second).toBe(first);
    expect(first.reopenArgs).toEqual(["record", "actor"]);
    expect(first.renderCalls).toEqual([true, true]);
  });

  it("creates a fresh instance after close (rendered false)", () => {
    const Double = makeDouble();
    const first = Double.open();
    first._rendered = false; // simulate close
    const second = Double.open();
    expect(second).not.toBe(first);
    expect(Double.instance).toBe(second);
  });

  it("keeps separate instances per subclass", () => {
    const A = makeDouble();
    const B = makeDouble();
    const a = A.open();
    const b = B.open();
    expect(a).not.toBe(b);
    expect(A.instance).toBe(a);
    expect(B.instance).toBe(b);
  });

  it("instance is null before any open", () => {
    const Double = makeDouble();
    expect(Double.instance).toBeNull();
  });
});

describe("_initializeApplicationOptions", () => {
  it("appends kaihou-app to declared classes", () => {
    const opts = KaihouApplication._initializeApplicationOptions({ classes: ["tqw-v2"] });
    expect(opts.classes).toContain("tqw-v2");
    expect(opts.classes).toContain("kaihou-app");
  });

  it("handles missing classes and does not duplicate", () => {
    expect(KaihouApplication._initializeApplicationOptions({}).classes).toEqual(["kaihou-app"]);
    const opts = KaihouApplication._initializeApplicationOptions({ classes: ["kaihou-app"] });
    expect(opts.classes.filter((c) => c === "kaihou-app")).toHaveLength(1);
  });
});

describe("_wireChangeActions", () => {
  function makeApp() {
    const Double = makeDouble();
    const app = new Double();
    app.element = { dataset: {}, addEventListener: vi.fn() };
    return app;
  }

  it("wires a change listener on the app root exactly once", () => {
    const app = makeApp();
    app._wireChangeActions({});
    app._wireChangeActions({}); // second render — must not double-wire
    expect(app.element.addEventListener).toHaveBeenCalledTimes(1);
    expect(app.element.addEventListener.mock.calls[0][0]).toBe("change");
  });

  it("dispatches to the mapped handler with (event, target), bound to the app", () => {
    const app = makeApp();
    const handler = vi.fn();
    app._wireChangeActions({ "my-change": handler });
    const listener = app.element.addEventListener.mock.calls[0][1];
    const actionEl = { dataset: { action: "my-change" } };
    const event = { target: { closest: () => actionEl } };
    listener(event);
    expect(handler).toHaveBeenCalledWith(event, actionEl);
    expect(handler.mock.contexts[0]).toBe(app);
  });

  it("ignores events with no data-action ancestor and unmapped actions", () => {
    const app = makeApp();
    const handler = vi.fn();
    app._wireChangeActions({ "my-change": handler });
    const listener = app.element.addEventListener.mock.calls[0][1];
    listener({ target: { closest: () => null } });
    listener({ target: { closest: () => ({ dataset: { action: "other" } }) } });
    expect(handler).not.toHaveBeenCalled();
  });

  it("is a no-op when the element is not yet attached", () => {
    const Double = makeDouble();
    const app = new Double();
    app.element = null;
    expect(() => app._wireChangeActions({})).not.toThrow();
  });
});

describe("centering (opt-in)", () => {
  it("does nothing when centerOnFirstRender is off", () => {
    const Double = makeDouble();
    const app = new Double();
    app.options = { kaihou: { centerOnFirstRender: false } };
    const spy = vi.spyOn(app, "_centerOnFirstRender");
    app._onFirstRender({}, {});
    expect(spy).not.toHaveBeenCalled();
  });

  it("centers via requestAnimationFrame + setPosition when on", () => {
    globalThis.requestAnimationFrame = (fn) => fn();
    globalThis.window ??= {};
    globalThis.window.innerWidth = 1000;
    globalThis.window.innerHeight = 800;
    const Double = makeDouble();
    const app = new Double();
    app.options = { kaihou: { centerOnFirstRender: true } };
    app.position = { width: 640, height: 720 };
    app.setPosition = vi.fn();
    app._onFirstRender({}, {});
    expect(app.setPosition).toHaveBeenCalledWith({ left: 180, top: 40 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/Documents/foundry/foundrydata/Data/modules/naruto-d20-kaihou && npx vitest run tests/apps/kaihou-application.test.mjs`
Expected: FAIL — cannot resolve `scripts/apps/kaihou-application.mjs`.

- [ ] **Step 3: Write the implementation**

Create `scripts/apps/kaihou-application.mjs`:

```js
/**
 * KaihouApplication — shared base for every kaihou ApplicationV2 window.
 *
 * Provides the utilities each window previously hand-rolled:
 *  - MODULE_ID + kaihouTemplate() path helper
 *  - a singleton registry (static open()/instance, _onReopen hook)
 *  - once-guarded `change`-event action delegation (ApplicationV2's
 *    `actions` map dispatches on CLICK only — selects and textareas need
 *    a change delegator, and a native <select> even emits a click on open,
 *    so change handlers must never be registered as click actions)
 *  - opt-in first-render centering (AppV2 computes initial placement after
 *    frame insertion, so an immediate setPosition gets overridden — the
 *    requestAnimationFrame deferral is required)
 *  - automatic "kaihou-app" class on every subclass window
 *
 * Pattern spec: docs/superpowers/specs/2026-07-18-appv2-window-pattern-design.md
 */
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class KaihouApplication extends HandlebarsApplicationMixin(ApplicationV2) {
  static MODULE_ID = "naruto-d20-kaihou";

  static DEFAULT_OPTIONS = {
    kaihou: { centerOnFirstRender: false },
  };

  /** "apps/foo/bar.hbs" → "modules/naruto-d20-kaihou/templates/apps/foo/bar.hbs" */
  static kaihouTemplate(relativePath) {
    return `modules/${this.MODULE_ID}/templates/${relativePath}`;
  }

  // AppV2's options merge REPLACES arrays, so declaring the shared class in
  // DEFAULT_OPTIONS.classes would be wiped by any subclass that declares its
  // own. Append it here instead, after the normal merge.
  static _initializeApplicationOptions(options) {
    const opts = super._initializeApplicationOptions?.(options) ?? options;
    opts.classes = Array.from(new Set([...(opts.classes ?? []), "kaihou-app"]));
    return opts;
  }

  // ── Singleton lifecycle ────────────────────────────────────────────────
  // Registry keyed by subclass constructor: JS private fields (#instance)
  // are not accessible from a base class, so per-subclass fields can't be
  // managed here — the Map removes the need for them entirely.
  static #instances = new Map();

  /**
   * Singleton open. In a static method `this` is the calling subclass, so
   * `MyApp.open(...)` needs no per-app boilerplate. Subclasses that gate
   * opening (e.g. GM-only) override open() and call super.open(); subclasses
   * whose reopen updates state override _onReopen(...args).
   */
  static open(...args) {
    const existing = KaihouApplication.#instances.get(this);
    if (existing?.rendered) {
      existing._onReopen(...args);
      existing.render(true);
      return existing;
    }
    const app = new this(...args);
    KaihouApplication.#instances.set(this, app);
    app.render(true);
    return app;
  }

  /** Live instance of the calling subclass (rendered or not), or null. */
  static get instance() {
    return KaihouApplication.#instances.get(this) ?? null;
  }

  /** Hook: update instance state when open() finds the window already up. */
  _onReopen(..._args) {}

  // ── Change-event delegation ────────────────────────────────────────────
  /**
   * Wire `data-action` handlers for `change` events. Wires ONCE per app
   * (guarded via the root's dataset — the AppV2 frame element persists
   * across re-renders while part content is replaced underneath it), which
   * is safe to call from _onRender on every render.
   */
  _wireChangeActions(map) {
    const root = this.element;
    if (!root || root.dataset.kaihouChangeWired) return;
    root.dataset.kaihouChangeWired = "1";
    root.addEventListener("change", (event) => {
      const target = event.target?.closest?.("[data-action]");
      if (!target) return;
      const fn = map[target.dataset.action];
      if (fn) fn.call(this, event, target);
    });
  }

  // ── Opt-in centering ───────────────────────────────────────────────────
  _onFirstRender(context, options) {
    super._onFirstRender?.(context, options);
    if (this.options?.kaihou?.centerOnFirstRender) this._centerOnFirstRender();
  }

  _centerOnFirstRender() {
    requestAnimationFrame(() => {
      const w = this.position?.width ?? 600;
      const h = this.position?.height ?? 600;
      this.setPosition({
        left: Math.max(0, Math.round((window.innerWidth - w) / 2)),
        top: Math.max(0, Math.round((window.innerHeight - h) / 2)),
      });
    });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/apps/kaihou-application.test.mjs`
Expected: PASS (all tests).

- [ ] **Step 5: Lint and run the full JS suite**

Run: `npm run lint:js && npm run test:js`
Expected: clean lint; all existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add scripts/apps/kaihou-application.mjs tests/apps/kaihou-application.test.mjs
git commit -m "feat(apps): KaihouApplication shared ApplicationV2 base class

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: `@mixin kaihou-window` + wizard SCSS adoption

**Files:**
- Create: `scss/apps/_kaihou-window.scss`
- Modify: `scss/apps/_twenty-questions-wizard.scss` (top of file + `.tqw-v2` root block)
- Modify (generated): `styles/apps/twenty-questions-wizard.css`

**Interfaces:**
- Produces: `@mixin kaihou-window` — the parchment/ink window baseline. Consumed by any per-app stylesheet via `@use "kaihou-window" as *;` (same directory) then `@include kaihou-window;` as the FIRST rule inside the app's root class, so app-specific declarations after it override baseline ones (CSS last-declaration-wins within equal specificity).
- The mixin consumes only `--k-*` CSS custom properties (declared on `:root` by the always-loaded zen.css) — it needs no Sass `@use` of its own.

**Note on the spec's wizard claim:** the spec says the wizard "sets no parchment baseline at all" — that is wrong; `.tqw-v2` already sets `background`/`color`/`font-family` and a deliberately heavier border. The adoption below keeps the wizard's divergent declarations (border-heavy, box-shadow) AFTER the include so they win, and removes only the exact duplicates. Task 4 corrects the spec text.

- [ ] **Step 1: Create the mixin**

Create `scss/apps/_kaihou-window.scss`:

```scss
/**
 * @mixin kaihou-window — the shared visual baseline for every kaihou
 * ApplicationV2 window ("The Shinobi Record": parchment, ink, wax seal).
 *
 * Usage — FIRST rule inside the app's root class:
 *   @use "kaihou-window" as *;
 *   .my-app { @include kaihou-window; /* app-specific rules below */ }
 *
 * App-specific declarations placed after the include override the baseline
 * (last declaration wins at equal specificity).
 *
 * NEVER set `position` on the app root class — it sits on the application
 * element beside core's `.application`, whose fixed positioning must win.
 *
 * Consumes only --k-* custom properties (scss/_kaihou-tokens.scss, on :root).
 * Pattern spec: docs/superpowers/specs/2026-07-18-appv2-window-pattern-design.md
 */

@mixin kaihou-window {
  background: var(--k-paper);
  border: var(--k-bold-border);
  color: var(--k-ink);
  font-family: var(--k-font-body);

  // Parchment grain overlay. The AppV2 root is positioned by core, so the
  // absolute pseudo-element resolves against it; children get lifted above.
  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image: var(--k-bold-grain);
    pointer-events: none;
    z-index: 0;
  }

  > * {
    position: relative;
    z-index: 1;
  }

  h2,
  h3,
  legend {
    font-family: var(--k-font-display);
    color: var(--k-ink);
    margin: 0 0 0.4em;
  }

  label {
    display: block;
    margin: 0.5em 0;
    color: var(--k-ink-soft);
    font-size: 0.9rem;
  }

  select,
  input[type="text"],
  textarea {
    width: 100%;
    background: var(--k-input-bg-strong);
    border: var(--k-border-hair) solid var(--k-rule-ink);
    border-radius: var(--k-radius-sm);
    color: var(--k-ink);
    padding: 0.3em 0.45em;
    font-family: var(--k-font-body);
  }

  button {
    font-family: var(--k-font-util);
    background: var(--k-card-bg);
    border: var(--k-bold-border);
    border-radius: var(--k-radius-sm);
    color: var(--k-ink);
    padding: 0.35em 0.8em;
    cursor: pointer;

    &:hover {
      background: var(--k-input-bg-strong);
    }

    &:focus-visible {
      outline: 2px solid var(--k-seal);
      outline-offset: 1px;
    }
  }

  .hint {
    color: var(--k-ink-mute);
    font-size: 0.78rem;
    font-style: italic;
  }

  @media (prefers-reduced-motion: reduce) {
    * {
      transition: none !important;
    }
  }
}
```

- [ ] **Step 2: Adopt it in the wizard stylesheet**

In `scss/apps/_twenty-questions-wizard.scss`, add the `@use` after the existing ones at the top:

```scss
@use "../tokens" as *;
@use "../components/index" as *;
@use "kaihou-window" as *;
@use "bio-section";
```

Then change the top of the `.tqw-v2` block — currently:

```scss
.tqw-v2 {
  background: var(--k-paper);
  border: var(--k-bold-border-heavy);
  box-shadow: 0 4px 12px rgba(94, 67, 39, 0.3),
              inset 0 0 12px rgba(195, 165, 130, 0.2);
  // NOTE: never set `position` here — this class sits on the ApplicationV2
  // root next to core's .application, whose fixed positioning must win.
  font-family: var(--k-font-body);
  color: var(--k-ink);
```

to:

```scss
.tqw-v2 {
  @include kaihou-window;
  // Wizard divergences from the baseline (declared after the include so
  // they win): heavier sumi-e border + card shadow.
  border: var(--k-bold-border-heavy);
  box-shadow: 0 4px 12px rgba(94, 67, 39, 0.3),
              inset 0 0 12px rgba(195, 165, 130, 0.2);
  // NOTE: never set `position` here — this class sits on the ApplicationV2
  // root next to core's .application, whose fixed positioning must win.
```

(`background`, `font-family`, `color` lines are removed — the mixin provides them. Everything below in the block stays unchanged.)

- [ ] **Step 3: Rebuild CSS and lint**

Run: `npm run build:css && npm run lint:css`
Expected: compiles clean; stylelint passes. `git diff --stat styles/` shows only `styles/apps/twenty-questions-wizard.css` changed.

- [ ] **Step 4: Run the CSS freshness guard**

Run: `npm run test:css-fresh`
Expected: exits 0 after the rebuild is staged/committed together with the SCSS (guard compares built output to committed state — commit them in the same commit below).

- [ ] **Step 5: Commit**

```bash
git add scss/apps/_kaihou-window.scss scss/apps/_twenty-questions-wizard.scss styles/apps/twenty-questions-wizard.css
git commit -m "feat(scss): kaihou-window mixin — shared window baseline, adopted by wizard

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Migrate the Twenty Questions Wizard onto `KaihouApplication`

**Files:**
- Modify: `scripts/apps/wizard/twenty-questions-wizard.mjs`
- Test: `tests/wizard/twenty-questions-wizard-actions.test.mjs` (extend; existing assertions must keep passing)

**Interfaces:**
- Consumes from Task 1: `KaihouApplication` (named export of `scripts/apps/kaihou-application.mjs`), `KaihouApplication.kaihouTemplate()`, inherited `_wireChangeActions(map)`, inherited `_onFirstRender` centering behind `kaihou.centerOnFirstRender`.
- Produces: no API change — `TwentyQuestionsWizard` default export, constructor `(actor, options)`, fresh-instance (never calls `open()`).

- [ ] **Step 1: Extend the actions test with migration assertions (failing first)**

Append to `tests/wizard/twenty-questions-wizard-actions.test.mjs`:

```js
describe("TQW — KaihouApplication migration", () => {
  it("extends KaihouApplication", async () => {
    const { KaihouApplication } = await import("../../scripts/apps/kaihou-application.mjs");
    expect(Object.getPrototypeOf(TwentyQuestionsWizard)).toBe(KaihouApplication);
  });

  it("opts in to first-render centering", () => {
    expect(TwentyQuestionsWizard.DEFAULT_OPTIONS.kaihou).toEqual({ centerOnFirstRender: true });
  });

  it("uses the inherited once-guarded change delegator (no bespoke copy)", () => {
    // The bespoke _wireChangeActions re-wired on every render (duplicate
    // listeners). The base-class version is guarded — the wizard must not
    // shadow it.
    expect(Object.prototype.hasOwnProperty.call(
      TwentyQuestionsWizard.prototype, "_wireChangeActions",
    )).toBe(false);
  });

  it("does not shadow the base _onFirstRender centering", () => {
    expect(Object.prototype.hasOwnProperty.call(
      TwentyQuestionsWizard.prototype, "_onFirstRender",
    )).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify the new assertions fail**

Run: `npx vitest run tests/wizard/twenty-questions-wizard-actions.test.mjs`
Expected: the 4 new tests FAIL (wizard still extends the raw mixin); existing tests PASS.

- [ ] **Step 3: Migrate the wizard**

In `scripts/apps/wizard/twenty-questions-wizard.mjs`:

**(a)** Replace the import/base-class plumbing — delete these lines:

```js
const MODULE_ID = "naruto-d20-kaihou";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
```

add with the other imports:

```js
import { KaihouApplication } from "../kaihou-application.mjs";
```

and change the class declaration:

```js
export default class TwentyQuestionsWizard extends KaihouApplication {
```

**(b)** In `DEFAULT_OPTIONS`, add the centering flag (the wizard is the one window that force-centers):

```js
    position: { width: 640, height: 720 },
    kaihou: { centerOnFirstRender: true },
```

**(c)** Replace the `PARTS` template strings:

```js
  static PARTS = {
    header:   { template: KaihouApplication.kaihouTemplate("apps/tqw-v2/header.hbs") },
    progress: { template: KaihouApplication.kaihouTemplate("apps/tqw-v2/progress.hbs") },
    content:  { template: KaihouApplication.kaihouTemplate("apps/tqw-v2/content.hbs") },
    footer:   { template: KaihouApplication.kaihouTemplate("apps/tqw-v2/footer.hbs") },
  };
```

**(d)** Delete the entire bespoke `_onFirstRender(context, options)` method (the requestAnimationFrame-centering override — the base class now does this behind the flag set in (b)).

**(e)** Delete the entire bespoke `_wireChangeActions()` method (including its `CHANGE_ACTIONS` const), and pass the map at the call site in `_onRender`:

```js
  _onRender(_context, _options) {
    super._onRender?.(_context, _options);
    this._wireDropZones();
    // Change-event delegation: ApplicationV2 `actions` dispatch on CLICK only,
    // and a native <select> emits a click when opened — registering these as
    // click actions would re-render mid-open and snap the popup shut. The
    // base-class delegator wires `change` once per app root.
    this._wireChangeActions({
      "tqw-select-change":    TwentyQuestionsWizard._onSelectChange,
      "tqw-subpicker-change": TwentyQuestionsWizard._onSubpickerChange,
      "tqw-narrative-change": TwentyQuestionsWizard._onNarrativeChange,
    });
  }
```

(`_wireDropZones` stays as-is: drop-zone elements live inside re-rendered part
content and are fresh nodes each render, so re-wiring them per render is
correct, not a leak.)

- [ ] **Step 4: Run the full JS suite**

Run: `npm run test:js`
Expected: PASS — the 4 new assertions plus every pre-existing test (wizard actions, state, finish-orchestrator, downtime context tests, base-class tests).

- [ ] **Step 5: Lint**

Run: `npm run lint:js`
Expected: clean. (If eslint flags the removed `MODULE_ID` as unused elsewhere in the file, there are no other uses — all four were in `PARTS`.)

- [ ] **Step 6: Commit**

```bash
git add scripts/apps/wizard/twenty-questions-wizard.mjs tests/wizard/twenty-questions-wizard-actions.test.mjs
git commit -m "refactor(wizard): migrate TwentyQuestionsWizard onto KaihouApplication

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Amend the spec to match reality

**Files:**
- Modify: `docs/superpowers/specs/2026-07-18-appv2-window-pattern-design.md`

Two corrections discovered during planning:

- [ ] **Step 1: Fix the wizard-baseline claim**

In the "Problem" section, replace point 3's parenthetical "(the wizard sets no parchment baseline at all)" with "(each window's baseline drifts independently — the wizard, e.g., duplicates background/ink/font declarations with its own variations)". In "Migration of existing apps", change the wizard SCSS row's note from "(closes its missing-baseline gap)" to "(dedupes its hand-rolled baseline; keeps its heavier border + shadow as post-include overrides)". In "Non-goals", change "except the wizard gaining the parchment baseline it lacked" to "windows must look identical after migration, full stop".

- [ ] **Step 2: Rewrite "Relationship to other branches"**

Replace that section's body with:

```markdown
NOT independent of `feat/socketlib-downtime` as originally assumed: that
unmerged branch heavily rewrites `gm-console.mjs`, `player-prompt.mjs`, their
templates, and `_downtime.scss`. Decision (2026-07-18): this PR ships the
pattern + wizard migration only, off `main`. The downtime apps migrate in a
follow-up performed on/after the socketlib branch, against the current code —
that follow-up covers the `open()`/`_onReopen` adoption, `closeIfOpen` via
`instance`, replacing the `dataset.kaihouBound` select wiring with
`_wireChangeActions` (requires adding a `data-action` to the prompt's action
`<select>`), and `@include kaihou-window` in `_downtime.scss`.
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-07-18-appv2-window-pattern-design.md
git commit -m "docs: correct spec — wizard baseline reality, downtime migration deferred

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Single-session visual verification in local Foundry

Manual gate — CI green is not user-visible (project rule: verify in the local
Foundry before shipping). The pattern is deliberately verifiable from ONE GM
session; no second client needed.

- [ ] **Step 1: Launch the test world**

Foundry at `~/Documents/foundry/` serves this module directory directly
(localhost:30000). If the world was already running, relaunch it from Setup
(Foundry caches the module manifest at world launch), and hard-reload the
browser (Ctrl+Shift+R — the HTTP cache can serve stale .mjs on a normal
reload).

- [ ] **Step 2: Verify the wizard**

As GM, open a character sheet → Biography tab → the 20 Questions scroll
button. Confirm:

1. Window opens centered, parchment background, heavy sumi-e border — visually
   identical to before the migration.
2. Root element carries BOTH classes: `tqw-v2` and `kaihou-app` (inspect, or
   `document.querySelector(".tqw-v2").classList` in the console).
3. Q1's Village `<select>` opens its native dropdown and stays open (the
   click-vs-change regression), and picking a value updates state.
4. Navigate Next past several questions, then change a select again — the
   handler fires ONCE (no duplicate-listener echo: watch for double state
   writes / console noise).
5. The narrative textarea accepts typing without re-render focus loss.

- [ ] **Step 3: Full suite + push**

Run: `npm run lint && npm test`
Expected: all green (pytest + vitest + css-fresh).

```bash
git push -u origin feat/appv2-window-pattern
```

Then open the PR (`gh pr create`) — title "ApplicationV2 window pattern:
KaihouApplication base class + kaihou-window mixin", body summarizing the
pattern, the wizard migration, and the deferred downtime follow-up.

---

## Deferred follow-up (tracked, not in this plan)

Downtime app migration (`gm-console.mjs`, `player-prompt.mjs`,
`_downtime.scss` → base class + mixin) happens on/after
`feat/socketlib-downtime`, per the amended spec's branch-relationship section.
