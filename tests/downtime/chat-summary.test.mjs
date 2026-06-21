import { describe, it, expect } from "vitest";
import { buildChatSummary } from "../../scripts/downtime/chat-summary.mjs";

function record() {
  return {
    date: { label: "Day 1" },
    block: "sunrise",
    order: ["s1", "s2"],
    submissions: {
      s1: { actorName: "Suigin", action: "technique", requestScene: false, rollResult: { ok: true } },
      s2: { actorName: "Kubo", action: "other", requestScene: true },
    },
  };
}

describe("buildChatSummary", () => {
  it("includes the date label and block in a heading", () => {
    const html = buildChatSummary(record());
    expect(html).toContain("Day 1");
    expect(html).toContain("sunrise");
  });
  it("lists every submitted actor and action in order", () => {
    const html = buildChatSummary(record());
    const iSuigin = html.indexOf("Suigin");
    const iKubo = html.indexOf("Kubo");
    expect(iSuigin).toBeGreaterThan(-1);
    expect(iKubo).toBeGreaterThan(iSuigin);
    expect(html).toContain("technique");
    expect(html).toContain("other");
  });
  it("marks scene requests and resolved results", () => {
    const html = buildChatSummary(record());
    expect(html).toContain("scene");   // Kubo requested a scene
    expect(html).toContain("✓");       // Suigin resolved ok
  });
  it("skips ids with no submission", () => {
    const r = record();
    r.order.push("ghost");
    expect(() => buildChatSummary(r)).not.toThrow();
  });
});
