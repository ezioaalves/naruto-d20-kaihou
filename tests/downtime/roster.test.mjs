import { describe, it, expect } from "vitest";
import { seedRoster, addToRoster, removeFromRoster, resolveRecipients } from "../../scripts/downtime/roster.mjs";

describe("seedRoster", () => {
  it("collects non-GM assigned character uuids, de-duplicated", () => {
    const users = [
      { isGM: true, character: { uuid: "Actor.gm" } },
      { isGM: false, character: { uuid: "Actor.a" } },
      { isGM: false, character: null },
      { isGM: false, character: { uuid: "Actor.a" } },
      { isGM: false, character: { uuid: "Actor.b" } },
    ];
    expect(seedRoster(users)).toEqual(["Actor.a", "Actor.b"]);
  });
});

describe("addToRoster / removeFromRoster", () => {
  it("adds without duplicating and removes immutably", () => {
    const base = ["Actor.a"];
    expect(addToRoster(base, "Actor.b")).toEqual(["Actor.a", "Actor.b"]);
    expect(addToRoster(base, "Actor.a")).toEqual(["Actor.a"]);
    expect(removeFromRoster(["Actor.a", "Actor.b"], "Actor.a")).toEqual(["Actor.b"]);
    expect(base).toEqual(["Actor.a"]); // unchanged
  });
});

describe("resolveRecipients", () => {
  it("maps rostered actors to pending recipients and skips unknowns", () => {
    const resolveActor = (uuid) =>
      uuid === "Actor.a" ? { uuid, name: "Suigin", ownerUserId: "user1" } : null;
    expect(resolveRecipients(["Actor.a", "Actor.gone"], resolveActor)).toEqual([
      { userId: "user1", actorUuid: "Actor.a", actorName: "Suigin", status: "pending" },
    ]);
  });
});
