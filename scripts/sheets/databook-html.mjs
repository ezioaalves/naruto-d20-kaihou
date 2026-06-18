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
    `<div class="db-band__stats">`,
    editable("HP", "system.attributes.hp.value", hp.value, hp.max),
    display("AC", ac),
    editable("Chakra", "flags.naruto-d20.chakra.pool.value", chakra.value, chakra.max, tap),
    display("LV", level),
    `<button type="button" class="rest db-rest" title="Rest"><i class="fa-solid fa-bed"></i> Rest</button>`,
    `</div>`,
  ].join("");
}

/** vm = view-model; meta = {name,img,village,rank} pulled from the actor by the sheet. */
export function headerBand(vm, meta) {
  const { alias, rank } = vm.identity;
  const villageCrest = meta.villageCrest
    ? `<img class="db-badge__crest" src="${esc(meta.villageCrest)}" alt="">`
    : "";
  // Signature: a vermilion wax authentication seal wrapping the village crest,
  // stamped on the portrait. The ring frame is fixed; the crest (masked, tinted)
  // fills its transparent centre. Omitted when the actor has no village crest.
  const seal = meta.villageCrest
    ? `<div class="db-seal" title="${esc(meta.village ?? "")}" aria-hidden="true">`
      + `<span class="db-seal__crest" style="--db-seal-crest:url('${esc(meta.villageCrest)}')"></span>`
      + `</div>`
    : "";
  const badges = [
    meta.village ? `<span class="db-badge db-badge--village">${villageCrest}${esc(meta.village)}</span>` : "",
    (rank ?? meta.rank) ? `<span class="db-badge db-badge--rank">${esc(rank ?? meta.rank)}</span>` : "",
  ].join("");
  return [
    `<header class="db-band">`,
    `<div class="db-band__portrait">`,
    `<img class="db-band__port" src="${esc(meta.img)}" alt="" data-edit="img">`,
    headlineNature(vm.natures), // nature seal — portrait lower-right (CSS)
    seal, // village wax seal — portrait upper-right (CSS)
    `</div>`,
    `<div class="db-band__id">`,
    `<div class="db-band__name">${esc(meta.name)}</div>`,
    alias ? `<div class="db-band__alias">${esc(alias)}</div>` : "",
    `<div class="db-band__badges">${badges}</div>`,
    `</div>`,
    resourcePips(vm.resources),
    `</header>`,
  ].join("");
}
