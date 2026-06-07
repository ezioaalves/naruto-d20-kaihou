import { describe, it, expect } from "vitest";
import { defaultState, loadFromActor } from "../../scripts/wizard/wizard-state.mjs";

describe("defaultState", () => {
  it("returns null for all mechanical fields", () => {
    const s = defaultState();
    expect(s.q1_village_uuid).toBeNull();
    expect(s.q3_human_bonus_feat_uuid).toBeNull();
    expect(s.q4_affinity).toBeNull();
    expect(s.q7_relationship).toBeNull();
    expect(s.q7_outsider_class_skill).toBeNull();
    expect(s.q8_code).toBeNull();
    expect(s.q8_sceptic_subskill).toBeNull();
    expect(s.q9_level1_feat_uuid).toBeNull();
    expect(s.q10_flaw_uuid).toBeNull();
    expect(s.q10_bonus_feat_uuid).toBeNull();
    expect(s.q13_mentor_technique_uuid).toBeNull();
    expect(s.q13_class_skill).toBeNull();
    expect(s.q16_restricted_item_uuid).toBeNull();
    expect(s.q17_skill_key).toBeNull();
    expect(s.q18_heritage_roll).toBeNull();
    expect(s.q18_heritage_locked_modifier).toBeNull();
  });

  it("returns empty strings for all 20 narratives", () => {
    const s = defaultState();
    for (let i = 1; i <= 20; i++) {
      expect(s.narratives[`q${i}`]).toBe("");
    }
  });

  it("returns independent objects (no shared reference)", () => {
    const a = defaultState();
    const b = defaultState();
    a.q1_village_uuid = "test";
    a.narratives.q1 = "test";
    expect(b.q1_village_uuid).toBeNull();
    expect(b.narratives.q1).toBe("");
  });
});

describe("loadFromActor", () => {
  function mockActor(overrides = {}) {
    return {
      items: [],
      system: { details: { biography: { value: "" } }, skills: {} },
      flags: {},
      ...overrides,
    };
  }

  it("returns defaultState for an empty actor", () => {
    const s = loadFromActor(mockActor());
    expect(s.q1_village_uuid).toBeNull();
    expect(s.q4_affinity).toBeNull();
  });

  it("loads q4_affinity from flags.naruto-d20.chakra.nature.primary", () => {
    const actor = mockActor({
      flags: { "naruto-d20": { chakra: { nature: { primary: "Lightning" } } } },
    });
    expect(loadFromActor(actor).q4_affinity).toBe("Lightning");
  });

  it("loads q1_village_uuid from item with q1Village marker flag", () => {
    const actor = mockActor({
      items: [
        { _id: "abc123", flags: { "naruto-d20-kaihou": { wizard: { q1Village: true } } } },
      ],
    });
    expect(loadFromActor(actor).q1_village_uuid).toBe("abc123");
  });

  it("loads q7_relationship + q7_outsider_class_skill from marker + flag snapshot", () => {
    const actor = mockActor({
      items: [
        { _id: "out1", flags: { "naruto-d20-kaihou": { wizard: { q7Outsider: true } } } },
      ],
      flags: { "naruto-d20-kaihou": { wizard: { q7OutsiderClassSkill: "sur" } } },
    });
    const s = loadFromActor(actor);
    expect(s.q7_relationship).toBe("outsider");
    expect(s.q7_outsider_class_skill).toBe("sur");
  });

  it("loads q8_code = adherent from marker (no subskill expected)", () => {
    const actor = mockActor({
      items: [
        { _id: "adh1", flags: { "naruto-d20-kaihou": { wizard: { q8Adherent: true } } } },
      ],
    });
    expect(loadFromActor(actor).q8_code).toBe("adherent");
    expect(loadFromActor(actor).q8_sceptic_subskill).toBeNull();
  });

  it("loads q18_heritage_roll + locked modifier from snapshot", () => {
    const actor = mockActor({
      flags: {
        "naruto-d20-kaihou": {
          wizard: { q18Heritage: { roll: 9, deltaRep: 0, deltaAP: 3 } },
        },
      },
    });
    const s = loadFromActor(actor);
    expect(s.q18_heritage_roll).toBe(9);
    expect(s.q18_heritage_locked_modifier).toEqual({ deltaRep: 0, deltaAP: 3 });
  });

  it("parses narratives from biography <h3 data-q='N'><p>…</p> blocks", () => {
    const actor = mockActor({
      system: {
        details: {
          biography: {
            value:
              '<h2>20 Questions</h2>' +
              '<h3 data-q="1">Q1: Where are you from?</h3><p>I am from the Iron Shell.</p>' +
              '<h3 data-q="5">Q5: Shinobido</h3><p>Protect the heir.</p>',
          },
        },
        skills: {},
      },
    });
    const s = loadFromActor(actor);
    expect(s.narratives.q1).toBe("I am from the Iron Shell.");
    expect(s.narratives.q5).toBe("Protect the heir.");
    expect(s.narratives.q2).toBe("");
  });
});
