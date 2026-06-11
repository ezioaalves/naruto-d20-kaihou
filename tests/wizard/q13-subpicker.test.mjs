import {describe, it, expect} from "vitest";
import {applyQ13Mentor, revertQ13Mentor} from "../../scripts/apps/wizard/mechanic-applier.mjs";

function mockActor(items = []) {
  return {items, flags: {"naruto-d20-kaihou": {wizard: {}}}};
}

function packFeat(name, dictionary = {}) {
  return {
    name,
    type: "feat",
    system: { subType: "trait", description: { value: "<p>x</p>" }, flags: { dictionary } },
    flags: { "naruto-d20-kaihou": { questionFeat: `slug-${name}` } },
  };
}

describe("Q13 sub-picker contract", () => {
  it("creates technique + skill marker when classSkillKey is provided", () => {
    const tech = {name: "Shadow Clone", type: "naruto-d20.technique", system: {}};
    const p = applyQ13Mentor(tech, packFeat("Mentor's Lesson"), "nin");
    expect(p.creates).toHaveLength(2);
    const mentor = p.creates.find((i) => i.flags["naruto-d20-kaihou"]?.wizard?.q13Mentor);
    const skill  = p.creates.find((i) => i.flags["naruto-d20-kaihou"]?.wizard?.q13MentorSkill);
    expect(mentor).toBeDefined();
    expect(skill).toBeDefined();
    expect(skill.system.classSkills).toEqual({nin: true});
    expect(p.updates["flags.naruto-d20-kaihou.wizard.q13ClassSkill"]).toBe("nin");
  });

  it("creates only technique when classSkillKey is null — sub-picker was not filled", () => {
    const tech = {name: "Shadow Clone", type: "naruto-d20.technique", system: {}};
    const p = applyQ13Mentor(tech, packFeat("Mentor's Lesson"), null);
    expect(p.creates).toHaveLength(2);
    expect(p.creates[0].flags["naruto-d20-kaihou"].wizard.q13Mentor).toBe(true);
    expect(p.updates["flags.naruto-d20-kaihou.wizard.q13ClassSkill"]).toBeUndefined();
  });

  it("creates only technique when no pack feat is available", () => {
    const tech = {name: "Shadow Clone", type: "naruto-d20.technique", system: {}};
    const p = applyQ13Mentor(tech, null, null);
    expect(p.creates).toHaveLength(1);
    expect(p.creates[0].flags["naruto-d20-kaihou"].wizard.q13Mentor).toBe(true);
  });

  it("revert removes both technique and skill marker items", () => {
    const actor = mockActor([
      {_id: "t1", flags: {"naruto-d20-kaihou": {wizard: {q13Mentor: true}}}},
      {_id: "s1", flags: {"naruto-d20-kaihou": {wizard: {q13MentorSkill: true}}}},
    ]);
    actor.flags["naruto-d20-kaihou"].wizard.q13ClassSkill = "nin";
    const p = revertQ13Mentor(actor);
    expect(p.deletes).toContain("t1");
    expect(p.deletes).toContain("s1");
  });
});
