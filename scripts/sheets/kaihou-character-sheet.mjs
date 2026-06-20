// scripts/sheets/kaihou-character-sheet.mjs
//
// Bespoke campaign actor sheet. Extends PF1e's character/NPC sheets so ALL
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
import { headerBand, radarSvg, missionRecord } from "./databook-html.mjs";

export const MODULE_ID = "naruto-d20-kaihou";

export const SHEET_TEMPLATE = `modules/${MODULE_ID}/templates/actor/kaihou-character-sheet.hbs`;

// Origin & Path rows → the 20Q wizard item marker that grants them. The wizard
// tags each granted item with flags["naruto-d20-kaihou"].wizard.<marker> = true.
const ORIGIN_ROWS = [
  { label: "Village", marker: "q1Village" },
  { label: "School", marker: "q3School" },
];

function getKaihouActorSheetClass(actorType) {
  const className = actorType === "npc" ? "ActorSheetPFNPC" : "ActorSheetPFCharacter";
  const Base = pf1?.applications?.actor?.[className];
  if (!Base) {
    console.error(`${MODULE_ID} | pf1 ${className} not found — ${actorType} sheet not registered`);
    return null;
  }

  return class KaihouActorSheet extends Base {
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
          levelLabel: this.actor.type === "npc" ? "HD" : "LVL",
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
        };
        vm.meta = meta;
        // Origin & Path rows: each resolved from its wizard-marked actor item.
        vm.origin = ORIGIN_ROWS.map(({ label, marker }) => ({
          label,
          value: this._markedItemName(marker),
        }));
        vm.isOwner = this.actor.isOwner;
        // Flat class-item list for the Biography tab (PF1e's `data.classes` is
        // an array of group-objects, not individual items).
        vm.kaihouClasses = Array.from(this.actor.items ?? [])
          .filter((i) => i.type === "class")
          .map((i) => ({ id: i.id, name: i.name, level: i.system?.level ?? 0, img: i.img }));
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
      root?.addEventListener?.("click", (e) => this._onKaihouActionClick(e), { capture: true });
      root?.querySelectorAll?.("details")?.forEach?.((el) => {
        el.addEventListener("toggle", () => this._persistKaihouUiState());
      });
      const actorName = root?.querySelector?.("[data-kaihou-actor-name]");
      if (actorName) {
        actorName.addEventListener("change", (e) => this._onKaihouActorNameChange(e));
      }
      // Footer HP/Chakra pips persist via data-field (kept OUT of form
      // serialization to avoid the duplicate-name collision with the Summary/
      // Chakra tab inputs that corrupted the chakra flag).
      root?.querySelectorAll?.(".db-pip__in[data-field]")?.forEach?.((el) =>
        el.addEventListener("change", (e) => this._onKaihouPipChange(e)),
      );
      // Footer defense strip: each cell triggers a native PF1e roll.
      root?.querySelectorAll?.(".db-stat--roll[data-roll]")?.forEach?.((el) =>
        el.addEventListener("click", (e) => this._onKaihouStatRoll(e)),
      );
      // Buffs conditions panel: toggle the collapsed state on its wrapper.
      root?.querySelectorAll?.(".db-conditions__toggle")?.forEach?.((el) =>
        el.addEventListener("click", (e) => {
          e.preventDefault();
          el.closest(".db-conditions")?.classList.toggle("is-collapsed");
          this._persistKaihouUiState();
        }),
      );
    }

    _onKaihouActionClick(event) {
      if (this._isKaihouNoRenderAction(event.target)) {
        this._suppressKaihouUpdateRenderUntil = Date.now() + 750;
      }
    }

    _isKaihouNoRenderAction(target) {
      return Boolean(target?.closest?.([
        ".db-stat--roll",
        ".tap-reserve-roll",
        ".shinobi-technique-learn",
        ".shinobi-technique-use",
        "[data-action='rollSave']",
        "[data-action='rollInit']",
        "[data-action='rollSkill']",
        "[data-action='rollAbility']",
        "[data-action='rollBAB']",
        "[data-action='useGenericAttack']",
        "[data-action='defensesCard']",
        "[data-action='useItem']",
        "[data-action='useQuickItem']",
      ].join(",")));
    }

    /** Dispatch a footer defense-strip cell to the matching PF1e actor roll,
     *  mirroring the calls PF1e's own _onRoll makes from the Combat tab. */
    _onKaihouStatRoll(event) {
      event.preventDefault();
      const { roll, save, skill } = event.currentTarget?.dataset ?? {};
      const token = this.token;
      switch (roll) {
        case "defenses":
          return this.actor.displayDefenseCard({ token });
        case "init":
          return this.actor.rollInitiative({
            createCombatants: true,
            rerollInitiative: game.user.isGM,
            token,
          });
        case "save":
          return this.actor.rollSavingThrow(save, { token });
        case "skill":
          return this.actor.rollSkill(skill, { token });
        default:
          return undefined;
      }
    }

    async _onKaihouPipChange(event) {
      const el = event.currentTarget;
      const field = el?.dataset?.field;
      const value = Number(el?.value);
      if (!field || !Number.isFinite(value)) return;
      await this.actor.update({ [field]: value });
    }

    async _onKaihouActorNameChange(event) {
      const value = String(event.currentTarget?.value ?? "").trim();
      if (!value || value === this.actor.name) return;
      await this.actor.update({ name: value });
    }

    render(options, renderOptions) {
      if (this._shouldSkipKaihouRender(options, renderOptions)) return this;
      return super.render(options, renderOptions);
    }

    _shouldSkipKaihouRender(options, renderOptions) {
      const context = renderOptions ?? (typeof options === "object" ? options : null);
      if (this._isSuppressedKaihouUpdateRender(context)) return true;
      if (context?.renderContext !== "updateItem") return false;
      return this._isLearningOnlyRenderData(context.renderData);
    }

    _isSuppressedKaihouUpdateRender(context) {
      if (!context?.renderContext?.startsWith?.("update")) return false;
      return Date.now() < (this._suppressKaihouUpdateRenderUntil ?? 0);
    }

    _isLearningOnlyRenderData(renderData = {}) {
      const flat = foundry.utils.flattenObject(renderData ?? {});
      const keys = Object.keys(flat);
      return keys.length > 0 && keys.every((key) => key.startsWith("system.learning."));
    }

    async _renderInner(...args) {
      const uiState = this._captureKaihouUiState();
      const $html = await super._renderInner(...args); // PF1e + naruto-d20 chakra tab
      try {
        this._normalizeInjectedTabs($html);
        this._normalizeSummaryTab($html);
        this._relocateCombatToSummary($html);
        this._relocateHeroStats($html);
        this._normalizeBuffsTab($html);
        this._collapseChakraLearn($html);
        this._restoreKaihouUiState($html, uiState);
      } catch (e) {
        console.error(`${MODULE_ID} | tab normalization failed`, e);
      }
      return $html;
    }

    _captureKaihouUiState() {
      const root = this.element?.[0] ?? this.element;
      if (!root?.querySelectorAll) return null;
      return this._kaihouUiStateFromRoot(root);
    }

    _kaihouUiStateFromRoot(root) {
      return {
        details: this._detailsState(root),
        conditionsCollapsed: root.querySelector(".db-conditions")?.classList.contains("is-collapsed"),
        scroll: this._scrollState(root),
      };
    }

    _restoreKaihouUiState($html, state) {
      state ??= this._loadKaihouUiState();
      if (!state) return;
      const root = $html?.[0] ?? $html;
      if (!root?.querySelectorAll) return;

      const details = this._detailsState(root);
      const openKeys = new Set(state.details?.openKeys ?? []);
      for (const el of root.querySelectorAll("details")) {
        const key = this._detailsStateKey(el, details.indexes.get(el) ?? 0);
        el.open = openKeys.has(key);
      }

      const conditions = root.querySelector(".db-conditions");
      if (conditions && state.conditionsCollapsed === false) {
        conditions.classList.remove("is-collapsed");
      }

      for (const { selector, top, left } of state.scroll ?? []) {
        const el = root.querySelector(selector);
        if (!el) continue;
        el.scrollTop = top;
        el.scrollLeft = left;
      }
    }

    _persistKaihouUiState() {
      const state = this._captureKaihouUiState();
      if (!state) return;
      try {
        localStorage.setItem(this._kaihouUiStateKey(), JSON.stringify({
          details: { openKeys: [...state.details.openKeys] },
          conditionsCollapsed: state.conditionsCollapsed,
        }));
      } catch (e) {
        console.warn(`${MODULE_ID} | failed to persist sheet UI state`, e);
      }
    }

    _loadKaihouUiState() {
      try {
        const raw = localStorage.getItem(this._kaihouUiStateKey());
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        console.warn(`${MODULE_ID} | failed to load sheet UI state`, e);
        return null;
      }
    }

    _kaihouUiStateKey() {
      const userId = game.user?.id ?? "anonymous";
      const actorKey = this.actor?.uuid ?? this.actor?.id ?? "unknown";
      return `${MODULE_ID}.sheetUiState.${userId}.${actorKey}`;
    }

    _detailsState(root) {
      const indexes = new Map();
      const counts = new Map();
      const openKeys = new Set();
      for (const el of root.querySelectorAll("details")) {
        const base = this._detailsStateBase(el);
        const index = counts.get(base) ?? 0;
        counts.set(base, index + 1);
        indexes.set(el, index);
        if (el.open) openKeys.add(this._detailsStateKey(el, index));
      }
      return { indexes, openKeys };
    }

    _detailsStateBase(el) {
      const tab = el.closest(".tab[data-tab]")?.dataset?.tab ?? "";
      const classes = Array.from(el.classList).sort().join(".");
      const label = el.querySelector(":scope > summary")?.textContent?.trim() ?? "";
      return `${tab}|${classes}|${label}`;
    }

    _detailsStateKey(el, index) {
      return `${this._detailsStateBase(el)}|${index}`;
    }

    _scrollState(root) {
      return [".primary-body", ".tab.active", ".tab.chakra", ".tab.summary", ".tab.combat"]
        .map((selector) => {
          const el = root.querySelector(selector);
          return el ? { selector, top: el.scrollTop, left: el.scrollLeft } : null;
        })
        .filter(Boolean);
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

    _normalizeSummaryTab($html) {
      const root = $html?.[0] ?? $html;
      const summary = root?.querySelector?.(".tab.summary");
      if (!summary) return;

      // These fields now live in the footer, Identity, or Biography. PF1e's
      // summary partial stays embedded for mechanics, then we remove the moved
      // front/back-matter copies so the sheet has a single source of UI truth.
      summary.querySelector(".summary-header .profile")?.remove();
      summary.querySelector(".summary-header .name-xp .char-name")?.remove();
      if (this.actor.type === "character") {
        summary.querySelector(".summary-header .name-xp .hd-level")?.remove();
      }
      ["gender", "age", "height", "weight"].forEach((key) => {
        summary
          .querySelector(`.summary-header .character-summary [name="system.details.${key}"]`)
          ?.closest("div")
          ?.remove();
      });
      summary
        .querySelector('.summary-header .character-summary [name="system.details.deity"]')
        ?.closest("div")
        ?.remove();
      summary.querySelector(".summary-header .character-summary .alignment")?.remove();
      summary.querySelector(".summary-header .race.item")?.remove();
      summary.querySelector(".summary-header .actor-quick-actions")?.remove();

      // Classes list lives in Biography; remove the duplicate from Summary.
      summary.querySelector(".classes-body")?.remove();

      // Move Quick Actions out of Summary into a persistent strip, then dock the
      // strip + footer together so the portrait can span both at full height.
      const footer = root?.querySelector?.("header.db-footer");
      if (!footer) return;
      // Idempotent: skip if already docked this render.
      if (root.querySelector(".db-dock")) return;
      const qaOl = summary.querySelector("ol.quick-actions");
      if (!qaOl) return;
      const qaH3 = qaOl.previousElementSibling?.tagName?.toLowerCase() === "h3"
        ? qaOl.previousElementSibling
        : null;
      const strip = document.createElement("div");
      strip.className = "db-quick-actions-strip";
      if (qaH3) { strip.appendChild(qaH3); }
      strip.appendChild(qaOl);

      // Dock layout: a flex row — portrait on the left (stretched to full
      // height) and a column wrapper holding the footer band over the
      // quick-actions strip on the right. Flex align-items:stretch gives the
      // portrait a definite height to fill (grid row-spanning did not).
      const dock = document.createElement("div");
      dock.className = "db-dock";
      footer.parentNode.insertBefore(dock, footer);
      const portrait = footer.querySelector(".db-band__portrait");
      if (portrait) {
        dock.appendChild(portrait);
      }
      const main = document.createElement("div");
      main.className = "db-dock__main";
      main.appendChild(footer);
      main.appendChild(strip);
      dock.appendChild(main);

      // Rest → small circular FAB at the end of the quick-actions strip. Keeps
      // its `rest` class so PF1e's inherited _onRest binding still fires.
      const rest = footer.querySelector(".db-rest");
      if (rest) {
        rest.classList.add("db-rest--fab");
        strip.appendChild(rest);
      }
    }

    // Move every Combat-tab function except the attack list onto the Summary
    // tab, which already carries a Defenses section (the shared defenses-tables
    // partial + a compact BAB/CMB/Init row). We relocate Combat's fuller
    // offensive header (adds Melee/Ranged), its Natural Armor AC + Spell
    // Resistance inputs, and the Save/AC/CMD/SR notes — then strip Combat down
    // to its attacks so they get more room. PF1e binds all these rollables on
    // the whole sheet HTML (not scoped to .tab.combat), and the inputs persist
    // by `name`, so moving the nodes before activateListeners keeps them live.
    _relocateCombatToSummary($html) {
      const root = $html?.[0] ?? $html;
      const combat = root?.querySelector?.(".tab.combat");
      const summary = root?.querySelector?.(".tab.summary");
      if (!combat || !summary) return;

      const defCol = summary.querySelector(".subdetails-body .quick-info > .flexcol");
      if (!defCol) return;
      // Idempotent: the Offensive heading marker is added only by this method.
      if (defCol.querySelector(".db-offensive")) return;

      // Offensive metrics: replace Summary's compact BAB/CMB/Init row with
      // Combat's fuller header (BAB/CMB/Melee/Ranged/Init), under an "Offensive"
      // heading that mirrors the existing "Defenses" header markup/styling. The
      // db-offensive-row class lays its five info-boxes on a single line (CSS).
      const offHeader = combat.querySelector(":scope > header");
      const compactStats = defCol.querySelector(".combat-stats");
      if (offHeader) {
        offHeader.classList.add("db-offensive-row");
        const offHead = document.createElement("li");
        offHead.className = "generic-defenses flexrow db-offensive";
        offHead.innerHTML = '<h3><i class="fa-solid fa-dice-d20"></i> Offensive</h3>';
        const anchor = compactStats ?? null;
        if (anchor) {
          defCol.insertBefore(offHead, anchor);
          defCol.insertBefore(offHeader, anchor);
          anchor.remove();
        } else {
          defCol.appendChild(offHead);
          defCol.appendChild(offHeader);
        }
      }

      // Defenses header row: swap Summary's bare "Defenses" <li> for Combat's
      // full defenses <ul.attributes> (Defenses title + Natural Armor AC + Spell
      // Resistance) so all three share one line — PF1e's
      // `.tab.summary .attributes{flex-flow:row}` lays it out horizontally.
      const combatDefRow = combat.querySelector(".combat-defenses > ul.attributes");
      combatDefRow
        ?.querySelector('input[name="system.attributes.sr.formula"]')
        ?.closest("li")
        ?.classList.add("db-sr");
      const bareDefHead = defCol.querySelector(":scope > li.generic-defenses:not(.db-offensive)");
      if (combatDefRow && bareDefHead) {
        defCol.replaceChild(combatDefRow, bareDefHead);
      } else if (combatDefRow) {
        defCol.insertBefore(combatDefRow, defCol.firstChild);
      }

      // Save/AC/CMD/SR notes → below the defenses, each row collapsible.
      const defenseNotes = combat.querySelector(".combat-defenses .defense-notes");
      if (defenseNotes) {
        defCol.appendChild(defenseNotes);
        this._collapsibleNotes(defenseNotes);
      }

      // Strip Combat to attacks: drop the emptied defenses block and the stray
      // <hr> separators that framed it, leaving the filters + .combat-attacks.
      combat.querySelector(".combat-defenses")?.remove();
      combat.querySelectorAll(":scope > hr").forEach((hr) => hr.remove());
    }

    // Wrap each direct `.flexrow` of a notes container in a <details>, turning
    // its <h3> into the <summary> toggle. Idempotent (skips rows already inside
    // a <details>). Shared by the relocated defense notes.
    _collapsibleNotes(container) {
      container.querySelectorAll(":scope > .flexrow").forEach((row) => {
        if (row.closest("details")) return;
        const heading = row.querySelector("h3");
        const label = heading?.textContent?.trim() || "Notes";
        const details = document.createElement("details");
        const summary = document.createElement("summary");
        summary.textContent = label;
        details.appendChild(summary);
        row.parentNode.insertBefore(details, row);
        heading?.remove();
        details.appendChild(row);
      });
    }

    // naruto-d20 injects its Hero Statistics block (#naruto-hero-statistics) into
    // the Summary tab inside the awaited super render (its ActorSheetPF._renderInner
    // patch). Relocate it — pre-paint — into the masthead meta rail beside the
    // Level cell, abbreviating the labels to fit the thin rail. Done here, not in a
    // post-render hook, so the block never pops into Summary and then jumps to the
    // rail after the frame paints (the cause of the masthead flicker on every
    // update). The rollable Action Points <a> is preserved (its listener is bound
    // post-paint by naruto-d20's registerSummaryStats). Idempotent.
    _relocateHeroStats($html) {
      const root = $html?.[0] ?? $html;
      const rail = root?.querySelector?.("header.db-footer .db-meta-rail");
      const heroStats = root?.querySelector?.("#naruto-hero-statistics");
      if (!rail || !heroStats) return;
      rail.appendChild(heroStats);

      const ABBR = {
        "flags.naruto-d20.actionPoints": "AP",
        "flags.naruto-d20.reputation": "REP",
        "flags.naruto-d20.wealth": "WLT",
      };
      heroStats.querySelectorAll(".info-box").forEach((box) => {
        const abbr = ABBR[box.querySelector("input[name]")?.getAttribute("name")];
        if (!abbr) return;
        const labelEl = box.querySelector("h5 a") ?? box.querySelector("h5");
        if (labelEl) labelEl.textContent = abbr;
      });
    }

    // Buffs tab: make the conditions panel collapsible by wrapping it in a
    // <details> with a "Conditions" summary. Idempotent.
    // Make the conditions panel collapsible. Native <details> proved unreliable
    // here (closed content stayed laid out as a blank band), so use a button +
    // class toggle whose visibility is driven entirely by an explicit author
    // `display` rule. Collapsed by default. Idempotent.
    _normalizeBuffsTab($html) {
      const root = $html?.[0] ?? $html;
      const conditions = root?.querySelector?.(".tab.buffs .buffs-conditions");
      if (!conditions || conditions.closest(".db-conditions")) return;
      // Drop the <hr> that trailed the conditions panel — once collapsed it left
      // a separator floating above the filter bar.
      const sep = conditions.nextElementSibling;
      if (sep?.tagName?.toLowerCase() === "hr") sep.remove();
      // Remove `flexrow` so the core `.flexrow{display:flex}` can't fight our
      // display control over the panel.
      conditions.classList.remove("flexrow");
      const wrap = document.createElement("div");
      wrap.className = "db-conditions is-collapsed";
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "db-conditions__toggle";
      toggle.textContent = "Conditions";
      conditions.parentNode.insertBefore(wrap, conditions);
      wrap.appendChild(toggle);
      wrap.appendChild(conditions);
    }

    // Chakra tab (injected by naruto-d20 inside the awaited super render): make
    // the Shinobi Learn Checks block collapsible — its <h3> becomes the toggle.
    // Skips gracefully if the chakra body isn't present. Idempotent. (Distinct
    // from the rejected chakra "nature strip"; styling lives in the theme file.)
    _collapseChakraLearn($html) {
      const root = $html?.[0] ?? $html;
      const chakra = root?.querySelector?.(".tab.chakra");
      if (!chakra) return;
      const learnBox = chakra.querySelector(".learn-check-box");
      const learn = learnBox?.closest(".defenses");
      if (!learn || learn.closest("details")) return;
      const heading = learn.querySelector(":scope > h3");
      const label = heading?.textContent?.trim() || "Learn";
      const details = document.createElement("details");
      details.className = "db-learn-toggle";
      const summary = document.createElement("summary");
      summary.textContent = label;
      details.appendChild(summary);
      learn.parentNode.insertBefore(details, learn);
      heading?.remove();
      details.appendChild(learn);
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

export function getKaihouCharacterSheetClass() {
  return getKaihouActorSheetClass("character");
}

export function getKaihouNpcSheetClass() {
  return getKaihouActorSheetClass("npc");
}

export function registerKaihouCharacterSheet() {
  const characterCls = getKaihouCharacterSheetClass();
  const npcCls = getKaihouNpcSheetClass();
  const DSC = foundry.applications?.apps?.DocumentSheetConfig ?? globalThis.DocumentSheetConfig;
  const makeDefault = game.settings.get(MODULE_ID, "kaihouSheetDefault");
  const label = game.i18n.localize("Kaihou.Sheet.Label");

  if (characterCls) {
    DSC.registerSheet(Actor, MODULE_ID, characterCls, {
      types: ["character"],
      label,
      makeDefault,
    });
  }

  if (npcCls) {
    DSC.registerSheet(Actor, MODULE_ID, npcCls, {
      types: ["npc"],
      label,
      makeDefault,
    });
  }

  console.log(`${MODULE_ID} | actor sheets registered (default=${makeDefault})`);
}
