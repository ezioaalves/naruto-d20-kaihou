import { vi, describe, it, expect, beforeEach } from "vitest";
import "./setup-foundry.mjs";

vi.mock("../../scripts/apps/downtime/player-prompt.mjs", () => ({
  default: { open: vi.fn(), closeIfOpen: vi.fn() },
}));
vi.mock("../../scripts/apps/downtime/gm-console.mjs", () => ({
  default: { open: vi.fn(), instance: { render: vi.fn() } },
}));
vi.mock("../../scripts/downtime/technique-adapter.mjs", () => ({
  runTechniqueAttempt: vi.fn().mockResolvedValue({ outcome: "success" }),
  getTechniqueApi: vi.fn(() => ({})),
}));
vi.mock("../../scripts/downtime/chat-summary.mjs", () => ({
  buildChatSummary: vi.fn(() => "<p>summary</p>"),
}));

import {
  registerDowntimeSocket,
  registerDowntimeSettings,
  registerDowntimeKernel,
  getDowntimeMode,
  setDowntimeMode,
  getCurrentBlockRecord,
  submitDowntimeAction,
} from "../../scripts/downtime/kernel.mjs";
import { default as DowntimePrompt } from "../../scripts/apps/downtime/player-prompt.mjs";
import { default as DowntimeConsole } from "../../scripts/apps/downtime/gm-console.mjs";

const MODULE_ID = "naruto-d20-kaihou";

function makeSettings(store = {}) {
  const s = Object.assign({}, store);
  return {
    get: vi.fn((_, key) => (key in s ? s[key] : null)),
    set: vi.fn(async (_, key, val) => { s[key] = val; }),
    register: vi.fn(),
    _store: s,
  };
}

function makeSocket() {
  const handlers = {};
  return {
    register: vi.fn((name, fn) => { handlers[name] = fn; }),
    executeForEveryone: vi.fn(),
    executeForUsers: vi.fn(),
    executeAsGM: vi.fn(),
    handlers,
  };
}

function openRecord(id = "greg:1-1-1:sunrise") {
  return {
    id,
    status: "open",
    calendarId: "greg",
    date: { year: 1, month: 1, day: 1, label: "Day 1" },
    block: "sunrise",
    gmUserId: "gm1",
    recipients: [{ userId: "u1", actorUuid: "Actor.a", actorName: "A", status: "pending" }],
    submissions: {},
    order: [],
    createdAt: 1000,
  };
}

function validSubmission(over = {}) {
  return {
    id: "sub1",
    userId: "u1",
    actorUuid: "Actor.a",
    actorName: "A",
    submittedAt: Date.now(),
    action: "npc",
    requestScene: false,
    payload: {},
    rollPolicy: "manual",
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("registerDowntimeSocket", () => {
  it("registers the four expected handler names", () => {
    const socket = makeSocket();
    registerDowntimeSocket(socket);
    expect(socket.register).toHaveBeenCalledTimes(4);
    for (const name of ["openPrompt", "closePrompt", "modeChange", "submitAction"]) {
      expect(socket.register).toHaveBeenCalledWith(name, expect.any(Function));
    }
  });
});

describe("getDowntimeMode", () => {
  it("returns true when setting is true", () => {
    globalThis.game = { settings: makeSettings({ downtimeMode: true }) };
    expect(getDowntimeMode()).toBe(true);
  });

  it("returns false when setting is false", () => {
    globalThis.game = { settings: makeSettings({ downtimeMode: false }) };
    expect(getDowntimeMode()).toBe(false);
  });

  it("returns false when setting is absent", () => {
    globalThis.game = { settings: makeSettings({}) };
    expect(getDowntimeMode()).toBe(false);
  });
});

describe("setDowntimeMode", () => {
  it("writes the setting and broadcasts to everyone", async () => {
    const socket = makeSocket();
    registerDowntimeSocket(socket);
    const settings = makeSettings();
    globalThis.game = { settings };
    await setDowntimeMode(true);
    expect(settings.set).toHaveBeenCalledWith(MODULE_ID, "downtimeMode", true);
    expect(socket.executeForEveryone).toHaveBeenCalledWith("modeChange", true);
  });

  it("coerces non-boolean to false", async () => {
    const socket = makeSocket();
    registerDowntimeSocket(socket);
    const settings = makeSettings();
    globalThis.game = { settings };
    await setDowntimeMode(undefined);
    expect(settings.set).toHaveBeenCalledWith(MODULE_ID, "downtimeMode", false);
    expect(socket.executeForEveryone).toHaveBeenCalledWith("modeChange", false);
  });
});

describe("getCurrentBlockRecord", () => {
  it("returns null when ledger is empty", () => {
    globalThis.game = { settings: makeSettings({ downtimeLedger: {} }) };
    expect(getCurrentBlockRecord()).toBe(null);
  });

  it("returns null when ledger setting is absent", () => {
    globalThis.game = { settings: makeSettings({}) };
    expect(getCurrentBlockRecord()).toBe(null);
  });

  it("returns the open record", () => {
    const r = openRecord();
    globalThis.game = { settings: makeSettings({ downtimeLedger: { [r.id]: r } }) };
    expect(getCurrentBlockRecord()).toEqual(r);
  });

  it("ignores closed records", () => {
    const r = { ...openRecord("a"), status: "closed" };
    globalThis.game = { settings: makeSettings({ downtimeLedger: { a: r } }) };
    expect(getCurrentBlockRecord()).toBe(null);
  });

  it("ignores resolved records", () => {
    const r = { ...openRecord("b"), status: "resolved" };
    globalThis.game = { settings: makeSettings({ downtimeLedger: { b: r } }) };
    expect(getCurrentBlockRecord()).toBe(null);
  });
});

describe("submitDowntimeAction", () => {
  it("delegates to _socket.executeAsGM", () => {
    const socket = makeSocket();
    registerDowntimeSocket(socket);
    const sub = validSubmission();
    submitDowntimeAction(sub);
    expect(socket.executeAsGM).toHaveBeenCalledWith("submitAction", sub);
  });
});

describe("registerDowntimeSettings", () => {
  it("registers downtimeMode, downtimeRoster, and downtimeLedger with world scope", () => {
    const settings = makeSettings();
    globalThis.game = { settings };
    registerDowntimeSettings();
    const calls = settings.register.mock.calls;
    const keys = calls.map(([, key]) => key);
    expect(keys).toContain("downtimeMode");
    expect(keys).toContain("downtimeRoster");
    expect(keys).toContain("downtimeLedger");
    for (const [, , opts] of calls) {
      expect(opts.scope).toBe("world");
    }
  });
});

describe("registerDowntimeKernel", () => {
  it("exposes the downtime API and is idempotent on subsequent calls", () => {
    globalThis.game = { settings: makeSettings(), [MODULE_ID]: {} };
    registerDowntimeKernel();
    const api = globalThis.game[MODULE_ID].downtime;
    for (const method of [
      "setDowntimeMode", "getDowntimeMode", "getCurrentBlockRecord",
      "promptCurrentBlock", "runSubmission", "closeBlockCollection",
      "postBlockSummary", "openConsole", "closeCollection", "resolveBlock",
    ]) {
      expect(typeof api[method], `api.${method} should be a function`).toBe("function");
    }
    // Sentinel: overwrite API, second call must not re-register
    globalThis.game[MODULE_ID].downtime = null;
    registerDowntimeKernel();
    expect(globalThis.game[MODULE_ID].downtime).toBe(null);
  });
});

describe("socket handler: onSubmitAction", () => {
  it("writes the submission to the ledger when validation passes", async () => {
    const r = openRecord();
    const settings = makeSettings({ downtimeLedger: { [r.id]: r } });
    const actor = { testUserPermission: vi.fn(() => true) };
    globalThis.game = {
      settings,
      users: { get: vi.fn(() => ({ id: "u1" })) },
    };
    globalThis.fromUuidSync = vi.fn((uuid) => (uuid === "Actor.a" ? actor : null));

    const socket = makeSocket();
    registerDowntimeSocket(socket);

    await socket.handlers.submitAction(validSubmission());

    expect(settings.set).toHaveBeenCalledWith(
      MODULE_ID,
      "downtimeLedger",
      expect.objectContaining({
        [r.id]: expect.objectContaining({
          submissions: expect.objectContaining({ sub1: expect.any(Object) }),
        }),
      }),
    );
    expect(DowntimeConsole.instance.render).toHaveBeenCalledWith(false);
  });

  it("rejects when there is no open block", async () => {
    const settings = makeSettings({ downtimeLedger: {} });
    globalThis.game = { settings, users: { get: vi.fn() } };
    globalThis.fromUuidSync = vi.fn(() => null);

    const socket = makeSocket();
    registerDowntimeSocket(socket);

    await socket.handlers.submitAction(validSubmission());
    expect(settings.set).not.toHaveBeenCalled();
  });

  it("rejects when the user does not own the actor", async () => {
    const r = openRecord();
    const settings = makeSettings({ downtimeLedger: { [r.id]: r } });
    globalThis.game = {
      settings,
      users: { get: vi.fn(() => ({ id: "u1" })) },
    };
    // actor exists but ownership check fails
    globalThis.fromUuidSync = vi.fn(() => ({ testUserPermission: vi.fn(() => false) }));

    const socket = makeSocket();
    registerDowntimeSocket(socket);

    await socket.handlers.submitAction(validSubmission());
    expect(settings.set).not.toHaveBeenCalled();
  });
});

describe("socket handler: onClosePrompt", () => {
  it("calls DowntimePrompt.closeIfOpen with the block id", async () => {
    const socket = makeSocket();
    registerDowntimeSocket(socket);
    await socket.handlers.closePrompt("greg:1-1-1:sunrise");
    expect(DowntimePrompt.closeIfOpen).toHaveBeenCalledWith("greg:1-1-1:sunrise");
  });
});

describe("socket handler: onModeChange", () => {
  it("calls DowntimePrompt.closeIfOpen(null) when mode turns off", async () => {
    const socket = makeSocket();
    registerDowntimeSocket(socket);
    await socket.handlers.modeChange(false);
    expect(DowntimePrompt.closeIfOpen).toHaveBeenCalledWith(null);
  });

  it("does not call closeIfOpen when mode turns on", async () => {
    const socket = makeSocket();
    registerDowntimeSocket(socket);
    await socket.handlers.modeChange(true);
    expect(DowntimePrompt.closeIfOpen).not.toHaveBeenCalled();
  });
});
