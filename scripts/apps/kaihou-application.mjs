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
    return { ...opts, classes: Array.from(new Set([...(opts.classes ?? []), "kaihou-app"])) };
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
    // NOTE: the instance is registered before render() resolves. If render()
    // rejects (e.g. missing template), `instance` transiently returns this
    // unrendered app until the next open() call creates a fresh one.
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
   * (guarded via the frame root's dataset — the AppV2 frame element persists
   * across part re-renders, so this flag survives). Safe to call from
   * `_onRender` on every render cycle.
   *
   * IMPORTANT: only the first call's `map` is ever wired. The map must be
   * constant across renders (same keys, same handler references). Passing
   * a dynamically-built map whose shape changes per render will silently
   * leave later renders using the first render's handlers.
   *
   * Call from _onRender: `this._wireChangeActions({ "my-change": Handler })`
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
