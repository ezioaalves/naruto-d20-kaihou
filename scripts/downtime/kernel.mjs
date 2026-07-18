import { readClock, sunTimesFor } from "./calendaria.mjs";
import { suggestBlock, makeBlockId } from "./block-identity.mjs";
import { seedRoster, resolveRecipients } from "./roster.mjs";
import {
  createBlockRecord,
  openPrompt,
  upsertSubmission,
  closeCollection,
  resolveBlock,
  recordResult,
} from "./ledger.mjs";
import { validateSubmission } from "./messages.mjs";
import { validateActionPayload } from "./action-payloads.mjs";

const MODULE_ID = "naruto-d20-kaihou";

let _kernelRegistered = false;
let _socket = null;

function calendariaApi() {
  return globalThis.CALENDARIA?.api ?? null;
}

export function getDowntimeMode() {
  return game.settings.get(MODULE_ID, "downtimeMode") === true;
}

export async function setDowntimeMode(on) {
  await game.settings.set(MODULE_ID, "downtimeMode", on === true);
  _socket?.executeForEveryone("modeChange", on === true);
  return on === true;
}

/** Suggest { calendarId, date, block } from Calendaria, or null if unavailable. */
export function suggestCurrentBlock() {
  const api = calendariaApi();
  const clock = readClock(api);
  if (!clock) return null;
  const block = suggestBlock(clock.hour, sunTimesFor(api));
  return { calendarId: clock.calendarId, date: clock.date, block };
}

function getLedger() {
  return game.settings.get(MODULE_ID, "downtimeLedger") ?? {};
}

async function writeRecord(record) {
  const ledger = { ...getLedger(), [record.id]: record };
  await game.settings.set(MODULE_ID, "downtimeLedger", ledger);
  return record;
}

async function ensureRoster() {
  // Always rebuild from current users so stale character assignments don't persist.
  const roster = seedRoster(game.users.contents.map((u) => ({ isGM: u.isGM, character: u.character })));
  await game.settings.set(MODULE_ID, "downtimeRoster", roster);
  return roster;
}

function resolveActorFor(uuid) {
  const actor = fromUuidSync?.(uuid) ?? null;
  if (!actor) return null;
  const owner = game.users.find((u) => !u.isGM && u.active && actor.testUserPermission?.(u, "OWNER"));
  return { uuid, name: actor.name, ownerUserId: owner?.id ?? null };
}

/** GM-only: create + open a block prompt for the given (confirmed) block. */
export async function promptCurrentBlock(block) {
  if (!getDowntimeMode()) {
    ui.notifications?.warn("Downtime Mode is off.");
    return null;
  }
  if (getCurrentBlockRecord()) {
    ui.notifications?.warn("A block is already open.");
    return null;
  }
  const suggestion = suggestCurrentBlock();
  if (!suggestion) {
    ui.notifications?.warn("Calendaria is unavailable; cannot create a block.");
    return null;
  }
  const chosen = block ?? suggestion.block;
  const id = makeBlockId(suggestion.calendarId, suggestion.date, chosen);
  const recipients = resolveRecipients(await ensureRoster(), resolveActorFor);
  let record = createBlockRecord({
    id,
    calendarId: suggestion.calendarId,
    date: suggestion.date,
    block: chosen,
    gmUserId: game.user.id,
    recipients,
  });
  record = openPrompt(record);
  await writeRecord(record);
  const userIds = [...new Set(recipients.map((r) => r.userId).filter(Boolean))];
  _socket?.executeForUsers("openPrompt", userIds, record);
  return record;
}

export function getCurrentBlockRecord() {
  const ledger = getLedger();
  const open = Object.values(ledger).find((r) => r.status === "open");
  return open ?? null;
}

function lastResolvableRecord() {
  const ledger = getLedger();
  const records = Object.values(ledger).filter((x) => x.status === "closed" || x.status === "resolved");
  return records.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))[0] ?? null;
}

async function runAndRecord(submissionId) {
  const current = getCurrentBlockRecord();
  if (!current) return null;
  const sub = current.submissions[submissionId];
  if (!sub) return null;
  const { runTechniqueAttempt, getTechniqueApi } = await import("./technique-adapter.mjs");
  const result = await runTechniqueAttempt({
    submission: sub,
    api: getTechniqueApi(),
    resolveItem: (uuid) => (typeof fromUuid === "function" ? fromUuid(uuid) : null),
  });
  return writeRecord(recordResult(current, submissionId, result));
}

export async function runSubmission(submissionId) {
  if (!submissionId) return null;
  return runAndRecord(submissionId);
}

export async function closeBlockCollection() {
  const r = getCurrentBlockRecord();
  if (!r) {
    ui.notifications?.warn("No open block to close.");
    return null;
  }
  const closed = await writeRecord(closeCollection(r));
  _socket?.executeForEveryone("closePrompt", closed.id);
  return closed;
}

export async function postBlockSummary() {
  const r = getCurrentBlockRecord() ?? lastResolvableRecord();
  if (!r) {
    ui.notifications?.warn("No block to summarize.");
    return;
  }
  const { buildChatSummary } = await import("./chat-summary.mjs");
  await ChatMessage.create({ content: buildChatSummary(r) });
}

function userOwnsActor(userId, actorUuid) {
  const actor = fromUuidSync?.(actorUuid);
  const user = game.users.get(userId);
  return Boolean(actor && user && actor.testUserPermission?.(user, "OWNER"));
}

/** Called on the targeted player's client when a block opens. */
async function onOpenPrompt(record) {
  console.log(`${MODULE_ID} | onOpenPrompt called`, { userId: game.user.id, record });
  if (!record || record.status !== "open") { console.warn(`${MODULE_ID} | onOpenPrompt: bad record status`); return; }
  const mine = record.recipients.find((r) => r.userId === game.user.id);
  if (!mine) { console.warn(`${MODULE_ID} | onOpenPrompt: user not in recipients`); return; }
  const actor = fromUuidSync?.(mine.actorUuid);
  if (!actor) { console.warn(`${MODULE_ID} | onOpenPrompt: actor not found`, mine.actorUuid); return; }
  const { default: DowntimePrompt } = await import("../apps/downtime/player-prompt.mjs");
  DowntimePrompt.open(record, actor);
}

/** Called on every client when a block collection closes. */
async function onClosePrompt(blockId) {
  const { default: DowntimePrompt } = await import("../apps/downtime/player-prompt.mjs");
  DowntimePrompt.closeIfOpen(blockId);
}

/** Called on every client when downtime mode changes. */
async function onModeChange(on) {
  if (on) return;
  const { default: DowntimePrompt } = await import("../apps/downtime/player-prompt.mjs");
  DowntimePrompt.closeIfOpen(null);
}

/** Called as GM when a player submits an action. */
async function onSubmitAction(submission) {
  const record = getCurrentBlockRecord();
  const check = validateSubmission(record, { userId: submission.userId, submission }, userOwnsActor);
  if (!check.ok) {
    console.warn(`${MODULE_ID} | rejected submission: ${check.reason}`);
    return;
  }
  const payloadCheck = validateActionPayload(submission);
  if (!payloadCheck.ok) {
    console.warn(`${MODULE_ID} | rejected payload: ${payloadCheck.reason}`);
    return;
  }
  await writeRecord(upsertSubmission(record, submission));
  if (submission.rollPolicy === "auto" && submission.action === "technique") {
    await runAndRecord(submission.id);
  }
}

/** Register the four socketlib handlers. Called from kaihou.mjs on socketlib.ready. */
export function registerDowntimeSocket(libSocket) {
  _socket = libSocket;
  _socket.register("openPrompt", onOpenPrompt);
  _socket.register("closePrompt", onClosePrompt);
  _socket.register("modeChange", onModeChange);
  _socket.register("submitAction", onSubmitAction);
}

/** Player-side: send a submission to the GM via socketlib. */
export function submitDowntimeAction(submission) {
  return _socket.executeAsGM("submitAction", submission);
}

export function registerDowntimeSettings() {
  game.settings.register(MODULE_ID, "downtimeMode", {
    scope: "world", config: false, type: Boolean, default: false,
  });
  game.settings.register(MODULE_ID, "downtimeRoster", {
    scope: "world", config: false, type: Array, default: [],
  });
  game.settings.register(MODULE_ID, "downtimeLedger", {
    scope: "world", config: false, type: Object, default: {},
  });
}

export function registerDowntimeKernel() {
  if (_kernelRegistered) return;
  _kernelRegistered = true;
  game[MODULE_ID] = game[MODULE_ID] || {};
  game[MODULE_ID].downtime = {
    openConsole: async () => {
      const { default: DowntimeConsole } = await import("../apps/downtime/gm-console.mjs");
      return DowntimeConsole.open();
    },
    setDowntimeMode,
    getDowntimeMode,
    suggestCurrentBlock,
    promptCurrentBlock,
    getCurrentBlockRecord,
    runSubmission,
    closeBlockCollection,
    postBlockSummary,
    closeCollection: async () => {
      const r = getCurrentBlockRecord();
      if (!r) { ui.notifications?.warn("No open block to close."); return null; }
      return writeRecord(closeCollection(r));
    },
    resolveBlock: async (id) => {
      const ledger = getLedger();
      if (!ledger[id]) return null;
      if (ledger[id].status !== "closed") {
        ui.notifications?.warn("Cannot resolve a block that is not closed.");
        return null;
      }
      return writeRecord(resolveBlock(ledger[id]));
    },
  };
  console.log(`${MODULE_ID} | downtime kernel registered`);
}
