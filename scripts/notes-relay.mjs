// scripts/notes-relay.mjs
//
// Collaborative character notes for the databook Identity tab.
//
//  - Private "My Notes": stored per-USER (game.user flags, keyed by actor id), so
//    every player keeps their own notes on any character regardless of whether
//    they own the actor.
//  - Public "Party Notes": stored on the ACTOR flag. Owners/GM write it directly;
//    a non-owner player's edit is relayed over a socket and applied by the active
//    GM's client (players can't write actor flags they don't own).

const MODULE_ID = "naruto-d20-kaihou";
const CHANNEL = `module.${MODULE_ID}`;
const PUBLIC_FLAG = "publicNote";

/** Per-user flag key holding this user's private note for a given actor. */
export function privateNoteKey(actorId) {
  return `notes.${actorId}`;
}

export function getPrivateNote(actor) {
  return game.user.getFlag(MODULE_ID, privateNoteKey(actor.id)) ?? "";
}

export function setPrivateNote(actor, text) {
  return game.user.setFlag(MODULE_ID, privateNoteKey(actor.id), text ?? "");
}

export function getPublicNote(actor) {
  return actor.flags?.[MODULE_ID]?.[PUBLIC_FLAG] ?? "";
}

/** Write the shared note: directly if we own the actor, else relay to the GM. */
export function setPublicNote(actor, text) {
  if (actor.isOwner) {
    return actor.setFlag(MODULE_ID, PUBLIC_FLAG, text ?? "");
  }
  if (!game.users.activeGM) {
    ui.notifications?.warn("Party note needs a GM online to be saved.");
    return undefined;
  }
  game.socket.emit(CHANNEL, { action: "setPublicNote", actorId: actor.id, text: text ?? "" });
  return undefined;
}

/** Register the GM-side socket handler. Only the active GM applies the update. */
export function registerNotesRelay() {
  game.socket.on(CHANNEL, async (msg) => {
    if (msg?.action !== "setPublicNote") return;
    if (game.user !== game.users.activeGM) return; // exactly one applier
    const actor = game.actors.get(msg.actorId);
    if (!actor) return;
    await actor.setFlag(MODULE_ID, PUBLIC_FLAG, msg.text ?? "");
  });
  console.log(`${MODULE_ID} | notes relay registered`);
}
