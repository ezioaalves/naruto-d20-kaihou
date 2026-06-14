# Databook UI — asset audit & acquisition list

**Date:** 2026-06-13 · companion to `docs/superpowers/roadmap-databook-overhaul.md`

What visual assets the databook sheet needs, what's already vendored (and whether
it's usable), and what must be acquired or redrawn.

---

## 1. Licensing reality (read first)

The module vendored a large slice of the L5R5E system's assets. They split into:

- **Engineering (MIT) — reuse freely:** L5R5E's SCSS architecture/patterns. Already leveraged; this is where L5R's real value was.
- **Open fonts — in use:** Rotis (databook sans/serif), Hiroshige. These carry the databook look.
- **FFG / L5R-branded imagery — do NOT ship publicly:** `LogotypeL5r*` font, `bg-l5r`, the Five-Rings `rings/`, `army_*`, `conditions/*`, and the **clan mons** (`crab/crane/dragon/lion/phoenix/scorpion/unicorn/…`). These are FFG IP. Fine for **private table use**; must be **redrawn as original art** before any public/commercial distribution of Kaihou.

The honest summary: **almost none of L5R's *visual* assets are on-theme for a Naruto databook** — except by the lucky coincidence below.

## 2. The lucky coincidence — animal villages ↔ clan mons

The campaign's hidden villages are **animal-themed**, and the L5R clan mons match 7 of 8:

| Village | Animal | Crest file (`assets/theme/icons/villages/`) |
|---|---|---|
| Houohgakure | Phoenix | `phoenix.svg` ✅ |
| Kanigakure | Crab | `crab.svg` ✅ |
| Kiringakure | Kirin | `unicorn.svg` ✅ (kirin ≈ qilin) |
| Ryuugakure | Dragon | `dragon.svg` ✅ |
| Sasorigakure | Scorpion | `scorpion.svg` ✅ |
| Shishigakure | Lion | `lion.svg` ✅ |
| Tsurugakure | Crane | `crane.svg` ✅ |
| **Hisuigakure** | **Jade / kingfisher** | **— none —** ⛔ acquire |

Spare unmapped mons: `imperial`, `mantis`, `ronin`, `tortoise`.

**Caveat:** these crest SVGs are L5R clan mons (FFG IP). Usable privately; flag for redraw if Kaihou is ever published. (Village is stored as the `q1Village`-marked actor item; the sheet resolves its name as of v2.1.x.)

## 3. Vendored & Naruto-usable now (on-theme, no acquisition)

| Asset | Path | Sheet use |
|---|---|---|
| Nature symbols (fire/water/wind/earth/lightning) | `icons/natures/` | Header natures row (alt to kanji) |
| Discipline icons (nin/fui/ckc/tai/gnj/kinjutsu) | `icons/disciplines/` | Discipline radar labels / skill headers |
| Void mark | `icons/rings/void.svg` | KKG / void slot |
| Leaf | `icons/items/leaf.svg` | misc |
| Rotis / Hiroshige fonts | `fonts/` | Already the databook type |

> Note: nature `lightning` is a PNG (others SVG) — re-cut as SVG for crispness (minor).

## 4. Acquisition / redraw list (L5R isn't enough)

Prioritised; specs are targets, not hard rules. Prefer SVG, monochrome-on-transparent so `--db-*` can tint them.

**P1 — needed for header completeness**
1. **Hisuigakure crest** (jade/kingfisher motif) — the one missing village. ~64×64 SVG.
2. **Rank insignia** (Genin · Chūnin · Jōnin · Special Jōnin · ANBU · Kage, + any campaign ranks) — for the rank badge, if we want icons over text. ~24×24 SVG each.

**P2 — identity depth**
3. **Bloodline / dōjutsu marks** (Sharingan, Byakugan, and the campaign's KKG: Mokuton 木, Hyōton 氷, …) — for Origin & Path + the void slot. ~32×32 SVG each.
4. **Original animal village mons** (redraws of the 7 above) — only if Kaihou goes public, to drop the L5R IP.

**P3 — surface polish**
5. **Databook paper texture** (subtle cream grain) — current `textures/` are sumi-e scroll, too zen. 1 tileable WebP.
6. **Portrait corner-plate / bust frame** ornament — to match the databook bust look in `docs/design/mockups/04-sheet-final-approved.html`. SVG frame.
7. **Section-header flourish** (databook rule/ornament) — optional, for `.db-panel__h`.

## 5. How to acquire

- **Village mons / rank insignia / bloodline marks:** simple geometric motifs — commission, hand-author as SVG, or generate then clean up. Keep them original to stay clear of FFG IP.
- **Texture / frame:** author or source under a permissive licence (OFL/CC0).
- Track new assets in this file as they land; wire them via the `--db-*`-tintable SVG convention.
