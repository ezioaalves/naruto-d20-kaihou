// tests/sheets/databook-html.test.mjs
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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
    "naruto-d20-kaihou": { alias: "Crimson Mirage", rank: "Chūnin", missions: { C: 24, B: 11, A: 5, S: 1 }, advancedNature: { kanji: "木", label: "Mokuton" } },
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

  it("renders slug text labels beside discipline icons; gnj precedes tai in axis order", () => {
    const svg = radarSvg(vm.radars.disciplines, { max: 10, variant: "discipline", iconBase: "modules/x/disc" });
    expect(svg).toContain("db-radar__slug");
    expect(svg).toContain(">Nin<");
    expect(svg).toContain(">Gen<");
    expect(svg).toContain(">Tai<");
    const gnj = svg.indexOf("disc/genjutsu.svg");
    const tai = svg.indexOf("disc/taijutsu.svg");
    expect(gnj).toBeLessThan(tai); // gnj rendered before tai after the swap
    // Expanded viewBox to accommodate slug labels.
    expect(svg).toContain('viewBox="0 -10 200 225"');
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
    const missions = missionRecord(vm.identity.missions);
    expect(missions).toContain('name="flags.naruto-d20-kaihou.missions.C"');
    expect(missions).toContain("db-mission-row");
    expect(missions).toContain("db-mission-total");
    expect(missions).toContain(">41<"); // total still rendered as static
    const band = headerBand(vm, { name: "Uchiha <b>Takeshi</b>", img: "p.png", village: "Kanigakure", villageCrest: "modules/naruto-d20-kaihou/assets/theme/icons/villages/crab.svg", rank: "Chūnin" });
    expect(band).toContain("Crimson Mirage");
    expect(band).toContain("Chūnin");
    expect(band).toContain('class="db-badge__crest"'); // village crest image rendered
    expect(band).toContain("villages/crab.svg");
    expect(band).toContain('class="db-seal"'); // wax authentication seal rendered
    expect(band).toContain("--db-seal-crest:url('modules/naruto-d20-kaihou/assets/theme/icons/villages/crab.svg')");
    expect(band).toContain('data-edit="img"');
    expect(band).toContain("Uchiha &lt;b&gt;Takeshi&lt;/b&gt;"); // escaped, no raw tag injection
    expect(band).not.toContain("<b>Takeshi</b>");
  });

  it("renders editable HP/Chakra + AC/Level pips, tap-reserve + rest buttons", () => {
    const band = headerBand(vm, { name: "Takeshi", img: "p.png", village: "Konoha", rank: "Chūnin" });
    expect(band).toContain("db-band__stats");
    expect(band).toContain('name="system.attributes.hp.value" value="42"'); // HP editable
    expect(band).toContain("/50"); // HP max
    expect(band).toContain(">18<"); // AC (display)
    expect(band).toContain('name="flags.naruto-d20.chakra.pool.value" value="30"'); // Chakra editable
    expect(band).toContain("tap-reserve-roll"); // reuses naruto-d20's reserve listener
    expect(band).toContain(">5<"); // Level (display)
    expect(band).toContain('class="rest db-rest"'); // rest button (reuses PF1e .rest)
    expect(band).toContain('class="db-seal"'); // seal always renders…
    expect(band).toContain("villages/crab.svg"); // …defaulting to crab when no village crest
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

describe("kaihou character sheet template", () => {
  it("uses a non-submitted Back Matter actor name control to avoid PF1e name collisions", () => {
    const template = readFileSync(
      resolve(import.meta.dirname, "../../templates/actor/kaihou-character-sheet.hbs"),
      "utf8",
    );
    expect(template).toContain("data-kaihou-actor-name");
    expect(template).not.toContain('class="db-bio-actor-name" data-kaihou-actor-name name="name"');
  });

  it("keeps Quick Actions removed and keeps natures out of Identity", () => {
    const template = readFileSync(
      resolve(import.meta.dirname, "../../templates/actor/kaihou-character-sheet.hbs"),
      "utf8",
    );
    const navIndex = template.indexOf('<nav class="sheet-navigation tabs"');
    const footerIndex = template.indexOf('<footer class="db-footer">');
    expect(footerIndex).toBeGreaterThan(navIndex);
    expect(template).not.toContain("db-quick-strip");
    expect(template).not.toContain("quickActions");
    expect(template).not.toContain("{{{kaihou.fragments.naturesFull}}}");
  });

  it("keeps the primary tab strip outside footer chrome and keeps moved item controls in Biography", () => {
    const template = readFileSync(
      resolve(import.meta.dirname, "../../templates/actor/kaihou-character-sheet.hbs"),
      "utf8",
    );
    const navIndex = template.indexOf('<nav class="sheet-navigation tabs"');
    const bodyIndex = template.indexOf('<section class="primary-body">');
    const footerIndex = template.indexOf('<footer class="db-footer">');
    const bioIndex = template.indexOf('<div class="tab biography');
    const raceControlIndex = template.indexOf('data-create="misc.race"');
    const classControlIndex = template.indexOf('data-create="class"');

    expect(navIndex).toBeGreaterThan(-1);
    expect(navIndex).toBeLessThan(bodyIndex);
    expect(navIndex).toBeLessThan(footerIndex);
    expect(raceControlIndex).toBeGreaterThan(bioIndex);
    expect(classControlIndex).toBeGreaterThan(bioIndex);
  });

  it("renders Identity INFO, rank/alias display, and editable owner detail fields", () => {
    const template = readFileSync(
      resolve(import.meta.dirname, "../../templates/actor/kaihou-character-sheet.hbs"),
      "utf8",
    );
    expect(template).toContain("db-identity-hero");
    expect(template).toContain('name="flags.naruto-d20-kaihou.info"');
    expect(template).toContain("<span>Rank</span>");
    expect(template).toContain("<span>Alias</span>");
    expect(template).not.toContain("Occupation");
    expect(template).toContain('name="system.details.gender"');
    expect(template).toContain('name="system.details.age"');
    expect(template).toContain('name="system.details.height"');
    expect(template).toContain('name="system.details.weight"');
    expect(template).toContain("Player Notes");
    expect(template).not.toContain('<details class="db-bio-20q">');
  });

  it("uses the full-size lightning element image for sheet nature chips", () => {
    const scss = readFileSync(
      resolve(import.meta.dirname, "../../scss/theme/_kaihou-character-sheet.scss"),
      "utf8",
    );
    expect(scss).toContain('assets/questions/elements/lightning.png');
    expect(scss).not.toContain('assets/theme/icons/natures/lightning.png');
  });

  it("normalizes the PF1e Summary tab to remove fields moved to Identity/Biography/Footer", () => {
    const sheet = readFileSync(
      resolve(import.meta.dirname, "../../scripts/sheets/kaihou-character-sheet.mjs"),
      "utf8",
    );
    expect(sheet).toContain("this._normalizeSummaryTab($html)");
    expect(sheet).toContain('summary.querySelector(".summary-header .profile")?.remove()');
    expect(sheet).toContain('summary.querySelector(".summary-header .name-xp .char-name")?.remove()');
    expect(sheet).toContain('summary.querySelector(".summary-header .name-xp .hd-level")?.remove()');
    expect(sheet).toContain('["gender", "age", "height", "weight"].forEach((key) => {');
    expect(sheet).toContain('[name="system.details.${key}"]');
    expect(sheet).toContain('[name="system.details.deity"]');
    expect(sheet).toContain('summary.querySelector(".summary-header .character-summary .alignment")?.remove()');
    expect(sheet).toContain('summary.querySelector(".summary-header .race.item")?.remove()');
    expect(sheet).toContain('summary.querySelector(".summary-header .actor-quick-actions")?.remove()');
  });

  it("keeps the injected 20 Questions Biography block non-collapsible", () => {
    const entry = readFileSync(resolve(import.meta.dirname, "../../scripts/kaihou.mjs"), "utf8");
    expect(entry).toContain('<aside class="tqw-bio-right db-bio-20q">');
    expect(entry).toContain('<div class="tqw-bio-header-row">');
    expect(entry).not.toContain('<details class="tqw-bio-right db-bio-20q"');
  });

  it("does not inject the Chakra nature strip", () => {
    const sheet = readFileSync(
      resolve(import.meta.dirname, "../../scripts/sheets/kaihou-character-sheet.mjs"),
      "utf8",
    );
    expect(sheet).not.toContain("_normalizeChakraTab");
    expect(sheet).not.toContain("db-natures--chakra");
  });
});
