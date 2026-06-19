// scripts/sheets/databook-html.mjs
//
// Pure HTML-string builders for the databook sheet. No Foundry globals — the
// SVG/markup is produced from the view-model and injected by the sheet class.
// All caller-supplied text is escaped here.

import { axisPoints, valuePoints, pointsAttr } from "./radar.mjs";

export function esc(s) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(s ?? "").replace(/[&<>"']/g, (c) => map[c]);
}

const C = 100; // svg centre
const R = 70;  // svg max radius

function gridRings(count) {
  const outer = pointsAttr(axisPoints(count, C, C, R));
  const inner = pointsAttr(axisPoints(count, C, C, R / 2));
  return `<polygon class="db-radar__grid" points="${outer}"/><polygon class="db-radar__grid" points="${inner}"/>`;
}

function axisLabels(axes, iconBase) {
  const ends = axisPoints(axes.length, C, C, R + 14);
  const S = 22; // axis icon size
  return axes
    .map((a, i) => {
      const p = ends[i];
      const anchor = p.x < C - 1 ? "end" : p.x > C + 1 ? "start" : "middle";
      if (iconBase && a.icon) {
        // Place the slug text above the icon when in the upper half, below when lower.
        const textY = p.y < C ? Math.round(p.y - S / 2 - 4) : Math.round(p.y + S / 2 + 10);
        const slug = a.slug
          ? `<text class="db-radar__slug" x="${Math.round(p.x)}" y="${textY}" text-anchor="${anchor}">${esc(a.slug)}</text>`
          : "";
        return `<image class="db-radar__icon" href="${esc(iconBase)}/${esc(a.icon)}.svg" x="${Math.round(p.x - S / 2)}" y="${Math.round(p.y - S / 2)}" width="${S}" height="${S}"><title>${esc(a.label)}</title></image>${slug}`;
      }
      return `<text class="db-radar__axis" x="${Math.round(p.x)}" y="${Math.round(p.y)}" text-anchor="${anchor}">${esc(a.label)}</text>`;
    })
    .join("");
}

/** axes: [{label,value,icon?,slug?}]; opts: {max, variant, iconBase?}. With
 *  iconBase the discipline radar renders icon + slug text beside each axis. */
export function radarSvg(axes, { max, variant, iconBase } = {}) {
  const plot = pointsAttr(valuePoints(axes.map((a) => a.value), max, C, C, R));
  // Extra vertical space for slug labels above/below the icons.
  const viewBox = iconBase ? "0 -10 200 225" : "0 0 200 210";
  return [
    `<svg class="db-radar" viewBox="${viewBox}" role="img" aria-label="${esc(variant)} radar">`,
    gridRings(axes.length),
    `<polygon class="db-radar__plot--${esc(variant)}" points="${plot}"/>`,
    axisLabels(axes, iconBase),
    `</svg>`,
  ].join("");
}

export function naturesRow(natures) {
  // Basic natures render the vendored nature symbol (via CSS, keyed on
  // data-nature); the kanji is kept as the tooltip/title.
  const basic = natures.basic
    .map(
      (n) =>
        `<span class="db-nat db-nat--basic${n.on ? " db-nat--on" : ""}" data-nature="${esc(n.key)}" title="${esc(n.kanji)}"></span>`,
    )
    .join("");
  // The separator + void slot appear only for characters with a Kekkei Genkai
  // (advanced nature); everyone else shows just the five basic natures.
  const adv = natures.advanced;
  const kkg = adv
    ? `<span class="db-natures__void-sep"></span><span class="db-nat db-nat--void" title="${esc(adv.label)}">${esc(adv.kanji)}</span>`
    : "";
  return `<div class="db-natures"><span class="db-natures__lbl">Natures</span>${basic}${kkg}</div>`;
}

export function missionRecord(missions) {
  const cells = ["D", "C", "B", "A", "S"]
    .map(
      (r) =>
        `<div class="db-mission-row"><small>${r}</small><input type="number" class="db-mission" name="flags.naruto-d20-kaihou.missions.${r}" value="${missions.counts[r] || 0}" min="0"></div>`,
    )
    .join("");
  return `<div class="db-panel"><h4 class="db-panel__h">Mission Record</h4><div class="db-missions">${cells}<div class="db-mission-row db-mission-total"><small>Total</small><b>${missions.total}</b></div></div></div>`;
}

/** The single headline nature for the header: the void mark if the character
 *  has a Kekkei Genkai, else their primary affinity icon. */
export function headlineNature(natures) {
  if (!natures) return "";
  if (natures.advanced) {
    return `<span class="db-nat db-nat--void db-nat--solo" title="${esc(natures.advanced.label)}">${esc(natures.advanced.kanji)}</span>`;
  }
  if (natures.primary) {
    return `<span class="db-nat db-nat--basic db-nat--solo db-nat--on" data-nature="${esc(natures.primary)}" title="${esc(natures.primary)}"></span>`;
  }
  return "";
}

// Percent fill for a resource gauge, clamped to [0, 100].
const fillPct = (v, m) => (m > 0 ? Math.max(0, Math.min(100, (v / m) * 100)) : 0);
// Modifier formatting for the defense strip: +4 / -1 / +0.
const signed = (n) => (Number(n) >= 0 ? `+${n}` : `${n}`);

/** An editable resource gauge bar (HP, Chakra). The value persists via
 *  data-field + change listener, NOT a form `name`: these footer fields
 *  duplicate inputs on the Summary/Chakra tabs, and two same-named inputs in
 *  one form serialize to an array — harmless for the schema'd HP path, but it
 *  corrupted the unschema'd chakra FLAG into "[0,0]". data-field keeps them out
 *  of form serialization. The fill width reflects value/max and is recomputed
 *  on every render (PF1e re-renders the sheet after a data-field change). */
function gauge(variant, label, name, val, max, after = "") {
  return [
    `<div class="db-bar db-bar--${variant}">`,
    `<span class="db-bar__fill" style="width:${fillPct(val, max)}%"></span>`,
    `<span class="db-bar__label">${esc(label)}</span>`,
    `<span class="db-bar__readout">`,
    `<input class="db-bar__in db-pip__in" type="text" data-field="${esc(name)}" value="${esc(val)}" inputmode="numeric">`,
    `<span class="db-bar__max">/${esc(max)}</span>`,
    after,
    `</span>`,
    `</div>`,
  ].join("");
}

/** One rollable cell in the defense strip. The whole cell is a button that
 *  triggers a native PF1e roll (handled by _onKaihouStatRoll in the sheet).
 *  `roll` selects the action; `extra` carries data-save / data-skill. */
function statRoll(label, val, roll, extra = "") {
  return [
    `<button type="button" class="db-stat db-stat--roll" data-roll="${esc(roll)}"${extra ? " " + extra : ""}>`,
    `<b class="db-stat__v">${esc(val)}</b><small class="db-stat__k">${esc(label)}</small>`,
    `</button>`,
  ].join("");
}

/** The right-hand vitals panel: HP / Chakra / Chakra-Reserve gauges over a
 *  6-cell rollable defense strip (AC · Init · Fort · Ref · Will · Per). */
export function vitalsPanel(resources) {
  if (!resources) return "";
  const { hp, ac, chakra, reserve = {}, init, saves = {}, per } = resources;
  const tap = `<a class="db-bar__tap tap-reserve-roll" title="Tap chakra reserves"><i class="fa-solid fa-hand-holding-droplet"></i></a>`;
  return [
    `<div class="db-band__vitals">`,
    `<div class="db-vitals__bars">`,
    gauge("hp", "Hit Points", "system.attributes.hp.value", hp.value, hp.max),
    gauge("chakra", "Chakra", "flags.naruto-d20.chakra.pool.value", chakra.value, chakra.max, tap),
    gauge("reserve", "Reserve", "flags.naruto-d20.chakra.reserve.value", reserve.value, reserve.max),
    `</div>`,
    `<div class="db-vitals__strip">`,
    statRoll("AC", ac, "defenses"),
    statRoll("Init", signed(init), "init"),
    statRoll("Fort", signed(saves.fort), "save", `data-save="fort"`),
    statRoll("Ref", signed(saves.ref), "save", `data-save="ref"`),
    statRoll("Will", signed(saves.will), "save", `data-save="will"`),
    statRoll("Per", signed(per), "skill", `data-skill="per"`),
    `</div>`,
    `</div>`,
  ].join("");
}

/** The meta rail — a far-right column holding the Level cell. naruto-d20's
 *  Action Points / Reputation / Wealth block (#naruto-hero-statistics) is
 *  relocated beneath it by the renderActorSheetPF hook in kaihou.mjs,
 *  preserving its rollable Action Points and its own change handlers. */
export function metaRail(resources, { levelLabel = "LVL" } = {}) {
  if (!resources) return "";
  return [
    `<div class="db-meta-rail">`,
    `<div class="db-meta__cell db-meta__cell--level">`,
    `<b class="db-meta__v">${esc(resources.level)}</b><small class="db-meta__k">${esc(levelLabel)}</small>`,
    `</div>`,
    `</div>`,
  ].join("");
}

/** vm = view-model; meta = {name,img,village,rank} pulled from the actor by the sheet. */
export function headerBand(vm, meta) {
  const { alias } = vm.identity;
  const villageCrest = meta.villageCrest
    ? `<img class="db-badge__crest" src="${esc(meta.villageCrest)}" alt="">`
    : "";
  // Village crest stamped flush on the portrait's lower-right corner — falls
  // back to the crab (Kaihou / Kanigakure emblem) when no village is set.
  const cornerCrest = meta.villageCrest || "modules/naruto-d20-kaihou/assets/theme/icons/villages/crab.svg";
  const crest = `<img class="db-band__crest" src="${esc(cornerCrest)}" alt="" title="${esc(meta.village ?? "")}">`;
  // Rank badge removed per design iteration 2 — only the village badge remains
  // (and only when a village is set).
  const badges = meta.village
    ? `<span class="db-badge db-badge--village">${villageCrest}${esc(meta.village)}</span>`
    : "";
  // Keep the `rest` class so PF1e's inherited _onRest binding still fires; the
  // sheet relocates this button into the quick-actions strip as a circular FAB.
  const rest = `<button type="button" class="rest db-rest" title="Rest"><i class="fa-solid fa-bed"></i></button>`;
  // Layout: the band is a vertical stack — title (name, alias under it, village
  // badge) over the vitals. The portrait and Rest button are relocated by the
  // sheet (portrait → dock left column; Rest → quick-actions strip); both are
  // emitted here so they exist for tests and as a graceful no-JS fallback.
  return [
    `<header class="db-band db-band--vitals">`,
    `<div class="db-band__portrait">`,
    `<img class="db-band__port" src="${esc(meta.img)}" alt="" data-edit="img">`,
    crest, // village crest — portrait lower-right corner (CSS)
    `</div>`,
    `<div class="db-band__title">`,
    `<div class="db-band__name">${esc(meta.name)}</div>`,
    alias ? `<div class="db-band__alias">${esc(alias)}</div>` : "",
    badges ? `<div class="db-band__badges">${badges}</div>` : "",
    `</div>`,
    vitalsPanel(vm.resources),
    rest,
    `</header>`,
    metaRail(vm.resources, { levelLabel: meta.levelLabel ?? "LVL" }),
  ].join("");
}
