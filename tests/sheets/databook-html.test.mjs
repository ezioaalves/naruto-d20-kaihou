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
    expect(band).not.toContain("db-badge--rank"); // rank badge removed (iteration 2)
    expect(band).toContain('class="db-badge__crest"'); // village crest image rendered
    expect(band).toContain("villages/crab.svg");
    expect(band).toContain('class="db-band__crest" src="modules/naruto-d20-kaihou/assets/theme/icons/villages/crab.svg"'); // corner crest
    expect(band).toContain('data-edit="img"');
    expect(band).toContain("Uchiha &lt;b&gt;Takeshi&lt;/b&gt;"); // escaped, no raw tag injection
    expect(band).not.toContain("<b>Takeshi</b>");
  });

  it("renders the title stack, HP/Chakra/Reserve gauges, rollable 6-cell strip, meta rail + rest", () => {
    const band = headerBand(vm, { name: "Takeshi", img: "p.png", village: "Konoha", rank: "Chūnin" });
    // Title stack: name, then alias directly under it, then the village badge.
    expect(band).toContain("db-band__title");
    expect(band).toContain('<div class="db-band__name">Takeshi</div>');
    expect(band).toContain('<div class="db-band__alias">Crimson Mirage</div>'); // alias under name
    expect(band).not.toContain("db-badge--rank"); // rank removed
    expect(band).toContain("db-band__vitals");
    expect(band).toContain("db-vitals__bars");
    expect(band).toContain("db-vitals__strip");
    // Three gauges; each uses data-field (NOT form name) to avoid flag corruption.
    expect(band).toContain("db-bar--hp");
    expect(band).toContain('data-field="system.attributes.hp.value" value="42"'); // HP editable
    expect(band).not.toContain('name="system.attributes.hp.value"'); // never a form field
    expect(band).toContain("/50"); // HP max
    expect(band).toContain('style="width:84%"'); // HP fill 42/50
    expect(band).toContain("db-bar--chakra");
    expect(band).toContain('data-field="flags.naruto-d20.chakra.pool.value" value="30"'); // Chakra editable
    expect(band).not.toContain('name="flags.naruto-d20.chakra.pool.value"');
    expect(band).toContain("db-bar--reserve");
    expect(band).toContain('data-field="flags.naruto-d20.chakra.reserve.value"'); // reserve gauge
    expect(band).toContain("tap-reserve-roll"); // reuses naruto-d20's reserve listener
    // Defense strip: six rollable cells wired to native PF1e rolls.
    expect(band).toContain("db-stat--roll");
    expect(band).toContain(">18<"); // AC (display)
    expect(band).toContain('data-roll="defenses"'); // AC → defenses card
    expect(band).toContain('data-roll="init"');
    expect(band).toContain('data-roll="save" data-save="fort"');
    expect(band).toContain('data-roll="save" data-save="ref"');
    expect(band).toContain('data-roll="save" data-save="will"');
    expect(band).toContain('data-roll="skill" data-skill="per"');
    expect(band).toContain(">+0<"); // unset modifiers render as +0
    // Speed and CMD were dropped from the strip per the design iteration.
    expect(band).not.toContain(">Speed<");
    expect(band).not.toContain(">CMD<");
    // Meta rail with abbreviated Level; AP/Rep/Wealth appended at runtime by the hook.
    expect(band).toContain("db-meta-rail");
    expect(band).toContain(">5<"); // Level value
    expect(band).toContain(">LVL<"); // abbreviated label
    expect(band).toContain("db-meta__cell--level");
    // Rest keeps the `rest` class so PF1e's _onRest binding fires after relocation.
    expect(band).toContain('class="rest db-rest"');
    expect(band).toContain('class="db-band__crest"'); // corner crest always renders…
    expect(band).toContain("villages/crab.svg"); // …defaulting to crab when no village crest
  });

  it("labels the masthead level cell as HD for NPCs", () => {
    const band = headerBand(vm, { name: "Tekko", img: "p.png", village: "Kanigakure", levelLabel: "HD" });
    expect(band).toContain(">5<");
    expect(band).toContain(">HD<");
    expect(band).not.toContain(">LVL<");
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
    const headerIndex = template.indexOf('<header class="db-footer">');
    expect(headerIndex).toBeGreaterThan(-1);
    expect(headerIndex).toBeLessThan(navIndex); // masthead sits above the tab strip
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
    const headerIndex = template.indexOf('<header class="db-footer">');
    const bioIndex = template.indexOf('<div class="tab biography');
    const raceControlIndex = template.indexOf('data-create="misc.race"');
    const classControlIndex = template.indexOf('data-create="class"');

    expect(navIndex).toBeGreaterThan(-1);
    expect(navIndex).toBeLessThan(bodyIndex);
    expect(headerIndex).toBeLessThan(navIndex); // masthead above the tab strip, nav stays its own sibling
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

  it("gates character-only warnings and normalizes PF1e Summary without removing NPC CR", () => {
    const sheet = readFileSync(
      resolve(import.meta.dirname, "../../scripts/sheets/kaihou-character-sheet.mjs"),
      "utf8",
    );
    expect(sheet).toContain("this._normalizeSummaryTab($html)");
    expect(sheet).toContain('summary.querySelector(".summary-header .profile")?.remove()');
    expect(sheet).toContain('summary.querySelector(".summary-header .name-xp .char-name")?.remove()');
    expect(sheet).toContain('if (this.actor.type === "character")');
    expect(sheet).toContain('summary.querySelector(".summary-header .name-xp .hd-level")?.remove()');
    expect(sheet).toContain('["gender", "age", "height", "weight"].forEach((key) => {');
    expect(sheet).toContain('[name="system.details.${key}"]');
    expect(sheet).toContain('[name="system.details.deity"]');
    expect(sheet).toContain('summary.querySelector(".summary-header .character-summary .alignment")?.remove()');
    expect(sheet).toContain('summary.querySelector(".summary-header .race.item")?.remove()');
    expect(sheet).toContain('summary.querySelector(".summary-header .actor-quick-actions")?.remove()');

    const template = readFileSync(
      resolve(import.meta.dirname, "../../templates/actor/kaihou-character-sheet.hbs"),
      "utf8",
    );
    expect(template).toContain('{{#if isCharacter}}{{#unless hasClasses}}');
  });

  it("keeps the injected 20 Questions Biography block non-collapsible", () => {
    const entry = readFileSync(resolve(import.meta.dirname, "../../scripts/kaihou.mjs"), "utf8");
    expect(entry).toContain('<aside class="tqw-bio-right db-bio-20q">');
    expect(entry).toContain('<div class="tqw-bio-header-row">');
    expect(entry).not.toContain('<details class="tqw-bio-right db-bio-20q"');
  });



  it("preserves and persists Kaihou disclosure state across PF1 rerenders and reopen", () => {
    const sheet = readFileSync(
      resolve(import.meta.dirname, "../../scripts/sheets/kaihou-character-sheet.mjs"),
      "utf8",
    );
    expect(sheet).toContain("const uiState = this._captureKaihouUiState();");
    expect(sheet).toContain("this._restoreKaihouUiState($html, uiState);");
    expect(sheet).toContain("state ??= this._loadKaihouUiState();");
    expect(sheet).toContain("localStorage.setItem(this._kaihouUiStateKey()");
    expect(sheet).toContain("localStorage.getItem(this._kaihouUiStateKey())");
    expect(sheet).toContain('querySelectorAll?.("details")');
    expect(sheet).toContain('state.conditionsCollapsed === false');
    expect(sheet).toContain('".tab.chakra"');
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
