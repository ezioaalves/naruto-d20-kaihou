// scripts/sheets/kaihou-character-sheet.mjs
//
// Bespoke campaign character sheet. Extends PF1e's character sheet so ALL
// mechanics (rolls, items, listeners) — and naruto-d20's chakra-tab prototype
// patch — are inherited. We swap in our OWN top-level template
// (templates/actor/kaihou-character-sheet.hbs) which re-frames PF1e's content:
// every functional tab embeds PF1e's partial verbatim, while we add a databook
// header band and an Identity dossier tab. The template preserves the two
// anchor selectors the naruto-d20 chakra patch depends on
// (nav.sheet-navigation.tabs[data-group='primary'], section.primary-body), so
// the Chakra tab keeps injecting. All databook view data is built, Foundry-free,
// in view-model.mjs + databook-html.mjs and handed to the template as `kaihou.*`.

import { buildKaihouViewModel } from "./view-model.mjs";
import { headerBand, radarSvg, missionRecord } from "./databook-html.mjs";

export const MODULE_ID = "naruto-d20-kaihou";

export const SHEET_TEMPLATE = `modules/${MODULE_ID}/templates/actor/kaihou-character-sheet.hbs`;

const ORIGIN_ROWS = [
  { label: "Village", kind: null }, // village is a flag, not an item
  { label: "School", kind: "school" },
  { label: "Occupation", kind: "occupation" },
  { label: "Bloodline", kind: "bloodline" },
  { label: "Flaw", kind: "flaw" },
];

export function getKaihouCharacterSheetClass() {
  const Base = pf1?.applications?.actor?.ActorSheetPFCharacter;
  if (!Base) {
    console.error(`${MODULE_ID} | pf1 ActorSheetPFCharacter not found — sheet not registered`);
    return null;
  }

  return class KaihouCharacterSheet extends Base {
    static get defaultOptions() {
      const options = super.defaultOptions;
      // Make the databook Identity tab the default landing tab, leaving every
      // other primary-group tab (and other groups) untouched.
      const tabs = (options.tabs ?? []).map((t) =>
        t.group === "primary" ? { ...t, initial: "identity" } : { ...t },
      );
      return foundry.utils.mergeObject(options, {
        classes: [...options.classes, "kaihou-databook"],
        tabs,
      });
    }

    /** Own template for the full sheet; defer to PF1e's limited sheet for limited users. */
    get template() {
      if (!game.user.isGM && this.actor.limited) {
        return "systems/pf1/templates/actors/limited-sheet.hbs";
      }
      return SHEET_TEMPLATE;
    }

    async getData(options) {
      const data = await super.getData(options);
      try {
        const vm = buildKaihouViewModel(this.actor);
        const khFlags = this.actor.flags?.[MODULE_ID] ?? {};
        const meta = {
          name: this.actor.name,
          img: this.actor.img,
          village: khFlags.village ?? "",
          rank: khFlags.rank ?? "",
        };
        // Pre-render the markup-heavy databook pieces (SVG radars, header band,
        // mission grid) with our pure builders; the template emits them with
        // triple-stache. The builders escape all caller text internally.
        vm.fragments = {
          headerBand: headerBand(vm, meta),
          abilityRadar: radarSvg(vm.radars.abilities, { max: 20, variant: "ability" }),
          disciplineRadar: radarSvg(vm.radars.disciplines, { max: 10, variant: "discipline" }),
          missionRecord: missionRecord(vm.identity.missions),
        };
        // Origin & Path rows: village from a flag, the rest from Kaihou-granted
        // items. Values are emitted with double-stache (Handlebars auto-escapes).
        vm.origin = ORIGIN_ROWS.map(({ label, kind }) => ({
          label,
          value: kind ? this._kaihouItemName(kind) : (khFlags.village ?? ""),
        }));
        data.kaihou = vm;
      } catch (e) {
        console.error(`${MODULE_ID} | view-model build failed`, e);
        data.kaihou = null;
      }
      return data;
    }

    async _renderInner(...args) {
      const $html = await super._renderInner(...args); // PF1e + naruto-d20 chakra tab
      try {
        this._normalizeInjectedTabs($html);
      } catch (e) {
        console.error(`${MODULE_ID} | tab normalization failed`, e);
      }
      return $html;
    }

    // naruto-d20 injects the Chakra tab as a plain `<a>Chakra</a>`. Re-shape it to
    // our icon-rail markup (icon + .db-tab-label) so the nav styling is uniform.
    // Idempotent: skips a tab that already carries an icon.
    _normalizeInjectedTabs($html) {
      const root = $html?.[0] ?? $html;
      const ICONS = { chakra: "fa-yin-yang" };
      for (const [tab, icon] of Object.entries(ICONS)) {
        const a = root.querySelector(`nav.sheet-navigation.tabs .item[data-tab="${tab}"]`);
        if (!a || a.querySelector("i")) continue;
        const label = a.textContent.trim();
        a.textContent = "";
        a.insertAdjacentHTML(
          "afterbegin",
          `<i class="fa-solid ${icon}"></i><span class="db-tab-label">${label}</span>`,
        );
      }
    }

    _kaihouItemName(kind) {
      const item = this.actor.items?.find?.((i) => i.flags?.[MODULE_ID]?.kind === kind);
      return item?.name ?? "";
    }
  };
}

export function registerKaihouCharacterSheet() {
  const cls = getKaihouCharacterSheetClass();
  if (!cls) return;
  const DSC = foundry.applications?.apps?.DocumentSheetConfig ?? globalThis.DocumentSheetConfig;
  const makeDefault = game.settings.get(MODULE_ID, "kaihouSheetDefault");
  DSC.registerSheet(Actor, MODULE_ID, cls, {
    types: ["character"],
    label: game.i18n.localize("Kaihou.Sheet.Label"),
    makeDefault,
  });
  console.log(`${MODULE_ID} | character sheet registered (default=${makeDefault})`);
}
