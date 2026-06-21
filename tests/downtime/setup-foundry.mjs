// Minimal Foundry globals so AppV2 modules can be imported under vitest (node env).
globalThis.foundry ??= {
  applications: {
    api: { ApplicationV2: class {}, HandlebarsApplicationMixin: (Base) => class extends Base {} },
  },
  utils: { randomID: () => Math.random().toString(36).slice(2), deepClone: (v) => structuredClone(v) },
};
