// tests/theme/css-scoping.test.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, it, expect } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const CSS_PATH = resolve(here, "../../styles/theme/zen.css");

function readCss() {
  return readFileSync(CSS_PATH, "utf8");
}

// A selector list ends at the next "{". Split the file into the selector text
// that precedes each rule block so we can inspect selectors in isolation.
function selectorTexts(css) {
  const out = [];
  const re = /([^{}]+)\{/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    out.push(m[1].trim());
  }
  return out;
}

describe("compiled zen.css scoping", () => {
  it("contains no stray '&' parent selectors (those are invalid CSS the browser drops)", () => {
    const css = readCss();
    // A literal '&' followed by a class/element char means a partial's `&.foo`
    // rule was emitted without a parent — i.e. the scoping wrapper is missing.
    const leaks = [...css.matchAll(/&[a-zA-Z.#:[]/g)].map((x) => x[0]);
    expect(leaks).toEqual([]);
  });

  it("scopes every .tab.chakra rule under body.naruto-zen .naruto-zen-target", () => {
    const offenders = selectorTexts(readCss())
      .filter((sel) => sel.includes(".tab.chakra"))
      .filter((sel) =>
        // every selector in the (possibly comma-separated) list must carry the scope
        sel.split(",").some(
          (one) => one.includes(".tab.chakra") &&
            !one.includes("body.naruto-zen") &&
            !one.includes(".naruto-zen-target"),
        ),
      );
    expect(offenders).toEqual([]);
  });
});
