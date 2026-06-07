import { describe, it, expect } from "vitest";
import {
  emptyPlan,
  applyQ4Affinity,
  revertQ4Affinity,
  applyQ7Loyalist,
  revertQ7Loyalist,
  applyQ8Adherent,
  revertQ8Adherent,
  applyQ1Village,
  revertQ1Village,
  applyQ7Outsider,
  revertQ7Outsider,
  applyQ8Sceptic,
  revertQ8Sceptic,
  applyDragDropFeat,
  revertDragDropFeat,
  applyQ10Coupled,
  revertQ10Coupled,
  applyQ13Mentor,
  revertQ13Mentor,
  applyQ17SkillBump,
  revertQ17SkillBump,
  listZeroRankSkills,
} from "../../scripts/wizard/mechanic-applier.mjs";

function mockActor(overrides = {}) {
  return {
    items: [],
    flags: {},
    system: { details: { biography: { value: "" } }, skills: {}, classSkills: {} },
    ...overrides,
  };
}

describe("emptyPlan", () => {
  it("returns a plan with empty updates, creates, deletes", () => {
    const p = emptyPlan();
    expect(p).toEqual({ updates: {}, creates: [], deletes: [] });
  });
});

describe("Q4 Affinity (flag-only)", () => {
  it("apply sets flags.naruto-d20.chakra.nature.primary", () => {
    const p = applyQ4Affinity(mockActor(), "Fire");
    expect(p.updates["flags.naruto-d20.chakra.nature.primary"]).toBe("Fire");
    expect(p.creates).toEqual([]);
    expect(p.deletes).toEqual([]);
  });

  it("revert sets flag to empty string", () => {
    const p = revertQ4Affinity(mockActor());
    expect(p.updates["flags.naruto-d20.chakra.nature.primary"]).toBe("");
  });
});

describe("Q7 Loyalist (item add + reputation +1)", () => {
  it("apply creates the marker item with q7Loyalist flag and bumps reputation", () => {
    const actor = mockActor({ flags: { "naruto-d20": { reputation: 3 } } });
    const p = applyQ7Loyalist(actor, "marker-item-data");
    expect(p.updates["flags.naruto-d20.reputation"]).toBe(4);
    expect(p.creates).toHaveLength(1);
    expect(p.creates[0].flags["naruto-d20-kaihou"].wizard.q7Loyalist).toBe(true);
  });

  it("apply with current reputation undefined treats as 0 (+1 → 1)", () => {
    const actor = mockActor();
    const p = applyQ7Loyalist(actor, "marker-data");
    expect(p.updates["flags.naruto-d20.reputation"]).toBe(1);
  });

  it("revert removes the marker item and decrements reputation by 1", () => {
    const actor = mockActor({
      flags: { "naruto-d20": { reputation: 5 } },
      items: [
        { _id: "old-marker", flags: { "naruto-d20-kaihou": { wizard: { q7Loyalist: true } } } },
      ],
    });
    const p = revertQ7Loyalist(actor);
    expect(p.deletes).toContain("old-marker");
    expect(p.updates["flags.naruto-d20.reputation"]).toBe(4);
  });

  it("revert on actor with no Loyalist item returns empty deletes but still decrements", () => {
    const actor = mockActor({ flags: { "naruto-d20": { reputation: 2 } } });
    const p = revertQ7Loyalist(actor);
    expect(p.deletes).toEqual([]);
    expect(p.updates["flags.naruto-d20.reputation"]).toBe(1);
  });
});

describe("Q8 Adherent (item add + actionPoints +2)", () => {
  it("apply creates the marker item and bumps actionPoints by 2", () => {
    const actor = mockActor({ flags: { "naruto-d20": { actionPoints: 5 } } });
    const p = applyQ8Adherent(actor, "marker-data");
    expect(p.updates["flags.naruto-d20.actionPoints"]).toBe(7);
    expect(p.creates).toHaveLength(1);
    expect(p.creates[0].flags["naruto-d20-kaihou"].wizard.q8Adherent).toBe(true);
  });

  it("revert removes marker and subtracts 2 from actionPoints", () => {
    const actor = mockActor({
      flags: { "naruto-d20": { actionPoints: 8 } },
      items: [
        { _id: "adh-marker", flags: { "naruto-d20-kaihou": { wizard: { q8Adherent: true } } } },
      ],
    });
    const p = revertQ8Adherent(actor);
    expect(p.deletes).toContain("adh-marker");
    expect(p.updates["flags.naruto-d20.actionPoints"]).toBe(6);
  });
});

describe("Q1 Village (item add only)", () => {
  it("apply adds village item with q1Village marker", () => {
    const actor = mockActor();
    const villageItemData = { name: "Kanigakure", type: "feat" };
    const p = applyQ1Village(actor, villageItemData);
    expect(p.creates).toHaveLength(1);
    expect(p.creates[0].flags["naruto-d20-kaihou"].wizard.q1Village).toBe(true);
    expect(Object.keys(p.updates)).toHaveLength(0);
  });

  it("revert deletes the village item", () => {
    const actor = mockActor({
      items: [{ _id: "vil1", flags: { "naruto-d20-kaihou": { wizard: { q1Village: true } } } }],
    });
    const p = revertQ1Village(actor);
    expect(p.deletes).toContain("vil1");
  });
});

describe("Q7 Outsider (item add + classSkill + snapshot)", () => {
  it("apply adds marker item, sets classSkills[<key>] = true, snapshots the key", () => {
    const p = applyQ7Outsider(mockActor(), { name: "Outsider", type: "feat" }, "sur");
    expect(p.updates["system.classSkills.sur"]).toBe(true);
    expect(p.updates["flags.naruto-d20-kaihou.wizard.q7OutsiderClassSkill"]).toBe("sur");
    expect(p.creates[0].flags["naruto-d20-kaihou"].wizard.q7Outsider).toBe(true);
  });

  it("revert deletes item, unsets classSkill from snapshot, clears snapshot", () => {
    const actor = mockActor({
      items: [{ _id: "out1", flags: { "naruto-d20-kaihou": { wizard: { q7Outsider: true } } } }],
      flags: { "naruto-d20-kaihou": { wizard: { q7OutsiderClassSkill: "sur" } } },
    });
    const p = revertQ7Outsider(actor);
    expect(p.deletes).toContain("out1");
    expect(p.updates["system.classSkills.sur"]).toBe(false);
    expect(p.updates["flags.naruto-d20-kaihou.wizard.q7OutsiderClassSkill"]).toBeNull();
  });

  it("revert with no snapshot does NOT touch classSkills", () => {
    const actor = mockActor({
      items: [{ _id: "out2", flags: { "naruto-d20-kaihou": { wizard: { q7Outsider: true } } } }],
    });
    const p = revertQ7Outsider(actor);
    expect(p.deletes).toContain("out2");
    expect(Object.keys(p.updates).some((k) => k.startsWith("system.classSkills"))).toBe(false);
  });
});

describe("Q8 Sceptic (item add + subskill rank +1 + snapshot)", () => {
  it("apply adds marker, bumps subskill rank, snapshots subskill key", () => {
    const actor = mockActor({
      system: { skills: { crf: { subSkills: { armor: { rank: 2 } } } }, classSkills: {} },
    });
    const p = applyQ8Sceptic(actor, { name: "Sceptic", type: "feat" }, "crf.subSkills.armor");
    expect(p.updates["system.skills.crf.subSkills.armor.rank"]).toBe(3);
    expect(p.updates["flags.naruto-d20-kaihou.wizard.q8ScepticSubskill"]).toBe("crf.subSkills.armor");
    expect(p.creates[0].flags["naruto-d20-kaihou"].wizard.q8Sceptic).toBe(true);
  });

  it("apply on subskill that didn't exist treats current as 0 (bump to 1)", () => {
    const p = applyQ8Sceptic(mockActor(), { name: "S", type: "feat" }, "pro.subSkills.scribe");
    expect(p.updates["system.skills.pro.subSkills.scribe.rank"]).toBe(1);
  });

  it("revert subtracts 1 from subskill rank using snapshot", () => {
    const actor = mockActor({
      system: { skills: { crf: { subSkills: { armor: { rank: 3 } } } }, classSkills: {} },
      items: [{ _id: "scp1", flags: { "naruto-d20-kaihou": { wizard: { q8Sceptic: true } } } }],
      flags: { "naruto-d20-kaihou": { wizard: { q8ScepticSubskill: "crf.subSkills.armor" } } },
    });
    const p = revertQ8Sceptic(actor);
    expect(p.deletes).toContain("scp1");
    expect(p.updates["system.skills.crf.subSkills.armor.rank"]).toBe(2);
    expect(p.updates["flags.naruto-d20-kaihou.wizard.q8ScepticSubskill"]).toBeNull();
  });

  it("revert floors rank at 0 (no negatives)", () => {
    const actor = mockActor({
      system: { skills: { crf: { subSkills: { armor: { rank: 0 } } } }, classSkills: {} },
      flags: { "naruto-d20-kaihou": { wizard: { q8ScepticSubskill: "crf.subSkills.armor" } } },
    });
    const p = revertQ8Sceptic(actor);
    expect(p.updates["system.skills.crf.subSkills.armor.rank"]).toBe(0);
  });
});

describe("applyDragDropFeat / revertDragDropFeat (used for Q3, Q9, Q16)", () => {
  it("apply adds item with the given marker flag", () => {
    const p = applyDragDropFeat({ name: "Animal Bond", type: "feat" }, "q3HumanBonusFeat");
    expect(p.creates).toHaveLength(1);
    expect(p.creates[0].name).toBe("Animal Bond");
    expect(p.creates[0].flags["naruto-d20-kaihou"].wizard.q3HumanBonusFeat).toBe(true);
  });

  it("revert deletes item matched by marker flag", () => {
    const actor = mockActor({
      items: [{ _id: "feat1", flags: { "naruto-d20-kaihou": { wizard: { q9Level1Feat: true } } } }],
    });
    const p = revertDragDropFeat(actor, "q9Level1Feat");
    expect(p.deletes).toContain("feat1");
  });

  it("revert with no matching item returns empty plan", () => {
    const p = revertDragDropFeat(mockActor(), "q3HumanBonusFeat");
    expect(p).toEqual({ updates: {}, creates: [], deletes: [] });
  });
});

describe("Q10 coupled (flaw + bonus feat)", () => {
  it("apply adds both items with respective markers", () => {
    const flaw = { name: "Anxious", type: "feat" };
    const bonus = { name: "Iron Will", type: "feat" };
    const p = applyQ10Coupled(flaw, bonus);
    expect(p.creates).toHaveLength(2);
    const flawCreated = p.creates.find((c) => c.name === "Anxious");
    const bonusCreated = p.creates.find((c) => c.name === "Iron Will");
    expect(flawCreated.flags["naruto-d20-kaihou"].wizard.q10Flaw).toBe(true);
    expect(bonusCreated.flags["naruto-d20-kaihou"].wizard.q10BonusFeat).toBe(true);
  });

  it("revert deletes both items if present", () => {
    const actor = mockActor({
      items: [
        { _id: "fl1", flags: { "naruto-d20-kaihou": { wizard: { q10Flaw: true } } } },
        { _id: "bf1", flags: { "naruto-d20-kaihou": { wizard: { q10BonusFeat: true } } } },
      ],
    });
    const p = revertQ10Coupled(actor);
    expect(p.deletes).toContain("fl1");
    expect(p.deletes).toContain("bf1");
  });
});

describe("Q13 Mentor (technique drag-drop + classSkill)", () => {
  it("apply adds technique item, sets classSkills[<key>], snapshots key", () => {
    const tech = { name: "Body Substitution", type: "feat" };
    const p = applyQ13Mentor(mockActor(), tech, "khi");
    expect(p.creates).toHaveLength(1);
    expect(p.creates[0].flags["naruto-d20-kaihou"].wizard.q13Mentor).toBe(true);
    expect(p.updates["system.classSkills.khi"]).toBe(true);
    expect(p.updates["flags.naruto-d20-kaihou.wizard.q13ClassSkill"]).toBe("khi");
  });

  it("revert deletes technique, unsets classSkill from snapshot, clears snapshot", () => {
    const actor = mockActor({
      items: [{ _id: "m1", flags: { "naruto-d20-kaihou": { wizard: { q13Mentor: true } } } }],
      flags: { "naruto-d20-kaihou": { wizard: { q13ClassSkill: "khi" } } },
    });
    const p = revertQ13Mentor(actor);
    expect(p.deletes).toContain("m1");
    expect(p.updates["system.classSkills.khi"]).toBe(false);
    expect(p.updates["flags.naruto-d20-kaihou.wizard.q13ClassSkill"]).toBeNull();
  });
});

describe("Q17 0-rank skill bump", () => {
  it("apply bumps rank by 2 and snapshots the key", () => {
    const actor = mockActor({ system: { skills: { sur: { rank: 0 } }, classSkills: {} } });
    const p = applyQ17SkillBump(actor, "sur");
    expect(p.updates["system.skills.sur.rank"]).toBe(2);
    expect(p.updates["flags.naruto-d20-kaihou.wizard.q17PickedSkill"]).toBe("sur");
  });

  it("apply works for subskill paths (e.g. pro.subSkills.scribe)", () => {
    const p = applyQ17SkillBump(mockActor(), "pro.subSkills.scribe");
    expect(p.updates["system.skills.pro.subSkills.scribe.rank"]).toBe(2);
    expect(p.updates["flags.naruto-d20-kaihou.wizard.q17PickedSkill"]).toBe("pro.subSkills.scribe");
  });

  it("revert subtracts 2 from snapshotted skill, floors at 0, clears snapshot", () => {
    const actor = mockActor({
      system: { skills: { sur: { rank: 2 } }, classSkills: {} },
      flags: { "naruto-d20-kaihou": { wizard: { q17PickedSkill: "sur" } } },
    });
    const p = revertQ17SkillBump(actor);
    expect(p.updates["system.skills.sur.rank"]).toBe(0);
    expect(p.updates["flags.naruto-d20-kaihou.wizard.q17PickedSkill"]).toBeNull();
  });

  it("revert with no snapshot returns empty plan", () => {
    const p = revertQ17SkillBump(mockActor());
    expect(p).toEqual({ updates: {}, creates: [], deletes: [] });
  });
});

describe("listZeroRankSkills (for Q17 UI picker)", () => {
  it("returns top-level skills with rank 0", () => {
    const actor = mockActor({
      system: {
        skills: { sur: { rank: 0 }, blf: { rank: 3 }, dip: { rank: 0 } },
        classSkills: {},
      },
    });
    const list = listZeroRankSkills(actor);
    const keys = list.map((s) => s.key).sort();
    expect(keys).toContain("sur");
    expect(keys).toContain("dip");
    expect(keys).not.toContain("blf");
  });

  it("returns subskills with rank 0 (e.g. craft sub)", () => {
    const actor = mockActor({
      system: {
        skills: {
          crf: { subSkills: { armor: { rank: 0 }, weapons: { rank: 2 } } },
        },
        classSkills: {},
      },
    });
    const list = listZeroRankSkills(actor);
    const keys = list.map((s) => s.key);
    expect(keys).toContain("crf.subSkills.armor");
    expect(keys).not.toContain("crf.subSkills.weapons");
  });
});
