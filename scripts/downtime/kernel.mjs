import { readClock, sunTimesFor } from "./calendaria.mjs";
import { suggestBlock, makeBlockId } from "./block-identity.mjs";
import { seedRoster, resolveRecipients } from "./roster.mjs";
import {
  createBlockRecord,
  openPrompt,
  upsertSubmission,
  closeCollection,
  resolveBlock,
} from "./ledger.mjs";
import { MESSAGES, validateSubmission } from "./messages.mjs";

const MODULE_ID = "naruto-d20-kaihou";
const CHANNEL = `module.${MODULE_ID}`;

function calendariaApi() {
  return globalThis.CALENDARIA?.api ?? null;
}

export function getDowntimeMode() {
  return game.settings.get(MODULE_ID, "downtimeMode") === true;
}

export async function setDowntimeMode(on) {
  await game.settings.set(MODULE_ID, "downtimeMode", on === true);
  game.socket.emit(CHANNEL, { action: MESSAGES.MODE_CHANGE, on: on === true });
  return on === true;
}

/** Suggest { calendarId, date, block } from Calendaria, or null if unavailable. */
export function suggestCurrentBlock() {
  const clock = readClock(calendariaApi());
  if (!clock) return null;
  const block = suggestBlock(clock.hour, sunTimesFor(calendariaApi()));
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

function ensureRoster() {
  let roster = game.settings.get(MODULE_ID, "downtimeRoster") ?? [];
  if (roster.length === 0) {
    roster = seedRoster(game.users.contents.map((u) => ({ isGM: u.isGM, character: u.character })));
    game.settings.set(MODULE_ID, "downtimeRoster", roster);
  }
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
  const suggestion = suggestCurrentBlock();
  if (!suggestion) {
    ui.notifications?.warn("Calendaria is unavailable; cannot create a block.");
    return null;
  }
  const chosen = block ?? suggestion.block;
  const id = makeBlockId(suggestion.calendarId, suggestion.date, chosen);
  const recipients = resolveRecipients(ensureRoster(), resolveActorFor);
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
  game.socket.emit(CHANNEL, { action: MESSAGES.PROMPT_OPEN, blockId: id });
  return record;
}

export function getCurrentBlockRecord() {
  const ledger = getLedger();
  const open = Object.values(ledger).find((r) => r.status === "open");
  return open ?? null;
}

function userOwnsActor(userId, actorUuid) {
  const actor = fromUuidSync?.(actorUuid);
  const user = game.users.get(userId);
  return Boolean(actor && user && actor.testUserPermission?.(user, "OWNER"));
}

/** Registered on the active GM client only: apply validated player submissions. */
async function handleSocket(msg) {
  if (game.user !== game.users.activeGM) return;
  if (msg?.action !== MESSAGES.PROMPT_SUBMIT) return;
  const record = getCurrentBlockRecord();
  const check = validateSubmission(record, msg, userOwnsActor);
  if (!check.ok) {
    console.warn(`${MODULE_ID} | rejected submission: ${check.reason}`);
    return;
  }
  await writeRecord(upsertSubmission(record, msg.submission));
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
  game.socket.on(CHANNEL, handleSocket);
  game[MODULE_ID] = game[MODULE_ID] || {};
  game[MODULE_ID].downtime = {
    openConsole: () => console.warn(`${MODULE_ID} | console arrives in the GM console task`),
    setDowntimeMode,
    getDowntimeMode,
    suggestCurrentBlock,
    promptCurrentBlock,
    getCurrentBlockRecord,
    closeCollection: async () => writeRecord(closeCollection(getCurrentBlockRecord())),
    resolveBlock: async (id) => {
      const ledger = getLedger();
      if (!ledger[id]) return null;
      return writeRecord(resolveBlock(ledger[id]));
    },
  };
  console.log(`${MODULE_ID} | downtime kernel registered`);
}
