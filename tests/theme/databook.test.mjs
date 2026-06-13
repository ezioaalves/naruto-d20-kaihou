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
  it("publishes the core --db-* tokens", () => {
    for (const t of ["--db-red", "--db-ink", "--db-cream", "--db-panel", "--db-void"]) {
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
  it("scopes every .kaihou-databook rule under body.naruto-zen .naruto-zen-target", () => {
    const offenders = selectorTexts(css)
      .filter((sel) => sel.includes(".kaihou-databook"))
      .filter((sel) =>
        sel.split(",").some(
          (one) => one.includes(".kaihou-databook") && !one.includes(".naruto-zen-target"),
        ),
      );
    expect(offenders).toEqual([]);
  });
});
