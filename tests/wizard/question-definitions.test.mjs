import { describe, it, expect } from "vitest";
import { QUESTION_DEFINITIONS } from "../../scripts/apps/wizard/question-definitions.mjs";

const VALID_PICK_TYPES = new Set([
  "none", "radio", "select", "nested", "drag-drop", "drag-drop-coupled", "roll-table",
]);

describe("QUESTION_DEFINITIONS", () => {
  it("has exactly 20 entries", () => {
    expect(QUESTION_DEFINITIONS).toHaveLength(20);
  });

  it("ids are q1..q20 in order", () => {
    const ids = QUESTION_DEFINITIONS.map((d) => d.id);
    expect(ids).toEqual(Array.from({ length: 20 }, (_, i) => `q${i + 1}`));
  });

  it("every entry has questionText (non-empty string)", () => {
    for (const d of QUESTION_DEFINITIONS) {
      expect(typeof d.questionText).toBe("string");
      expect(d.questionText.length).toBeGreaterThan(0);
    }
  });

  it("every entry has sidebarLabel (non-empty string)", () => {
    for (const d of QUESTION_DEFINITIONS) {
      expect(typeof d.sidebarLabel).toBe("string");
      expect(d.sidebarLabel.length).toBeGreaterThan(0);
    }
  });

  it("every entry has narrativePrompt as a string (may be empty if no longer shown)", () => {
    for (const d of QUESTION_DEFINITIONS) {
      expect(typeof d.narrativePrompt).toBe("string");
    }
  });

  it("every entry has a valid pickType", () => {
    for (const d of QUESTION_DEFINITIONS) {
      expect(VALID_PICK_TYPES.has(d.pickType)).toBe(true);
    }
  });

  it("required is boolean", () => {
    for (const d of QUESTION_DEFINITIONS) {
      expect(typeof d.required).toBe("boolean");
    }
  });

  it("the 4 required Qs are Q1, Q4, Q7, Q8", () => {
    const required = QUESTION_DEFINITIONS.filter((d) => d.required).map((d) => d.id);
    expect(required.sort()).toEqual(["q1", "q4", "q7", "q8"]);
  });

  it("Q2 is the drag-drop occupation picker sourcing from the occupations packs", () => {
    const q2 = QUESTION_DEFINITIONS.find((d) => d.id === "q2");
    expect(q2.pickType).toBe("drag-drop");
    expect(q2.stateField).toBe("q2_occupation_uuid");
    expect(q2.markerFlag).toBe("q2OccupationItem");
    expect(q2.required).toBe(false);
    // Occupations live in the public naruto-d20 module (occupations +
    // occupations-community); kaihou keeps only homebrew/exclusive clans.
    expect(Array.isArray(q2.browse)).toBe(true);
    expect(q2.browse.map((b) => b.id)).toEqual([
      "naruto-d20.occupations",
      "naruto-d20.occupations-community",
      "naruto-d20-kaihou.occupations",
    ]);
    // The unused single-pack hint field is gone; drops are type-validated.
    expect(q2.pack).toBeUndefined();
  });

  it("entries with pickType !== 'none' have a stateField (besides narratives)", () => {
    for (const d of QUESTION_DEFINITIONS) {
      if (d.pickType !== "none") {
        const isString = typeof d.stateField === "string";
        const isArray = Array.isArray(d.stateField) && d.stateField.length > 0;
        expect(isString || isArray).toBe(true);
      }
    }
  });

  it("nested entries have a subPicker definition", () => {
    for (const d of QUESTION_DEFINITIONS) {
      if (d.pickType === "nested") {
        expect(d.subPicker).toBeDefined();
        expect(typeof d.subPicker.stateField).toBe("string");
      }
    }
  });
});

describe("browse config kind validation", () => {
  const ALLOWED_KINDS = ["pack", "pf1Browser", "compendium"];
  const questions = QUESTION_DEFINITIONS;

  // `browse` may be a single config or an array of targets (one button each).
  const collectBrowses = (q) => {
    const out = [];
    if (q.browse) out.push(...(Array.isArray(q.browse) ? q.browse : [q.browse]));
    if (Array.isArray(q.zones)) for (const z of q.zones) if (z.browse) out.push(z.browse);
    return out;
  };

  it("every browse config uses an allowed kind", () => {
    for (const q of questions) {
      for (const b of collectBrowses(q)) {
        expect(ALLOWED_KINDS).toContain(b.kind);
      }
    }
  });

  it("compendium-kind browse configs have a pack field", () => {
    for (const q of questions) {
      for (const b of collectBrowses(q)) {
        if (b.kind === "compendium") {
          expect(typeof b.pack).toBe("string");
          expect(b.pack.length).toBeGreaterThan(0);
        }
      }
    }
  });
});
