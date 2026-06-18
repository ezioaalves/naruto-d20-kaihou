// tests/theme/databook.test.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, it, expect } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(resolve(here, "../../styles/theme/zen.css"), "utf8");

function selectorTexts(src) {
  const out = [];
  const re = /([^{}]+)\{/g;
  let m;
  while ((m = re.exec(src)) !== null) out.push(m[1].trim());
  return out;
}

describe("databook tokens", () => {
  it("publishes the radar --db-* tokens and canonical --k-* palette", () => {
    // Phase 6: --db-* aliases were dropped; only radar tokens remain in _databook-tokens.scss.
    for (const t of ["--db-radar-grid", "--db-radar-ability-fill", "--db-radar-discipline-stroke"]) {
      expect(css).toContain(t);
    }
    // Canonical layer must be present.
    for (const t of ["--k-seal", "--k-crab", "--k-paper", "--k-ink"]) {
      expect(css).toContain(t);
    }
  });
});

describe("databook component classes", () => {
  it("emits the component primitives", () => {
    for (const c of [".db-band", ".db-badge", ".db-pip", ".db-radar", ".db-panel", ".db-nat"]) {
      expect(css).toContain(c);
    }
  });
});

describe("kaihou sheet scoping", () => {
  // The bespoke sheet is scoped by its own guaranteed form class
  // (.kaihou-databook-form), NOT the theme's runtime-tagged .naruto-zen-target —
  // so it lays out correctly regardless of the zen-theme toggle. These
  // sheet-surface classes must therefore never appear unscoped (they'd leak onto
  // every actor sheet); every rule that styles one must include
  // .kaihou-databook-form in that comma-segment of its selector.
  const SHEET_SURFACE_CLASSES = [
    ".db-frontmatter",
    ".db-identity-edit",
    ".db-radars",
    ".db-row2",
    ".db-missions",
    ".tab.identity",
  ];

  it("scopes every sheet-surface rule under .kaihou-databook-form", () => {
    const offenders = selectorTexts(css)
      .flatMap((sel) => sel.split(","))
      .map((one) => one.trim())
      .filter((one) => SHEET_SURFACE_CLASSES.some((c) => one.includes(c)))
      .filter((one) => !one.includes(".kaihou-databook-form"));
    expect(offenders).toEqual([]);
  });
});
