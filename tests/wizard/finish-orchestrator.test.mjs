import {describe, it, expect, vi, beforeEach} from "vitest";

// Stub Foundry globals
globalThis.fromUuid = vi.fn().mockResolvedValue(null);
globalThis.ui = {notifications: {error: vi.fn(), warn: vi.fn()}};

// Pack-feat stubs for the questions pack (Q7/Q8 stance feats + Q17 grant)
function makeQuestionsDoc(name, extraSystem = {}) {
  return {
    toObject: () => ({
      name,
      type: "feat",
      system: {subType: "trait", description: {value: "<p>x</p>"}, ...extraSystem},
      flags: {"naruto-d20-kaihou": {questionFeat: `slug-${name}`}},
    }),
  };
}

const QUESTIONS_INDEX = [
  {_id: "d2fe25f978a93d9a", name: "Parental Influence", type: "feat"},
  {_id: "aaaa000000000001", name: "Village Loyalist", type: "feat"},
  {_id: "aaaa000000000002", name: "Village Outsider", type: "feat"},
  {_id: "aaaa000000000003", name: "Code Adherent", type: "feat"},
  {_id: "aaaa000000000004", name: "Code Sceptic", type: "feat"},
];

const QUESTIONS_DOCS = {
  "d2fe25f978a93d9a": makeQuestionsDoc("Parental Influence", {bonusSkillRank: 1}),
  "aaaa000000000001": makeQuestionsDoc("Village Loyalist", {flags: {dictionary: {reputation: 1}}}),
  "aaaa000000000002": makeQuestionsDoc("Village Outsider"),
  "aaaa000000000003": makeQuestionsDoc("Code Adherent", {flags: {dictionary: {actionPoints: 2}}}),
  "aaaa000000000004": makeQuestionsDoc("Code Sceptic", {flags: {dictionary: {bonusSkillRank: 1}}}),
};

globalThis.game = {
  packs: {
    get: vi.fn((id) => {
      if (id === "naruto-d20-kaihou.questions") {
        return {
          getIndex: vi.fn().mockResolvedValue(QUESTIONS_INDEX),
          getDocument: vi.fn((docId) => Promise.resolve(QUESTIONS_DOCS[docId] ?? null)),
        };
      }
      return undefined;
    }),
  },
};

import {finishWizard} from "../../scripts/apps/wizard/finish-orchestrator.mjs";

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

describe("finishWizard Q7 loyalist — pack feat grant (no direct counter)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates Village Loyalist pack feat with wizard marker when q7=loyalist", async () => {
    const actor = makeActor();
    await finishWizard(actor, validState());
    const allCreates = actor.createEmbeddedDocuments.mock.calls.flatMap(([, items]) => items);
    const feat = allCreates.find((i) => i.name === "Village Loyalist");
    expect(feat).toBeDefined();
    expect(feat.flags["naruto-d20-kaihou"].wizard.q7Loyalist).toBe(true);
    // questionFeat stamp preserved from the pack doc
    expect(feat.flags["naruto-d20-kaihou"].questionFeat).toBeTruthy();
  });

  it("does NOT write flags.naruto-d20.reputation directly (engine handles it)", async () => {
    const actor = makeActor();
    await finishWizard(actor, validState());
    const allUpdates = actor.update.mock.calls.flatMap(([obj]) => Object.keys(obj));
    expect(allUpdates).not.toContain("flags.naruto-d20.reputation");
  });
});

describe("finishWizard Q8 adherent — pack feat grant (no direct counter)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates Code Adherent pack feat with wizard marker when q8=adherent", async () => {
    const actor = makeActor();
    await finishWizard(actor, validState());
    const allCreates = actor.createEmbeddedDocuments.mock.calls.flatMap(([, items]) => items);
    const feat = allCreates.find((i) => i.name === "Code Adherent");
    expect(feat).toBeDefined();
    expect(feat.flags["naruto-d20-kaihou"].wizard.q8Adherent).toBe(true);
  });

  it("does NOT write flags.naruto-d20.actionPoints directly (engine handles it)", async () => {
    const actor = makeActor();
    await finishWizard(actor, validState());
    const allUpdates = actor.update.mock.calls.flatMap(([obj]) => Object.keys(obj));
    expect(allUpdates).not.toContain("flags.naruto-d20.actionPoints");
  });
});

describe("finishWizard Q8 sceptic — pack feat grant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates Code Sceptic pack feat with wizard marker when q8=sceptic", async () => {
    const actor = makeActor();
    const state = {...validState(), q8_code: "sceptic"};
    await finishWizard(actor, state);
    const allCreates = actor.createEmbeddedDocuments.mock.calls.flatMap(([, items]) => items);
    const feat = allCreates.find((i) => i.name === "Code Sceptic");
    expect(feat).toBeDefined();
    expect(feat.flags["naruto-d20-kaihou"].wizard.q8Sceptic).toBe(true);
  });

  it("does NOT write q8BonusSkillPoints counter directly (engine handles it)", async () => {
    const actor = makeActor();
    const state = {...validState(), q8_code: "sceptic"};
    await finishWizard(actor, state);
    const allUpdates = actor.update.mock.calls.flatMap(([obj]) => Object.keys(obj));
    expect(allUpdates).not.toContain("flags.naruto-d20-kaihou.wizard.q8BonusSkillPoints");
  });
});
