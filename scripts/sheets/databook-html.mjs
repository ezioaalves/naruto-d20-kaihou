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

function axisLabels(axes) {
  const ends = axisPoints(axes.length, C, C, R + 14);
  return axes
    .map((a, i) => {
      const p = ends[i];
      const anchor = p.x < C - 1 ? "end" : p.x > C + 1 ? "start" : "middle";
      return `<text class="db-radar__axis" x="${Math.round(p.x)}" y="${Math.round(p.y)}" text-anchor="${anchor}">${esc(a.label)}</text>`;
    })
    .join("");
}

/** axes: [{label,value}]; opts: {max, variant:"ability"|"discipline"}. */
export function radarSvg(axes, { max, variant }) {
  const plot = pointsAttr(valuePoints(axes.map((a) => a.value), max, C, C, R));
  return [
    `<svg class="db-radar" viewBox="0 0 200 210" role="img" aria-label="${esc(variant)} radar">`,
    gridRings(axes.length),
    `<polygon class="db-radar__plot--${esc(variant)}" points="${plot}"/>`,
    axisLabels(axes),
    `</svg>`,
  ].join("");
}

export function naturesRow(natures) {
  const basic = natures.basic
    .map((n) => `<span class="db-nat${n.on ? " db-nat--on" : ""}" title="${esc(n.key)}">${esc(n.kanji)}</span>`)
    .join("");
  const adv = natures.advanced;
  const voidSlot = adv
    ? `<span class="db-nat db-nat--void" title="${esc(adv.label)}">${esc(adv.kanji)}</span>`
    : `<span class="db-nat db-nat--void db-nat--locked" title="No Kekkei Genkai">—</span>`;
  return `<div class="db-natures"><span class="db-natures__lbl">Natures</span>${basic}<span class="db-natures__lbl">KKG</span>${voidSlot}</div>`;
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

/** vm = view-model; meta = {name,img,village,rank} pulled from the actor by the sheet. */
export function headerBand(vm, meta) {
  const { alias, allegiance } = vm.identity;
  const badges = [
    meta.village ? `<span class="db-badge">${esc(meta.village)}</span>` : "",
    meta.rank ? `<span class="db-badge db-badge--rank">${esc(meta.rank)}</span>` : "",
    allegiance ? `<span class="db-badge db-badge--allegiance">⚔ ${esc(allegiance)}</span>` : "",
  ].join("");
  return [
    `<header class="db-band">`,
    `<img class="db-band__port" src="${esc(meta.img)}" alt="">`,
    `<div class="db-band__id">`,
    `<div class="db-band__name">${esc(meta.name)}</div>`,
    alias ? `<div class="db-band__alias">${esc(alias)}</div>` : "",
    `<div class="db-band__badges">${badges}</div>`,
    naturesRow(vm.natures),
    `</div>`,
    `</header>`,
  ].join("");
}
