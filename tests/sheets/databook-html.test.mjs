// tests/sheets/databook-html.test.mjs
import { describe, it, expect } from "vitest";
import { radarSvg, naturesRow, missionRecord, headerBand } from "../../scripts/sheets/databook-html.mjs";
import { buildKaihouViewModel } from "../../scripts/sheets/view-model.mjs";

const vm = buildKaihouViewModel({
  system: {
    abilities: { str: { total: 16 }, dex: { total: 14 }, con: { total: 15 }, int: { total: 13 }, wis: { total: 12 }, cha: { total: 17 } },
    skills: { nin: { rank: 8 }, fui: { rank: 5 }, ckc: { rank: 9 }, tai: { rank: 6 }, gnj: { rank: 7 } },
    attributes: { hp: { value: 42, max: 50 }, ac: { normal: { total: 18 } } },
  },
  flags: {
    "naruto-d20": { chakra: { pool: { value: 30, max: 40 }, nature: { primary: "Fire", secondary: ["Lightning"] } } },
    "naruto-d20-kaihou": { alias: "Crimson Mirage", allegiance: "13th Tantō", missions: { C: 24, B: 11, A: 5, S: 1 }, advancedNature: { kanji: "木", label: "Mokuton" } },
  },
});

describe("radarSvg", () => {
  it("renders one polygon plot + N axis labels with the variant class", () => {
    const svg = radarSvg(vm.radars.abilities, { max: 20, variant: "ability" });
    expect(svg).toContain("db-radar__plot--ability");
    expect(svg).toContain(">STR<");
    expect((svg.match(/db-radar__axis/g) || []).length).toBe(6);
    expect(svg).not.toContain("NaN");
  });
});

describe("naturesRow", () => {
  it("marks owned natures --on and renders the void slot when KKG present", () => {
    const html = naturesRow(vm.natures);
    expect(html).toContain("db-nat--void");
    expect(html).toContain("木");
    expect((html.match(/db-nat--on/g) || []).length).toBe(2); // fire + lightning
  });
  it("locks the void slot when no advanced nature", () => {
    const html = naturesRow({ basic: vm.natures.basic, advanced: null });
    expect(html).toContain("db-nat--locked");
  });
});

describe("missionRecord & headerBand", () => {
  it("renders all five rank cells + total and escapes identity text", () => {
    expect(missionRecord(vm.identity.missions)).toContain('name="flags.naruto-d20-kaihou.missions.C"');
    expect(missionRecord(vm.identity.missions)).toContain(">41<"); // total still rendered as static
    const band = headerBand(vm, { name: "Uchiha <b>Takeshi</b>", img: "p.png", village: "Konoha", rank: "Chūnin" });
    expect(band).toContain("Crimson Mirage");
    expect(band).toContain("13th Tantō");
    expect(band).toContain("Uchiha &lt;b&gt;Takeshi&lt;/b&gt;"); // escaped, no raw tag injection
    expect(band).not.toContain("<b>Takeshi</b>");
  });

  it("renders HP/AC/Chakra resource pips in the header band", () => {
    const band = headerBand(vm, { name: "Takeshi", img: "p.png", village: "Konoha", rank: "Chūnin" });
    expect(band).toContain("db-resources");
    expect(band).toContain(">42/50<"); // HP value/max
    expect(band).toContain(">18<"); // AC
    expect(band).toContain(">30/40<"); // Chakra value/max
  });
});
