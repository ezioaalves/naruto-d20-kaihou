import { describe, it, expect } from "vitest";
import {
  HERITAGE_OUTCOMES,
  getOutcomeByRoll,
  extractModifierDeltas,
} from "../../scripts/apps/wizard/heritage-table.mjs";

describe("HERITAGE_OUTCOMES", () => {
  it("has exactly 10 outcomes (rolls 1-10)", () => {
    expect(HERITAGE_OUTCOMES).toHaveLength(10);
    expect(HERITAGE_OUTCOMES.map((o) => o.roll)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("every outcome has roll, name, modifier, otherEffects", () => {
    for (const o of HERITAGE_OUTCOMES) {
      expect(typeof o.roll).toBe("number");
      expect(typeof o.name).toBe("string");
      expect(typeof o.modifier).toBe("string");
      expect(typeof o.otherEffects).toBe("string");
      expect(o.name.length).toBeGreaterThan(0);
      expect(o.modifier.length).toBeGreaterThan(0);
    }
  });

  it("outcome 1 is 'Famous Deed' with +1 Reputation", () => {
    const o = getOutcomeByRoll(1);
    expect(o.name).toBe("Famous Deed");
    expect(o.modifier).toMatch(/\+1 Reputation/i);
  });

  it("outcome 9 is 'Imperial Heritage' with +3 Action Points", () => {
    const o = getOutcomeByRoll(9);
    expect(o.name).toBe("Imperial Heritage");
    expect(o.modifier).toMatch(/\+3 Action Point/i);
  });
});

describe("extractModifierDeltas", () => {
  it("parses '+1 Reputation' as { deltaRep: 1, deltaAP: 0 }", () => {
    expect(extractModifierDeltas("+1 Reputation")).toEqual({ deltaRep: 1, deltaAP: 0 });
  });

  it("parses '+2 Action Points, +2 Reputation' as { deltaRep: 2, deltaAP: 2 }", () => {
    expect(extractModifierDeltas("+2 Action Points, +2 Reputation")).toEqual({ deltaRep: 2, deltaAP: 2 });
  });

  it("parses '-1 Reputation' as { deltaRep: -1, deltaAP: 0 }", () => {
    expect(extractModifierDeltas("-1 Reputation")).toEqual({ deltaRep: -1, deltaAP: 0 });
  });

  it("parses '-2 Action Points' as { deltaRep: 0, deltaAP: -2 }", () => {
    expect(extractModifierDeltas("-2 Action Points")).toEqual({ deltaRep: 0, deltaAP: -2 });
  });

  it("parses '-1 Reputation, +1 Action Point' (singular AP) as { deltaRep: -1, deltaAP: 1 }", () => {
    expect(extractModifierDeltas("-1 Reputation, +1 Action Point")).toEqual({ deltaRep: -1, deltaAP: 1 });
  });

  it("handles en-dash / em-dash minus signs the source might use", () => {
    expect(extractModifierDeltas("−2 Reputation")).toEqual({ deltaRep: -2, deltaAP: 0 });
    expect(extractModifierDeltas("—1 Action Point")).toEqual({ deltaRep: 0, deltaAP: -1 });
  });

  it("returns zero deltas for unparseable string (defensive)", () => {
    expect(extractModifierDeltas("Some unrelated text")).toEqual({ deltaRep: 0, deltaAP: 0 });
  });
});

describe("HERITAGE_OUTCOMES deltas (integration)", () => {
  it("all 10 outcomes parse to a meaningful delta (at least one non-zero component)", () => {
    for (const o of HERITAGE_OUTCOMES) {
      const d = extractModifierDeltas(o.modifier);
      expect(Math.abs(d.deltaRep) + Math.abs(d.deltaAP)).toBeGreaterThan(0);
    }
  });

  it("outcome 8 ('Stolen Knowledge') deltas to deltaAP: -2", () => {
    const o = getOutcomeByRoll(8);
    expect(extractModifierDeltas(o.modifier)).toEqual({ deltaRep: 0, deltaAP: -2 });
  });
});
