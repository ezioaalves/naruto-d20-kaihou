import "./setup-foundry.mjs";
import { describe, it, expect } from "vitest";
import { buildConsoleContext } from "../../scripts/apps/downtime/gm-console.mjs";

describe("buildConsoleContext", () => {
  it("reports inactive shell when downtime mode is off", () => {
    const ctx = buildConsoleContext({ mode: false, suggestion: null, record: null });
    expect(ctx.active).toBe(false);
    expect(ctx.blocks).toEqual(["sunrise", "midday", "sunset"]);
  });
  it("exposes suggestion + recipients when active", () => {
    const ctx = buildConsoleContext({
      mode: true,
      suggestion: { date: { label: "Day 7" }, block: "midday" },
      record: { recipients: [{ actorName: "A", status: "pending" }], order: [], submissions: {} },
    });
    expect(ctx.active).toBe(true);
    expect(ctx.suggestedBlock).toBe("midday");
    expect(ctx.dateLabel).toBe("Day 7");
    expect(ctx.recipients).toEqual([{ actorName: "A", status: "pending" }]);
  });
});
