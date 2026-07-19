import "./setup-foundry.mjs";
import { describe, it, expect } from "vitest";
import { KaihouApplication } from "../../scripts/apps/kaihou-application.mjs";
import DowntimeConsole from "../../scripts/apps/downtime/gm-console.mjs";
import DowntimePrompt from "../../scripts/apps/downtime/player-prompt.mjs";

describe("downtime apps migrated onto KaihouApplication", () => {
  it("DowntimeConsole extends KaihouApplication", () => {
    expect(Object.getPrototypeOf(DowntimeConsole)).toBe(KaihouApplication);
  });

  it("DowntimePrompt extends KaihouApplication", () => {
    expect(Object.getPrototypeOf(DowntimePrompt)).toBe(KaihouApplication);
  });

  it("neither app carries a bespoke _wireChangeActions (base class owns it)", () => {
    expect(Object.prototype.hasOwnProperty.call(DowntimeConsole.prototype, "_wireChangeActions")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(DowntimePrompt.prototype, "_wireChangeActions")).toBe(false);
  });

  it("DowntimePrompt implements _onReopen reopen semantics", () => {
    expect(Object.prototype.hasOwnProperty.call(DowntimePrompt.prototype, "_onReopen")).toBe(true);
  });

  it("DowntimeConsole keeps its own static open (GM gate) over the base singleton", () => {
    expect(Object.prototype.hasOwnProperty.call(DowntimeConsole, "open")).toBe(true);
  });

  it("DowntimeConsole.open() returns null for non-GM users", () => {
    globalThis.game = { user: { isGM: false } };
    expect(DowntimeConsole.open()).toBe(null);
  });

  it("DowntimePrompt.closeIfOpen is a no-op when no instance is registered", () => {
    // Must not throw against the base registry when nothing has been opened.
    expect(() => DowntimePrompt.closeIfOpen(null)).not.toThrow();
    expect(() => DowntimePrompt.closeIfOpen("greg:1-1-1:sunrise")).not.toThrow();
  });

  it("DowntimePrompt constructor stores record/actor for _prepareContext", async () => {
    // No naruto-d20 module in the stub game → getTechniqueApi() returns null,
    // and the option builders fall back to empty lists.
    globalThis.game = {};
    const record = { block: "sunrise", date: { label: "Day 1" } };
    const actor = { name: "Aburame Suigin" };
    const app = new DowntimePrompt(record, actor);
    const ctx = await app._prepareContext();
    expect(ctx.actorName).toBe("Aburame Suigin");
    expect(ctx.block).toBe("sunrise");
    expect(ctx.selectedAction).toBe("technique");
  });
});
