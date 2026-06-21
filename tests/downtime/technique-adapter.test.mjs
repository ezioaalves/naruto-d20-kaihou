import { describe, it, expect, vi } from "vitest";
import {
  buildLearnOptions,
  buildMasterOptions,
  runTechniqueAttempt,
} from "../../scripts/downtime/technique-adapter.mjs";

function fakeItem(over = {}) {
  return {
    uuid: over.uuid ?? "Item.x",
    name: over.name ?? "Body Flicker",
    system: { rank: over.rank ?? 1, discipline: over.discipline ?? "Ninjutsu" },
  };
}

describe("buildLearnOptions", () => {
  it("maps listLearnable items to learn-owned options", () => {
    const api = { listLearnable: () => [fakeItem({ uuid: "Item.a", name: "A", rank: 2, discipline: "Taijutsu" })] };
    expect(buildLearnOptions({}, api)).toEqual([
      { mode: "learn-owned", itemUuid: "Item.a", name: "A", rank: 2, discipline: "Taijutsu" },
    ]);
  });
  it("returns [] when api is missing or lacks listLearnable", () => {
    expect(buildLearnOptions({}, null)).toEqual([]);
    expect(buildLearnOptions({}, {})).toEqual([]);
  });
});

describe("buildMasterOptions", () => {
  it("maps listMasterable items to master-owned options", () => {
    const api = { listMasterable: () => [fakeItem({ uuid: "Item.b", name: "B" })] };
    const opts = buildMasterOptions({}, api);
    expect(opts).toHaveLength(1);
    expect(opts[0]).toMatchObject({ mode: "master-owned", itemUuid: "Item.b", name: "B" });
  });
  it("returns [] when api is missing", () => {
    expect(buildMasterOptions({}, null)).toEqual([]);
  });
});

describe("runTechniqueAttempt", () => {
  it("returns api-unavailable when api is null", async () => {
    const r = await runTechniqueAttempt({ submission: { payload: {} }, api: null, resolveItem: async () => null });
    expect(r).toEqual({ ok: false, reason: "api-unavailable" });
  });
  it("returns item-missing when the item cannot be resolved", async () => {
    const api = { attemptLearnTechnique: vi.fn() };
    const r = await runTechniqueAttempt({
      submission: { payload: { mode: "learn-owned", itemUuid: "Item.gone" } },
      api,
      resolveItem: async () => null,
    });
    expect(r).toEqual({ ok: false, reason: "item-missing" });
    expect(api.attemptLearnTechnique).not.toHaveBeenCalled();
  });
  it("runs the learn attempt for learn-owned and captures a chat message id", async () => {
    const item = fakeItem();
    const api = { attemptLearnTechnique: vi.fn(async () => ({ message: { id: "msg1" } })) };
    const r = await runTechniqueAttempt({
      submission: { payload: { mode: "learn-owned", itemUuid: item.uuid } },
      api,
      resolveItem: async () => item,
    });
    expect(api.attemptLearnTechnique).toHaveBeenCalledWith(item);
    expect(r).toEqual({ ok: true, mode: "learn-owned", chatMessageId: "msg1" });
  });
  it("runs the master attempt for master-owned", async () => {
    const item = fakeItem();
    const api = { attemptMasterTechnique: vi.fn(async () => ({})) };
    const r = await runTechniqueAttempt({
      submission: { payload: { mode: "master-owned", itemUuid: item.uuid } },
      api,
      resolveItem: async () => item,
    });
    expect(api.attemptMasterTechnique).toHaveBeenCalledWith(item);
    expect(r).toEqual({ ok: true, mode: "master-owned", chatMessageId: null });
  });
  it("returns api-unavailable when the needed attempt fn is missing", async () => {
    const item = fakeItem();
    const r = await runTechniqueAttempt({
      submission: { payload: { mode: "master-owned", itemUuid: item.uuid } },
      api: { attemptLearnTechnique: () => {} },
      resolveItem: async () => item,
    });
    expect(r).toEqual({ ok: false, reason: "api-unavailable" });
  });
});
