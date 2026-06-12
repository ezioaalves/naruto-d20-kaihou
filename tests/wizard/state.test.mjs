import { describe, it, expect } from "vitest";
import { defaultState, loadFromActor, diffStates, validate, canJumpTo, jumpTo } from "../../scripts/apps/wizard/wizard-state.mjs";

describe("defaultState", () => {
  it("initializes currentId to q1 (first Next must advance, not re-land)", () => {
    expect(defaultState().currentId).toBe("q1");
  });

  it("returns null for all mechanical fields", () => {
    const s = defaultState();
    expect(s.q1_village_uuid).toBeNull();
    expect(s.q2_occupation_uuid).toBeNull();
    expect(s.q3_school_uuid).toBeNull();
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

  it("loads q2_occupation_uuid from item with q2OccupationItem marker flag", () => {
    const actor = mockActor({
      items: [
        { _id: "occ1", flags: { "naruto-d20-kaihou": { wizard: { q2OccupationItem: true } } } },
      ],
    });
    expect(loadFromActor(actor).q2_occupation_uuid).toBe("occ1");
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

  it("loads q13_mentor_technique_uuid from item with q13Mentor marker (applier round-trip)", () => {
    const actor = mockActor({
      items: [
        { _id: "tech1", flags: { "naruto-d20-kaihou": { wizard: { q13Mentor: true } } } },
      ],
      flags: { "naruto-d20-kaihou": { wizard: { q13ClassSkill: "gen" } } },
    });
    const s = loadFromActor(actor);
    expect(s.q13_mentor_technique_uuid).toBe("tech1");
    expect(s.q13_class_skill).toBe("gen");
  });

  it("prefers narratives from module flags over biography HTML", () => {
    const actor = mockActor({
      flags: { "naruto-d20-kaihou": { wizard: { narratives: { q5: "From flags." } } } },
      system: {
        details: { biography: { value: '<h3 data-q="5">Q5</h3><p>From bio.</p>' } },
        skills: {},
      },
    });
    expect(loadFromActor(actor).narratives.q5).toBe("From flags.");
  });

  it("falls back to biography parsing when the narratives flag is absent", () => {
    const actor = mockActor({
      system: {
        details: { biography: { value: '<h3 data-q="5">Q5</h3><p>From bio.</p>' } },
        skills: {},
      },
    });
    expect(loadFromActor(actor).narratives.q5).toBe("From bio.");
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

describe("diffStates", () => {
  it("returns empty change list for identical states", () => {
    const a = defaultState();
    const b = defaultState();
    expect(diffStates(a, b).changedFields).toEqual([]);
  });

  it("detects q4_affinity change", () => {
    const a = defaultState();
    const b = defaultState();
    b.q4_affinity = "Fire";
    const d = diffStates(a, b);
    expect(d.changedFields).toContain("q4_affinity");
    expect(d.changes.q4_affinity).toEqual({ from: null, to: "Fire" });
  });

  it("detects multiple changes including nested narratives", () => {
    const a = defaultState();
    const b = defaultState();
    b.q1_village_uuid = "abc";
    b.q7_relationship = "loyalist";
    b.narratives.q5 = "Protect the heir";
    const d = diffStates(a, b);
    expect(d.changedFields.sort()).toEqual(
      ["narratives.q5", "q1_village_uuid", "q7_relationship"].sort()
    );
  });
});

describe("validate", () => {
  function withRequiredFilled(overrides = {}) {
    const s = defaultState();
    s.q1_village_uuid = "village-uuid";
    s.q4_affinity = "Fire";
    s.q7_relationship = "loyalist";
    s.q8_code = "adherent";
    return { ...s, ...overrides };
  }

  it("passes when all 4 required fields filled and no nested-sub triggered", () => {
    expect(validate(withRequiredFilled())).toEqual({ ok: true, errors: [] });
  });

  it("fails when q1_village_uuid is null", () => {
    const s = withRequiredFilled({ q1_village_uuid: null });
    const r = validate(s);
    expect(r.ok).toBe(false);
    expect(r.errors).toContainEqual({ field: "q1_village_uuid", code: "REQUIRED" });
  });

  it("fails when q4_affinity is null", () => {
    const s = withRequiredFilled({ q4_affinity: null });
    const r = validate(s);
    expect(r.ok).toBe(false);
    expect(r.errors).toContainEqual({ field: "q4_affinity", code: "REQUIRED" });
  });

  it("requires q7_outsider_class_skill when q7_relationship === 'outsider'", () => {
    const s = withRequiredFilled({ q7_relationship: "outsider", q7_outsider_class_skill: null });
    const r = validate(s);
    expect(r.ok).toBe(false);
    expect(r.errors).toContainEqual({ field: "q7_outsider_class_skill", code: "SUB_REQUIRED" });
  });

  it("does not require q7_outsider_class_skill when q7_relationship === 'loyalist'", () => {
    const s = withRequiredFilled({ q7_relationship: "loyalist", q7_outsider_class_skill: null });
    expect(validate(s).ok).toBe(true);
  });

  it("does NOT require q8_sceptic_subskill — sceptic now grants 1 unallocated bonus skill point", () => {
    const s = withRequiredFilled({ q8_code: "sceptic", q8_sceptic_subskill: null });
    expect(validate(s).ok).toBe(true);
  });

  it("requires q13_class_skill when q13_mentor_technique_uuid is set", () => {
    const s = withRequiredFilled({
      q13_mentor_technique_uuid: "tech-uuid",
      q13_class_skill: null,
    });
    const r = validate(s);
    expect(r.errors).toContainEqual({ field: "q13_class_skill", code: "SUB_REQUIRED" });
  });

  it("rejects Q10 partial: flaw set but bonus feat null", () => {
    const s = withRequiredFilled({ q10_flaw_uuid: "flaw-uuid", q10_bonus_feat_uuid: null });
    const r = validate(s);
    expect(r.errors).toContainEqual({ field: "q10", code: "Q10_COUPLED" });
  });

  it("rejects Q10 partial: bonus feat set but flaw null", () => {
    const s = withRequiredFilled({ q10_flaw_uuid: null, q10_bonus_feat_uuid: "bonus-uuid" });
    const r = validate(s);
    expect(r.errors).toContainEqual({ field: "q10", code: "Q10_COUPLED" });
  });

  it("accepts Q10 both filled", () => {
    const s = withRequiredFilled({ q10_flaw_uuid: "flaw-uuid", q10_bonus_feat_uuid: "bonus-uuid" });
    expect(validate(s).ok).toBe(true);
  });

  it("accepts Q10 both null", () => {
    expect(validate(withRequiredFilled()).ok).toBe(true);
  });
});

describe("canJumpTo", () => {
  it("returns true when target is the current question", () => {
    const state = defaultState();
    state.currentId = "q3";
    expect(canJumpTo(state, "q3")).toBe(true);
  });

  it("returns true when target is an answered question", () => {
    const state = defaultState();
    state.currentId = "q5";
    state.q1_village = "kani";
    expect(canJumpTo(state, "q1")).toBe(true);
  });

  it("returns false for an unanswered future question", () => {
    const state = defaultState();
    state.currentId = "q3";
    expect(canJumpTo(state, "q10")).toBe(false);
  });

  it("returns false for an unknown qid", () => {
    const state = defaultState();
    expect(canJumpTo(state, "q99")).toBe(false);
  });
});

describe("jumpTo", () => {
  it("sets currentId when the jump is allowed", () => {
    const state = defaultState();
    state.currentId = "q5";
    state.q1_village = "kani";
    const next = jumpTo(state, "q1");
    expect(next.currentId).toBe("q1");
  });

  it("throws when the jump is disallowed", () => {
    const state = defaultState();
    state.currentId = "q3";
    expect(() => jumpTo(state, "q10")).toThrow();
  });
});
