import {describe, it, expect, vi, beforeEach} from "vitest";

// Stub Foundry globals
globalThis.fromUuid = vi.fn().mockResolvedValue(null);
globalThis.ui = {notifications: {error: vi.fn(), warn: vi.fn()}};

// Mock game.packs for findCompendiumItemByName
const mockParentalInfluenceDoc = {
  toObject: () => ({
    name: "Parental Influence",
    type: "feat",
    system: {bonusSkillRank: 1},
    flags: {},
  }),
};

globalThis.game = {
  packs: {
    get: vi.fn((id) => {
      if (id === "naruto-d20-kaihou.questions") {
        return {
          getIndex: vi.fn().mockResolvedValue([
            {_id: "d2fe25f978a93d9a", name: "Parental Influence", type: "feat"},
          ]),
          getDocument: vi.fn().mockResolvedValue(mockParentalInfluenceDoc),
        };
      }
      return undefined;
    }),
  },
};

import {finishWizard, FinishValidationError} from "../../scripts/apps/wizard/finish-orchestrator.mjs";

function makeActor(overrides = {}) {
  return {
    items: [],
    system: {details: {biography: {value: ""}}},
    flags: {},
    update: vi.fn().mockResolvedValue(undefined),
    createEmbeddedDocuments: vi.fn().mockResolvedValue([]),
    deleteEmbeddedDocuments: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function validState() {
  return {
    q1_village_uuid: "bc053d4ef2995ea0",
    q4_affinity: "Fire",
    q7_relationship: "loyalist",
    q8_code: "adherent",
    q3_school_uuid: null,
    q2_occupation_uuid: null,
    q9_level1_feat_uuid: null,
    q10_flaw_uuid: null,
    q10_bonus_feat_uuid: null,
    q13_mentor_technique_uuid: null,
    q13_class_skill: null,
    q16_restricted_item_uuid: null,
    q18_heritage_roll: null,
    q18_heritage_locked_modifier: null,
    q7_outsider_class_skill: null,
    q8_sceptic_subskill: null,
    narratives: {
      q1: "", q2: "", q3: "", q4: "", q5: "", q6: "", q7: "", q8: "",
      q9: "", q10: "", q11: "", q12: "", q13: "", q14: "", q15: "",
      q16: "", q17: "", q18: "", q19: "", q20: "",
    },
  };
}

describe("finishWizard Q17 unconditional grant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("grants Parental Influence feat on finish", async () => {
    const actor = makeActor();
    await finishWizard(actor, validState());
    const allCreates = actor.createEmbeddedDocuments.mock.calls.flatMap(([, items]) => items);
    const pi = allCreates.find((i) => i.name === "Parental Influence");
    expect(pi).toBeDefined();
    expect(pi.flags["naruto-d20-kaihou"].wizard.q17ParentalInfluence).toBe(true);
  });

  it("does NOT re-grant Parental Influence if already present", async () => {
    const actor = makeActor({
      items: [
        {
          _id: "existing1",
          flags: {"naruto-d20-kaihou": {wizard: {q17ParentalInfluence: true}}},
        },
      ],
    });
    await finishWizard(actor, validState());
    const allCreates = actor.createEmbeddedDocuments.mock.calls.flatMap(([, items]) => items);
    const piList = allCreates.filter((i) => i.name === "Parental Influence");
    expect(piList).toHaveLength(0);
  });
});
