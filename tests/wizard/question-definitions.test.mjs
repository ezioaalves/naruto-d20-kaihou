import { describe, it, expect } from "vitest";
import { QUESTION_DEFINITIONS } from "../../scripts/wizard/question-definitions.mjs";

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

  it("every entry has narrativePrompt (non-empty string)", () => {
    for (const d of QUESTION_DEFINITIONS) {
      expect(typeof d.narrativePrompt).toBe("string");
      expect(d.narrativePrompt.length).toBeGreaterThan(0);
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
