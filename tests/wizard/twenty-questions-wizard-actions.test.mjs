import { describe, it, expect, beforeAll } from "vitest";

// The wizard class reads `foundry.applications.api` at module-evaluation time
// (it extends ApplicationV2), so stub the minimum surface before importing it.
globalThis.foundry ??= {
  applications: {
    api: {
      ApplicationV2: class {},
      HandlebarsApplicationMixin: (Base) => class extends Base {},
    },
  },
};

let TwentyQuestionsWizard;
beforeAll(async () => {
  ({ default: TwentyQuestionsWizard } = await import(
    "../../scripts/apps/wizard/twenty-questions-wizard.mjs"
  ));
});

describe("TQW action wiring — a native <select> must open without re-rendering", () => {
  // Regression guard. ApplicationV2 dispatches DEFAULT_OPTIONS.actions on CLICK,
  // and a native <select> emits a click when it is opened. If the change
  // handlers are registered as click actions, opening Q1's Village dropdown
  // re-renders the app and snaps the native popup shut before the player can
  // pick. They must be wired on `change` (via _wireChangeActions) instead.
  it("does NOT register change handlers as click actions", () => {
    const actions = TwentyQuestionsWizard.DEFAULT_OPTIONS.actions;
    expect("tqw-select-change" in actions).toBe(false);
    expect("tqw-subpicker-change" in actions).toBe(false);
    expect("tqw-narrative-change" in actions).toBe(false);
  });

  it("still registers genuine click actions (buttons / chips)", () => {
    const actions = TwentyQuestionsWizard.DEFAULT_OPTIONS.actions;
    for (const key of ["tqw-back", "tqw-next", "tqw-radio-select", "tqw-clear-drop", "tqw-browse"]) {
      expect(typeof actions[key]).toBe("function");
    }
  });

  it("keeps the change handlers available as static methods for the change delegator", () => {
    expect(typeof TwentyQuestionsWizard._onSelectChange).toBe("function");
    expect(typeof TwentyQuestionsWizard._onSubpickerChange).toBe("function");
    expect(typeof TwentyQuestionsWizard._onNarrativeChange).toBe("function");
  });
});
