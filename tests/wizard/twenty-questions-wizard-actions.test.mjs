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

// _messageForError localizes via game.i18n; echo the key so we can assert on it.
globalThis.game ??= { i18n: { localize: (key) => `[${key}]` } };

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

describe("TQW validation messages are localized, never raw field keys", () => {
  // Regression: the REQUIRED/SUB_REQUIRED messages used to interpolate the raw
  // state-field name (e.g. "q1_village_uuid is required."), which surfaced as a
  // broken message in the UI. They must resolve to i18n keys instead.
  const wiz = () => Object.create(TwentyQuestionsWizard.prototype);

  it("maps each validation code to a localized key", () => {
    expect(wiz()._messageForError({ code: "REQUIRED" })).toBe(
      "[NARUTO_D20_KAIHOU.WIZARD.VALIDATION_REQUIRED]",
    );
    expect(wiz()._messageForError({ code: "SUB_REQUIRED" })).toBe(
      "[NARUTO_D20_KAIHOU.WIZARD.VALIDATION_SUB_REQUIRED]",
    );
    expect(wiz()._messageForError({ code: "Q10_COUPLED" })).toBe(
      "[NARUTO_D20_KAIHOU.WIZARD.VALIDATION_COUPLED]",
    );
    expect(wiz()._messageForError({ code: "WHATEVER" })).toBe(
      "[NARUTO_D20_KAIHOU.WIZARD.VALIDATION_DEFAULT]",
    );
  });

  it("never leaks the raw field name into the message", () => {
    const msg = wiz()._messageForError({ code: "REQUIRED", field: "q1_village_uuid" });
    expect(msg).not.toContain("q1_village_uuid");
  });
});
