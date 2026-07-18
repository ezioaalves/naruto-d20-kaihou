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
    expect(handler.mock.instances[0]).toBe(app);
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
