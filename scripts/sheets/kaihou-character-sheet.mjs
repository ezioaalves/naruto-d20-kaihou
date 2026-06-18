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

import { buildKaihouViewModel, villageCrest } from "./view-model.mjs";
import { headerBand, radarSvg, missionRecord, naturesRow } from "./databook-html.mjs";
import { getPrivateNote, setPrivateNote, getPublicNote, setPublicNote } from "../notes-relay.mjs";

export const MODULE_ID = "naruto-d20-kaihou";

export const SHEET_TEMPLATE = `modules/${MODULE_ID}/templates/actor/kaihou-character-sheet.hbs`;

// Origin & Path rows → the 20Q wizard item marker that grants them. The wizard
// tags each granted item with flags["naruto-d20-kaihou"].wizard.<marker> = true.
const ORIGIN_ROWS = [
  { label: "Village", marker: "q1Village" },
  { label: "School", marker: "q3School" },
  { label: "Occupation", marker: "q2OccupationItem" },
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
      // Players land on Summary; Identity is the dossier (and the NPC front page).
      const tabs = (options.tabs ?? []).map((t) =>
        t.group === "primary" ? { ...t, initial: "summary" } : { ...t },
      );
      return foundry.utils.mergeObject(options, {
        classes: [...options.classes, "kaihou-databook"],
        tabs,
      });
    }

    /** Always render the databook template; tab/edit gating is done in the template. */
    get template() {
      return SHEET_TEMPLATE;
    }

    async getData(options) {
      const data = await super.getData(options);
      try {
        const vm = buildKaihouViewModel(this.actor);
        const khFlags = this.actor.flags?.[MODULE_ID] ?? {};
        const village = this._villageName();
        const crest = villageCrest(village);
        const meta = {
          name: this.actor.name,
          img: this.actor.img,
          village,
          villageCrest: crest ? `modules/${MODULE_ID}/assets/theme/icons/villages/${crest}.svg` : "",
          rank: khFlags.rank ?? "",
        };
        // Pre-render the markup-heavy databook pieces (SVG radars, header band,
        // mission grid) with our pure builders; the template emits them with
        // triple-stache. The builders escape all caller text internally.
        vm.fragments = {
          headerBand: headerBand(vm, meta),
          abilityRadar: radarSvg(vm.radars.abilities, { max: 20, variant: "ability" }),
          disciplineRadar: radarSvg(vm.radars.disciplines, {
            max: 10,
            variant: "discipline",
            iconBase: `modules/${MODULE_ID}/assets/theme/icons/disciplines`,
          }),
          missionRecord: missionRecord(vm.identity.missions),
          naturesFull: naturesRow(vm.natures),
        };
        // Origin & Path rows: each resolved from its wizard-marked actor item.
        vm.origin = ORIGIN_ROWS.map(({ label, marker }) => ({
          label,
          value: this._markedItemName(marker),
        }));
        // Collaborative notes: private (this user) + public (party, GM-relayed).
        vm.notes = {
          privateNote: getPrivateNote(this.actor),
          publicNote: getPublicNote(this.actor),
        };
        vm.isOwner = this.actor.isOwner;
        data.kaihou = vm;
      } catch (e) {
        console.error(`${MODULE_ID} | view-model build failed`, e);
        data.kaihou = null;
      }
      return data;
    }

    activateListeners(html) {
      super.activateListeners(html);
      const root = html?.[0] ?? html;
      // Notes are NOT PF1e form fields (private = user flag, public = relayed),
      // so bind them ourselves. change fires on blur/enter — one write each.
      const priv = root?.querySelector?.(".db-notes__private");
      if (priv) priv.addEventListener("change", (e) => setPrivateNote(this.actor, e.target.value));
      const pub = root?.querySelector?.(".db-notes__public");
      if (pub) pub.addEventListener("change", (e) => setPublicNote(this.actor, e.target.value));
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

    // naruto-d20 injects a Chakra nav tab as a bare <a>Chakra</a> after render.
    // Owners: reshape it to match our label-only markup so the strip stays uniform.
    // Non-owners: remove it, mirroring the {{#if kaihou.isOwner}} gate on other tabs.
    _normalizeInjectedTabs($html) {
      const root = $html?.[0] ?? $html;
      const chakra = root.querySelector('nav.sheet-navigation.tabs .item[data-tab="chakra"]');
      if (!chakra) return;
      if (!this.actor.isOwner) {
        chakra.remove();
        return;
      }
      // Already normalized (idempotent guard).
      if (chakra.querySelector(".db-tab-label")) return;
      const label = chakra.textContent.trim();
      chakra.textContent = "";
      chakra.insertAdjacentHTML("afterbegin", `<span class="db-tab-label">${label}</span>`);
    }

    // Name of the actor item the 20Q wizard tagged with
    // flags["naruto-d20-kaihou"].wizard.<marker> = true (village/school/…).
    _markedItemName(marker) {
      const item = this.actor.items?.find?.(
        (i) => i.flags?.[MODULE_ID]?.wizard?.[marker] === true,
      );
      return item?.name ?? "";
    }

    _villageName() {
      return this._markedItemName("q1Village");
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
