import { describe, it, expect } from "vitest";
import { buildAnswerRows } from "../../scripts/apps/wizard/answer-summary.mjs";

function markedItem(_id, markerKey, name) {
  return { _id, name, flags: { "naruto-d20-kaihou": { wizard: { [markerKey]: true } } } };
}

describe("buildAnswerRows", () => {
  it("returns empty array for an untouched actor", () => {
    expect(buildAnswerRows({ items: [], flags: {}, system: {} })).toEqual([]);
  });

  it("summarises mechanical picks from marker items", () => {
    const actor = {
      items: [
        markedItem("v1", "q1Village", "Kanigakure"),
        markedItem("o1", "q2OccupationItem", "Crab Fisherman"),
        markedItem("f1", "q9Level1Feat", "Dodge"),
      ],
      flags: {},
      system: {},
    };
    const rows = buildAnswerRows(actor);
    expect(rows.find((r) => r.qid === "q1").mechanical).toBe("Kanigakure");
    expect(rows.find((r) => r.qid === "q2").mechanical).toBe("Crab Fisherman");
    expect(rows.find((r) => r.qid === "q9").mechanical).toBe("Dodge");
  });

  it("maps q4 affinity value to its Japanese label", () => {
    const actor = {
      items: [],
      flags: { "naruto-d20": { chakra: { nature: { primary: "Lightning" } } } },
      system: {},
    };
    const rows = buildAnswerRows(actor);
    expect(rows.find((r) => r.qid === "q4").mechanical).toBe("Raiton");
  });

  it("summarises q7 outsider with the chosen class-skill label", () => {
    const actor = {
      items: [markedItem("s1", "q7Outsider", "Village Outsider")],
      flags: { "naruto-d20-kaihou": { wizard: { q7OutsiderClassSkill: "sur" } } },
      system: {},
    };
    const rows = buildAnswerRows(actor);
    expect(rows.find((r) => r.qid === "q7").mechanical).toContain("Village Outsider");
    expect(rows.find((r) => r.qid === "q7").mechanical).toContain("Survival");
  });

  it("summarises q10 flaw + bonus feat as a pair", () => {
    const actor = {
      items: [
        markedItem("fl1", "q10Flaw", "Hot-Headed"),
        markedItem("bf1", "q10BonusFeat", "Iron Will"),
      ],
      flags: {},
      system: {},
    };
    expect(buildAnswerRows(actor).find((r) => r.qid === "q10").mechanical).toBe(
      "Hot-Headed + Iron Will"
    );
  });

  it("summarises q18 from the heritage snapshot roll", () => {
    const actor = {
      items: [],
      flags: { "naruto-d20-kaihou": { wizard: { q18Heritage: { roll: 9, deltaRep: 0, deltaAP: 3 } } } },
      system: {},
    };
    expect(buildAnswerRows(actor).find((r) => r.qid === "q18").mechanical).toBe(
      "Namesake: Imperial Heritage"
    );
  });

  it("includes narratives from flags alongside mechanical rows", () => {
    const actor = {
      items: [markedItem("v1", "q1Village", "Kanigakure")],
      flags: { "naruto-d20-kaihou": { wizard: { narratives: { q1: "Born by the sea.", q5: "Protect the heir." } } } },
      system: {},
    };
    const rows = buildAnswerRows(actor);
    expect(rows.find((r) => r.qid === "q1")).toMatchObject({ mechanical: "Kanigakure", narrative: "Born by the sea." });
    expect(rows.find((r) => r.qid === "q5")).toMatchObject({ narrative: "Protect the heir." });
  });

  it("falls back to parsing legacy bio HTML for narratives when flags absent", () => {
    const actor = {
      items: [],
      flags: {},
      system: { details: { biography: { value: '<!-- 20Q:START --><h3 data-q="5">Q5</h3><p>Old answer.</p><!-- 20Q:END -->' } } },
    };
    expect(buildAnswerRows(actor).find((r) => r.qid === "q5").narrative).toBe("Old answer.");
  });
});
