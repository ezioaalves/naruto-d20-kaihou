// tests/sheets/databook-html.test.mjs
import { describe, it, expect } from "vitest";
import { radarSvg, naturesRow, missionRecord, headerBand, headlineNature } from "../../scripts/sheets/databook-html.mjs";
import { buildKaihouViewModel } from "../../scripts/sheets/view-model.mjs";

const vm = buildKaihouViewModel({
  system: {
    abilities: { str: { total: 16 }, dex: { total: 14 }, con: { total: 15 }, int: { total: 13 }, wis: { total: 12 }, cha: { total: 17 } },
    skills: { nin: { rank: 8 }, fui: { rank: 5 }, ckc: { rank: 9 }, tai: { rank: 6 }, gnj: { rank: 7 } },
    attributes: { hp: { value: 42, max: 50 }, ac: { normal: { total: 18 } }, hd: { total: 5 } },
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

  it("renders discipline axis icons (with label tooltip) when iconBase is given", () => {
    const svg = radarSvg(vm.radars.disciplines, { max: 10, variant: "discipline", iconBase: "modules/x/disc" });
    expect(svg).toContain("db-radar__plot--discipline");
    expect((svg.match(/<image/g) || []).length).toBe(5);
    expect(svg).toContain("disc/ninjutsu.svg");
    expect(svg).toContain("<title>Ninjutsu</title>");
    expect(svg).not.toContain("db-radar__axis"); // icons replace text labels
  });
});

describe("naturesRow", () => {
  it("marks owned natures --on, tags data-nature, and renders the void slot + separator when KKG present", () => {
    const html = naturesRow(vm.natures);
    expect(html).toContain("db-nat--void");
    expect(html).toContain("db-natures__void-sep"); // separator only with KKG
    expect(html).toContain("木"); // advanced/KKG kanji still shown
    expect(html).toContain('data-nature="fire"'); // basic natures keyed for CSS icons
    expect((html.match(/db-nat--on/g) || []).length).toBe(2); // fire + lightning
  });
  it("omits the void slot AND separator when there is no advanced nature", () => {
    const html = naturesRow({ basic: vm.natures.basic, advanced: null });
    expect(html).not.toContain("db-nat--void");
    expect(html).not.toContain("db-natures__void-sep");
  });
});

describe("missionRecord & headerBand", () => {
  it("renders all five rank cells + total and escapes identity text", () => {
    expect(missionRecord(vm.identity.missions)).toContain('name="flags.naruto-d20-kaihou.missions.C"');
    expect(missionRecord(vm.identity.missions)).toContain(">41<"); // total still rendered as static
    const band = headerBand(vm, { name: "Uchiha <b>Takeshi</b>", img: "p.png", village: "Kanigakure", villageCrest: "modules/naruto-d20-kaihou/assets/theme/icons/villages/crab.svg", rank: "Chūnin" });
    expect(band).toContain("Crimson Mirage");
    expect(band).toContain("13th Tantō");
    expect(band).toContain('class="db-badge__crest"'); // village crest image rendered
    expect(band).toContain("villages/crab.svg");
    expect(band).toContain("Uchiha &lt;b&gt;Takeshi&lt;/b&gt;"); // escaped, no raw tag injection
    expect(band).not.toContain("<b>Takeshi</b>");
  });

  it("renders editable HP/Chakra + AC/Level pips, tap-reserve + rest buttons", () => {
    const band = headerBand(vm, { name: "Takeshi", img: "p.png", village: "Konoha", rank: "Chūnin" });
    expect(band).toContain("db-resources");
    expect(band).toContain('name="system.attributes.hp.value" value="42"'); // HP editable
    expect(band).toContain("/50"); // HP max
    expect(band).toContain(">18<"); // AC (display)
    expect(band).toContain('name="flags.naruto-d20.chakra.pool.value" value="30"'); // Chakra editable
    expect(band).toContain("tap-reserve-roll"); // reuses naruto-d20's reserve listener
    expect(band).toContain(">5<"); // Level (display)
    expect(band).toContain('class="rest db-rest"'); // rest button (reuses PF1e .rest)
  });
});

describe("headlineNature", () => {
  it("shows the void mark when the character has a Kekkei Genkai", () => {
    expect(headlineNature(vm.natures)).toContain("db-nat--void");
    expect(headlineNature(vm.natures)).toContain("db-nat--solo");
  });
  it("shows the primary affinity icon when there's no KKG", () => {
    const html = headlineNature({ primary: "fire", advanced: null });
    expect(html).toContain('data-nature="fire"');
    expect(html).toContain("db-nat--solo");
    expect(html).not.toContain("db-nat--void");
  });
  it("renders nothing when there's no nature data", () => {
    expect(headlineNature({ primary: null, advanced: null })).toBe("");
  });
});
