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
      if (iconBase && a.icon) {
        return `<image class="db-radar__icon" href="${esc(iconBase)}/${esc(a.icon)}.svg" x="${Math.round(p.x - S / 2)}" y="${Math.round(p.y - S / 2)}" width="${S}" height="${S}"><title>${esc(a.label)}</title></image>`;
      }
      const anchor = p.x < C - 1 ? "end" : p.x > C + 1 ? "start" : "middle";
      return `<text class="db-radar__axis" x="${Math.round(p.x)}" y="${Math.round(p.y)}" text-anchor="${anchor}">${esc(a.label)}</text>`;
    })
    .join("");
}

/** axes: [{label,value,icon?}]; opts: {max, variant, iconBase?}. With iconBase
 *  the axis labels render as discipline icons (tooltip = label) instead of text. */
export function radarSvg(axes, { max, variant, iconBase } = {}) {
  const plot = pointsAttr(valuePoints(axes.map((a) => a.value), max, C, C, R));
  return [
    `<svg class="db-radar" viewBox="0 0 200 210" role="img" aria-label="${esc(variant)} radar">`,
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
        `<div><input type="number" class="db-mission" name="flags.naruto-d20-kaihou.missions.${r}" value="${missions.counts[r] || 0}" min="0"><small>${r}</small></div>`,
    )
    .join("");
  return `<div class="db-panel"><h4 class="db-panel__h">Mission Record</h4><div class="db-missions">${cells}<div><b>${missions.total}</b><small>Total</small></div></div></div>`;
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

/** Resource pips for the header: HP (editable) · AC · Chakra (editable, with a
 *  tap-reserves button reusing naruto-d20's .tap-reserve-roll) · Level. */
export function resourcePips(resources) {
  if (!resources) return "";
  const { hp, ac, chakra, level } = resources;
  const display = (label, val) => `<div class="db-pip"><b>${esc(val)}</b><small>${esc(label)}</small></div>`;
  const editable = (label, name, val, max, after = "") =>
    `<div class="db-pip db-pip--edit"><span class="db-pip__val"><input class="db-pip__in" type="text" name="${name}" value="${esc(val)}" data-dtype="Number"><span class="db-pip__max">/${esc(max)}</span></span>${after}<small>${esc(label)}</small></div>`;
  const tap = `<a class="db-pip__tap tap-reserve-roll" title="Tap chakra reserves"><i class="fa-solid fa-hand-holding-droplet"></i></a>`;
  return [
    `<div class="db-resources">`,
    editable("HP", "system.attributes.hp.value", hp.value, hp.max),
    display("AC", ac),
    editable("Chakra", "flags.naruto-d20.chakra.pool.value", chakra.value, chakra.max, tap),
    display("Lv", level),
    `</div>`,
  ].join("");
}

/** vm = view-model; meta = {name,img,village,rank} pulled from the actor by the sheet. */
export function headerBand(vm, meta) {
  const { alias, allegiance } = vm.identity;
  const villageCrest = meta.villageCrest
    ? `<img class="db-badge__crest" src="${esc(meta.villageCrest)}" alt="">`
    : "";
  const badges = [
    meta.village ? `<span class="db-badge db-badge--village">${villageCrest}${esc(meta.village)}</span>` : "",
    meta.rank ? `<span class="db-badge db-badge--rank">${esc(meta.rank)}</span>` : "",
    allegiance ? `<span class="db-badge db-badge--allegiance">⚔ ${esc(allegiance)}</span>` : "",
  ].join("");
  return [
    `<header class="db-band">`,
    `<img class="db-band__port" src="${esc(meta.img)}" alt="">`,
    `<div class="db-band__id">`,
    `<div class="db-band__name">${esc(meta.name)}</div>`,
    alias ? `<div class="db-band__alias">${esc(alias)}</div>` : "",
    `<div class="db-band__badges">${badges}${headlineNature(vm.natures)}</div>`,
    `</div>`,
    resourcePips(vm.resources),
    `<div class="db-band__actions"><button type="button" class="rest db-rest" title="Rest"><i class="fa-solid fa-bed"></i> Rest</button></div>`,
    `</header>`,
  ].join("");
}
