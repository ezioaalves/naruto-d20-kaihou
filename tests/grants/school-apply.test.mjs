import { describe, it, expect, beforeEach, vi } from "vitest";
import { applySchoolPackage } from "../../scripts/grants/school-apply.mjs";

function mockDoc(name) {
  return {
    name,
    uuid: `Compendium.naruto-d20.feats.Item.${name}`,
    img: "icon.png",
    toObject: () => ({ name, type: "feat" }),
  };
}

function mockPack(docsByName) {
  return {
    async getIndex() {
      return Object.values(docsByName).map((doc, i) => ({
        _id: `id-${i}`,
        name: doc.name,
        type: "feat",
      }));
    },
    async getDocument(id) {
      const index = Number(id.replace("id-", ""));
      return Object.values(docsByName)[index];
    },
  };
}

describe("applySchoolPackage", () => {
  let actor;
  let schoolItem;

  beforeEach(() => {
    actor = {
      items: [],
      createEmbeddedDocuments: vi.fn(async () => []),
    };
    schoolItem = {
      id: "school-item-id",
      name: "Test School",
      update: vi.fn(async () => {}),
    };
    globalThis.ui = { notifications: { warn: vi.fn(), info: vi.fn() } };
    globalThis.console.warn = vi.fn();
    globalThis.foundry = {
      utils: {
        randomID: () => "rand-id",
        setProperty: (obj, path, value) => {
          const keys = path.split(".");
          let node = obj;
          for (const key of keys.slice(0, -1)) node = node[key] ??= {};
          node[keys.at(-1)] = value;
        },
      },
    };
  });

  it("creates the bonus feat and links it when the actor has no matching item", async () => {
    const bonusFeat = mockDoc("Improved Initiative");
    globalThis.game = { packs: { get: () => mockPack({ bonusFeat }) } };

    const school = { slug: "test-school", bonusFeat: "Improved Initiative", startingTechniques: [] };
    await applySchoolPackage(actor, schoolItem, school);

    expect(actor.createEmbeddedDocuments).toHaveBeenCalledTimes(1);
    expect(schoolItem.update).toHaveBeenCalledWith({
      "system.links.supplements": [
        expect.objectContaining({ name: "Improved Initiative" }),
      ],
    });
  });

  it("still links the bonus feat when the actor already has a matching item, without re-creating it", async () => {
    // Regression test: a feat with the same name already exists on the actor
    // (e.g. granted by an earlier wizard step) — the school should still
    // record it as one of its grants, it just shouldn't create a duplicate.
    actor.items = [{ name: "Improved Initiative", getFlag: () => undefined }];
    const bonusFeat = mockDoc("Improved Initiative");
    globalThis.game = { packs: { get: () => mockPack({ bonusFeat }) } };

    const school = { slug: "test-school", bonusFeat: "Improved Initiative", startingTechniques: [] };
    await applySchoolPackage(actor, schoolItem, school);

    expect(actor.createEmbeddedDocuments).not.toHaveBeenCalled();
    expect(schoolItem.update).toHaveBeenCalledWith({
      "system.links.supplements": [
        expect.objectContaining({ name: "Improved Initiative" }),
      ],
    });
  });

  it("warns and skips linking when the bonus feat can't be found in any compendium", async () => {
    globalThis.game = { packs: { get: () => mockPack({}) } };

    const school = { slug: "test-school", bonusFeat: "Nonexistent Feat", startingTechniques: [] };
    await applySchoolPackage(actor, schoolItem, school);

    expect(actor.createEmbeddedDocuments).not.toHaveBeenCalled();
    expect(schoolItem.update).not.toHaveBeenCalled();
    expect(globalThis.ui.notifications.warn).toHaveBeenCalledWith(
      expect.stringContaining("Nonexistent Feat"),
    );
  });
});
