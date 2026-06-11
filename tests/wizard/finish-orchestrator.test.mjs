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
  {_id: "aaaa000000000005", name: "Mentor's Lesson", type: "feat"},
  // Q18 Namesake feats (roll 1 and roll 2 used by tests below)
  {_id: "bbbb000000000001", name: "Namesake: Famous Deed", type: "feat"},
  {_id: "bbbb000000000002", name: "Namesake: Glorious Sacrifice", type: "feat"},
];

const QUESTIONS_DOCS = {
  "d2fe25f978a93d9a": makeQuestionsDoc("Parental Influence", {bonusSkillRank: 1}),
  "aaaa000000000001": makeQuestionsDoc("Village Loyalist", {flags: {dictionary: {reputation: 1}}}),
  "aaaa000000000002": makeQuestionsDoc("Village Outsider"),
  "aaaa000000000003": makeQuestionsDoc("Code Adherent", {flags: {dictionary: {actionPoints: 2}}}),
  "aaaa000000000004": makeQuestionsDoc("Code Sceptic", {flags: {dictionary: {bonusSkillRank: 1}}}),
  "aaaa000000000005": makeQuestionsDoc("Mentor's Lesson"),
  "bbbb000000000001": makeQuestionsDoc("Namesake: Famous Deed", {flags: {dictionary: {reputation: 1}}}),
  "bbbb000000000002": makeQuestionsDoc("Namesake: Glorious Sacrifice", {flags: {dictionary: {reputation: 2, actionPoints: 2}}}),
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

describe("finishWizard Q18 heritage — grants Namesake pack feat (no direct counter)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates the Namesake pack feat with q18HeritageFeat marker when heritage roll is set", async () => {
    const actor = makeActor();
    const state = {...validState(), q18_heritage_roll: 1};
    await finishWizard(actor, state);
    const allCreates = actor.createEmbeddedDocuments.mock.calls.flatMap(([, items]) => items);
    const feat = allCreates.find((i) => i.name === "Namesake: Famous Deed");
    expect(feat).toBeDefined();
    expect(feat.flags["naruto-d20-kaihou"].wizard.q18HeritageFeat).toBe(true);
  });

  it("writes the roll snapshot flag but NO direct counter updates for reputation or actionPoints", async () => {
    const actor = makeActor();
    const state = {...validState(), q18_heritage_roll: 2};
    await finishWizard(actor, state);
    const allUpdates = actor.update.mock.calls.flatMap(([obj]) => Object.keys(obj));
    expect(allUpdates).not.toContain("flags.naruto-d20.reputation");
    expect(allUpdates).not.toContain("flags.naruto-d20.actionPoints");
    // Snapshot must be present
    expect(allUpdates).toContain("flags.naruto-d20-kaihou.wizard.q18Heritage");
  });

  it("snapshot flag records the correct roll and deltas", async () => {
    const actor = makeActor();
    const state = {...validState(), q18_heritage_roll: 2};
    await finishWizard(actor, state);
    const allUpdateArgs = actor.update.mock.calls.flatMap(([obj]) => obj);
    const snapshot = allUpdateArgs.find((obj) => obj?.["flags.naruto-d20-kaihou.wizard.q18Heritage"]);
    expect(snapshot?.["flags.naruto-d20-kaihou.wizard.q18Heritage"]).toEqual({
      roll: 2, deltaRep: 2, deltaAP: 2,
    });
  });
});

// ─── Re-answer replaces, never stacks ───────────────────────────────────────

/**
 * Build a mock actor that already has wizard-marker items on it, plus flags.
 * The required "unchanged" fields (q1, q4, q7 via items, q8 via items) are
 * pre-loaded so diffStates won't list them as changed.
 *
 * @param {Object} opts
 * @param {Object[]} opts.extraItems   - additional marker items beyond the baseline
 * @param {Object}  opts.extraFlags    - additional flags.naruto-d20-kaihou.wizard entries
 * @param {string}  opts.q7Rel         - "loyalist"|"outsider" for the baseline
 * @param {string}  opts.q8Code        - "adherent"|"sceptic" for the baseline
 * @param {string}  opts.q7OutsiderSkill - class skill if q7Rel="outsider"
 */
function makeActorWithState({
  extraItems = [],
  extraFlags = {},
  q7Rel = "loyalist",
  q8Code = "adherent",
  q7OutsiderSkill = null,
} = {}) {
  // Baseline marker items so q1/q7/q8 are "already set" on the actor.
  const baseItems = [
    // Q1 village marker (id matches validState().q1_village_uuid so diff sees it unchanged)
    {
      _id: "bc053d4ef2995ea0",
      name: "Test Village",
      type: "feat",
      flags: {"naruto-d20-kaihou": {wizard: {q1Village: true}}},
    },
  ];

  if (q7Rel === "loyalist") {
    baseItems.push({
      _id: "loy_base",
      name: "Village Loyalist",
      type: "feat",
      flags: {"naruto-d20-kaihou": {wizard: {q7Loyalist: true}}},
    });
  } else if (q7Rel === "outsider") {
    baseItems.push({
      _id: "out_base",
      name: "Village Outsider",
      type: "feat",
      flags: {"naruto-d20-kaihou": {wizard: {q7Outsider: true}}},
    });
  }

  if (q8Code === "adherent") {
    baseItems.push({
      _id: "adh_base",
      name: "Code Adherent",
      type: "feat",
      flags: {"naruto-d20-kaihou": {wizard: {q8Adherent: true}}},
    });
  } else if (q8Code === "sceptic") {
    baseItems.push({
      _id: "sep_base",
      name: "Code Sceptic",
      type: "feat",
      flags: {"naruto-d20-kaihou": {wizard: {q8Sceptic: true}}},
    });
  }

  const baseWizardFlags = {};
  if (q7OutsiderSkill) {
    baseWizardFlags.q7OutsiderClassSkill = q7OutsiderSkill;
  }

  return makeActor({
    items: [...baseItems, ...extraItems],
    flags: {
      "naruto-d20": {chakra: {nature: {primary: "Fire"}}},
      "naruto-d20-kaihou": {wizard: {...baseWizardFlags, ...extraFlags}},
    },
  });
}

/**
 * Returns a state that matches what loadFromActor would read back from
 * makeActorWithState, then applies overrides.
 */
function loadedState(actorOpts = {}, stateOverrides = {}) {
  const {q7Rel = "loyalist", q8Code = "adherent", q7OutsiderSkill = null} = actorOpts;

  const base = {
    ...validState(),
    // q1_village_uuid matches the marker item _id so it's NOT in changedFields
    q1_village_uuid: "bc053d4ef2995ea0",
    q4_affinity: "Fire",
    q7_relationship: q7Rel,
    q7_outsider_class_skill: q7OutsiderSkill,
    q8_code: q8Code,
  };
  return {...base, ...stateOverrides};
}

describe("re-answer replaces, never stacks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Test 1: Q7 switch loyalist → outsider ──────────────────────────────────
  it("Q7 switch: deletes old loyalist marker, creates Village Outsider, NOT Village Loyalist", async () => {
    // Actor already has the loyalist item with id "loy1"
    const loy1Item = {
      _id: "loy1",
      name: "Village Loyalist",
      type: "feat",
      flags: {"naruto-d20-kaihou": {wizard: {q7Loyalist: true}}},
    };
    const actor = makeActorWithState({
      // Override the baseline loyalist with our specific id
      q7Rel: "loyalist",
      q8Code: "adherent",
      extraItems: [],
    });
    // Replace the base loyalist item with our "loy1" id version
    actor.items = actor.items.filter(
      (i) => !i.flags?.["naruto-d20-kaihou"]?.wizard?.q7Loyalist
    );
    actor.items.push(loy1Item);

    const state = loadedState({q7Rel: "loyalist", q8Code: "adherent"}, {
      q7_relationship: "outsider",
      q7_outsider_class_skill: "sur",
    });

    await finishWizard(actor, state);

    const allDeletes = actor.deleteEmbeddedDocuments.mock.calls.flatMap(([, ids]) => ids);
    const allCreates = actor.createEmbeddedDocuments.mock.calls.flatMap(([, items]) => items);
    const createdNames = allCreates.map((i) => i.name);

    // Old loyalist must be deleted
    expect(allDeletes).toContain("loy1");
    // New outsider created
    expect(createdNames).toContain("Village Outsider");
    // Old loyalist NOT re-created
    expect(createdNames.filter((n) => n === "Village Loyalist")).toHaveLength(0);
  });

  // ── Test 2: Q18 re-roll ────────────────────────────────────────────────────
  it("Q18 re-roll: deletes old heritage feat, creates new one for the new roll", async () => {
    const h1Item = {
      _id: "h1",
      name: "Namesake: Glorious Sacrifice",
      type: "feat",
      flags: {"naruto-d20-kaihou": {wizard: {q18HeritageFeat: true}}},
    };
    const actor = makeActorWithState({
      q7Rel: "loyalist",
      q8Code: "adherent",
      extraItems: [h1Item],
      extraFlags: {q18Heritage: {roll: 2, deltaRep: 2, deltaAP: 2}},
    });

    // Actor already had roll=2; now re-answering with roll=1
    const state = loadedState({q7Rel: "loyalist", q8Code: "adherent"}, {
      q18_heritage_roll: 1,
      q18_heritage_locked_modifier: {deltaRep: 2, deltaAP: 2}, // old snapshot — will change
    });

    await finishWizard(actor, state);

    const allDeletes = actor.deleteEmbeddedDocuments.mock.calls.flatMap(([, ids]) => ids);
    const allCreates = actor.createEmbeddedDocuments.mock.calls.flatMap(([, items]) => items);
    const createdNames = allCreates.map((i) => i.name);

    expect(allDeletes).toContain("h1");
    expect(createdNames).toContain("Namesake: Famous Deed");
    // Old feat NOT re-created
    expect(createdNames.filter((n) => n === "Namesake: Glorious Sacrifice")).toHaveLength(0);
  });

  // ── Test 3: Q9 re-drop ────────────────────────────────────────────────────
  it("Q9 re-drop: deletes old feat item, creates new one from the new ref", async () => {
    const old9Item = {
      _id: "old9",
      name: "Old Feat",
      type: "feat",
      flags: {"naruto-d20-kaihou": {wizard: {q9Level1Feat: true}}},
    };
    // New feat via fromUuid
    const newFeatDoc = {
      toObject: () => ({
        name: "New Feat",
        type: "feat",
        system: {},
        flags: {},
      }),
    };
    globalThis.fromUuid = vi.fn().mockImplementation((uuid) => {
      if (uuid === "Item.newFeatUuid") return Promise.resolve(newFeatDoc);
      return Promise.resolve(null);
    });

    const actor = makeActorWithState({
      q7Rel: "loyalist",
      q8Code: "adherent",
      extraItems: [old9Item],
    });
    // loadFromActor sees q9_level1_feat_uuid = "old9" (string id)
    const state = loadedState({q7Rel: "loyalist", q8Code: "adherent"}, {
      q9_level1_feat_uuid: {uuid: "Item.newFeatUuid", _id: "newFeat", name: "New Feat"},
    });
    // Patch actor.items so q9 old value = "old9" (string) — already there from marker item

    await finishWizard(actor, state);

    const allDeletes = actor.deleteEmbeddedDocuments.mock.calls.flatMap(([, ids]) => ids);
    const allCreates = actor.createEmbeddedDocuments.mock.calls.flatMap(([, items]) => items);
    const createdNames = allCreates.map((i) => i.name);

    expect(allDeletes).toContain("old9");
    expect(createdNames).toContain("New Feat");
  });

  // ── Test 4: Q7 sub-field only ────────────────────────────────────────────
  it("Q7 sub-field only: changing q7_outsider_class_skill reverts old outsider, creates new one with new skill", async () => {
    // Actor is already "outsider" with skill "sur"
    const out1Item = {
      _id: "out1",
      name: "Village Outsider",
      type: "feat",
      flags: {"naruto-d20-kaihou": {wizard: {q7Outsider: true}}},
    };
    const actor = makeActorWithState({
      q7Rel: "outsider",
      q8Code: "adherent",
      q7OutsiderSkill: "sur",
      extraItems: [],
    });
    // Replace baseline outsider with our "out1"
    actor.items = actor.items.filter(
      (i) => !i.flags?.["naruto-d20-kaihou"]?.wizard?.q7Outsider
    );
    actor.items.push(out1Item);

    // State: relationship unchanged (still "outsider"), only class skill changes
    const state = loadedState(
      {q7Rel: "outsider", q8Code: "adherent", q7OutsiderSkill: "sur"},
      {q7_outsider_class_skill: "ste"}
    );

    await finishWizard(actor, state);

    const allDeletes = actor.deleteEmbeddedDocuments.mock.calls.flatMap(([, ids]) => ids);
    const allCreates = actor.createEmbeddedDocuments.mock.calls.flatMap(([, items]) => items);
    const outsiderCreates = allCreates.filter((i) => i.name === "Village Outsider");

    // Old outsider item deleted
    expect(allDeletes).toContain("out1");
    // Exactly ONE new outsider created (not stacked)
    expect(outsiderCreates).toHaveLength(1);
    // The new outsider has the new class skill
    expect(outsiderCreates[0].system?.classSkills?.ste).toBe(true);
  });

  // ── Test 5: Clear optional question ──────────────────────────────────────
  it("Clear Q16: deletes old restricted item marker, creates nothing for q16", async () => {
    const it1Item = {
      _id: "it1",
      name: "Restricted Sword",
      type: "weapon",
      flags: {"naruto-d20-kaihou": {wizard: {q16RestrictedItem: true}}},
    };
    const actor = makeActorWithState({
      q7Rel: "loyalist",
      q8Code: "adherent",
      extraItems: [it1Item],
    });
    // loadFromActor sees q16_restricted_item_uuid = "it1" (string)
    // We finish with q16 cleared to null
    const state = loadedState({q7Rel: "loyalist", q8Code: "adherent"}, {
      q16_restricted_item_uuid: null,
    });
    // Force the loaded "old" state to have the item set so diff sees a change.
    // We do that by having the item with marker on the actor (which loadFromActor will read).

    await finishWizard(actor, state);

    const allDeletes = actor.deleteEmbeddedDocuments.mock.calls.flatMap(([, ids]) => ids);
    const allCreates = actor.createEmbeddedDocuments.mock.calls.flatMap(([, items]) => items);
    const q16Creates = allCreates.filter(
      (i) => i.flags?.["naruto-d20-kaihou"]?.wizard?.q16RestrictedItem === true
    );

    expect(allDeletes).toContain("it1");
    expect(q16Creates).toHaveLength(0);
  });
});
