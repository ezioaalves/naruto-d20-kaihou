import { describe, it, expect } from "vitest";
import { makeBlockId, suggestBlock, BLOCKS } from "../../scripts/downtime/block-identity.mjs";

describe("makeBlockId", () => {
  it("formats calendarId:Y-M-D:block", () => {
    expect(makeBlockId("greg", { year: 1024, month: 3, day: 7 }, "midday")).toBe("greg:1024-3-7:midday");
  });
});

describe("BLOCKS", () => {
  it("is the three ordered blocks", () => {
    expect(BLOCKS).toEqual(["sunrise", "midday", "sunset"]);
  });
});

describe("suggestBlock", () => {
  const sun = { sunrise: 6, midday: 12, sunset: 18 };
  it("maps morning to sunrise", () => expect(suggestBlock(8, sun)).toBe("sunrise"));
  it("maps pre-dawn to sunrise", () => expect(suggestBlock(2, sun)).toBe("sunrise"));
  it("maps afternoon to midday", () => expect(suggestBlock(14, sun)).toBe("midday"));
  it("maps evening to sunset", () => expect(suggestBlock(20, sun)).toBe("sunset"));
  it("treats midday hour as midday", () => expect(suggestBlock(12, sun)).toBe("midday"));
  it("treats sunset hour as sunset", () => expect(suggestBlock(18, sun)).toBe("sunset"));
});
