// tests/sheets/view-model.test.mjs
import { describe, it, expect } from "vitest";
import { buildKaihouViewModel, villageCrest, ABILITY_AXES, DISCIPLINE_AXES, MISSION_RANKS } from "../../scripts/sheets/view-model.mjs";

const actor = {
  system: {
    abilities: { str: { total: 16 }, dex: { total: 14 }, con: { total: 15 }, int: { total: 13 }, wis: { total: 12 }, cha: { total: 17 } },
    skills: { nin: { rank: 8 }, fui: { rank: 5 }, ckc: { rank: 9 }, tai: { rank: 6 }, gnj: { rank: 7 } },
    attributes: { hp: { value: 42, max: 50 }, ac: { normal: { total: 18 } }, hd: { total: 5 } },
  },
  flags: {
    "naruto-d20": { chakra: { pool: { value: 30, max: 40 }, nature: { primary: "Fire", secondary: ["Lightning"] } } },
    "naruto-d20-kaihou": {
      alias: "Crimson Mirage",
      allegiance: "13th Tantō",
      info: "Known to the squad as a reliable scout.",
      missions: { D: 0, C: 24, B: 11, A: 5, S: 1 },
      advancedNature: { kanji: "木", label: "Mokuton" },
    },
  },
};

describe("buildKaihouViewModel", () => {
  it("maps identity, missions (with derived total), and KKG nature", () => {
    const vm = buildKaihouViewModel(actor);
    expect(vm.identity.alias).toBe("Crimson Mirage");
    expect(vm.identity.rank).toBe("13th Tantō");
    expect(vm.identity.clan).toBe("");
    expect(vm.identity.info).toBe("Known to the squad as a reliable scout.");
    expect(vm.identity.missions.counts.C).toBe(24);
    expect(vm.identity.missions.total).toBe(41);
    expect(vm.natures.advanced).toEqual({ kanji: "木", label: "Mokuton" });
  });

  it("exposes clan from kaihou flags and details (gender/age/height/weight/race) from system", () => {
    const actor2 = {
      system: { details: { gender: "Male", age: "19", height: "5'10\"", weight: "160lb", race: "Human" } },
      flags: { "naruto-d20-kaihou": { clan: "Uchiha" }, "naruto-d20": {} },
    };
    const vm = buildKaihouViewModel(actor2);
    expect(vm.identity.clan).toBe("Uchiha");
    expect(vm.identity.details.gender).toBe("Male");
    expect(vm.identity.details.age).toBe("19");
    expect(vm.identity.details.height).toBe("5'10\"");
    expect(vm.identity.details.weight).toBe("160lb");
    expect(vm.identity.details.race).toBe("Human");
  });

  it("prefers rank from kaihou flags and falls back to old allegiance data", () => {
    expect(buildKaihouViewModel({
      flags: { "naruto-d20-kaihou": { rank: "Jounin", allegiance: "Legacy Unit" } },
    }).identity.rank).toBe("Jounin");
    expect(buildKaihouViewModel({
      flags: { "naruto-d20-kaihou": { allegiance: "13th Tantō" } },
    }).identity.rank).toBe("13th Tantō");
  });

  it("builds 6 ability axes and 5 discipline axes in fixed order from live data", () => {
    const vm = buildKaihouViewModel(actor);
    expect(vm.radars.abilities.map((a) => a.key)).toEqual(ABILITY_AXES);
    expect(vm.radars.abilities[0]).toMatchObject({ key: "str", value: 16 });
    expect(vm.radars.disciplines.map((d) => d.key)).toEqual(DISCIPLINE_AXES.map((d) => d.key));
    expect(vm.radars.disciplines[0]).toMatchObject({ key: "nin", label: "Ninjutsu", value: 8 });
  });

  it("maps resources (HP/AC/Chakra/Level) from PF1e + naruto-d20 data", () => {
    const vm = buildKaihouViewModel(actor);
    expect(vm.resources.hp).toEqual({ value: 42, max: 50 });
    expect(vm.resources.ac).toBe(18);
    expect(vm.resources.chakra).toEqual({ value: 30, max: 40 });
    expect(vm.resources.level).toBe(5);
  });

  it("exposes the primary nature affinity (lowercased) for the header", () => {
    expect(buildKaihouViewModel(actor).natures.primary).toBe("fire");
    expect(buildKaihouViewModel({}).natures.primary).toBeNull();
  });

  it("maps animal villages to crest basenames; Hisuigakure (capital) → imperial", () => {
    expect(villageCrest("Kanigakure")).toBe("crab");
    expect(villageCrest("Hisuigakure")).toBe("imperial");
    expect(villageCrest("Kiringakure")).toBe("unicorn");
    expect(villageCrest("Tsurugakure")).toBe("crane");
    expect(villageCrest("Konohagakure")).toBeNull(); // canon village, no mapped mon
    expect(villageCrest("")).toBeNull();
  });

  it("flags only owned basic natures, case-insensitively", () => {
    const vm = buildKaihouViewModel(actor);
    const on = vm.natures.basic.filter((n) => n.on).map((n) => n.key);
    expect(on.sort()).toEqual(["fire", "lightning"]);
  });

  it("never throws on an empty actor and yields zeroed, safe defaults", () => {
    const vm = buildKaihouViewModel({});
    expect(vm.identity.missions.total).toBe(0);
    expect(vm.identity.alias).toBe("");
    expect(vm.radars.abilities).toHaveLength(ABILITY_AXES.length);
    expect(vm.radars.abilities.every((a) => a.value === 0)).toBe(true);
    expect(vm.natures.advanced).toBeNull();
    expect(vm.resources.hp).toEqual({ value: 0, max: 0 });
    expect(vm.resources.ac).toBe(0);
    expect(vm.resources.chakra).toEqual({ value: 0, max: 0 });
    expect(MISSION_RANKS).toHaveLength(5);
  });
});
