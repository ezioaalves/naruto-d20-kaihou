import { renderIdentityDetails, renderPortrait } from "./databook-html.mjs";
import { actorPortraitView, findActorVillage } from "./portrait-frames.mjs";

function compactPortrait(actor, villageItem) {
  return renderPortrait(actor.img, actorPortraitView(actor, villageItem), { compact: true, editable: false });
}

export function renderActorDirectoryPortraits(directory, html) {
  const root = html?.[0] ?? html;
  for (const entry of root.querySelectorAll(".directory-item.entry[data-entry-id]")) {
    const actor = directory.collection.get(entry.dataset.entryId);
    if (!actor?.visible || entry.querySelector(":scope > .db-directory-portrait")) continue;

    // Keep Foundry's original thumbnail as the source for its drag preview.
    entry.querySelector(":scope > .entry-name")?.insertAdjacentHTML(
      "beforebegin", `<div class="db-directory-portrait">${compactPortrait(actor)}</div>`,
    );
  }
}

export function refreshActorDirectoryPortrait(actor, changes) {
  if (actor.isToken || actor.pack || !actor.visible || !("flags" in changes || "img" in changes)) return;

  const selector = `.directory-item.entry.actor[data-entry-id="${CSS.escape(actor.id)}"] > .db-directory-portrait`;
  const slots = document.querySelectorAll(selector);
  if (!slots.length) return;

  // Foundry refreshes open sheets on flag changes without redrawing the actor directory.
  const portrait = compactPortrait(actor);
  for (const slot of slots) {
    slot.innerHTML = portrait;
    if ("img" in changes) {
      slot.parentElement.querySelector(":scope > img.thumbnail")?.setAttribute("src", actor.img);
    }
  }
}

export function renderChatSpeakerPortrait(message, html) {
  const root = html?.[0] ?? html;
  const ooc = CONST.CHAT_MESSAGE_STYLES?.OOC ?? CONST.CHAT_MESSAGE_TYPES.OOC;
  if ((message.style ?? message.type) === ooc || message.isContentVisible === false) return;

  const actor = message.constructor.getSpeakerActor(message.speaker);
  if (!actor?.visible) return;
  const sender = root.querySelector(".message-header > .message-sender");
  if (!sender) return;

  const villageItem = findActorVillage(actor);
  const header = sender.parentElement;
  const identity = header.ownerDocument.createElement("div");
  identity.className = "db-chat-identity";
  sender.before(identity);
  identity.append(sender);
  identity.insertAdjacentHTML("beforeend", renderIdentityDetails({
    alias: actor.flags?.["naruto-d20-kaihou"]?.alias,
    village: villageItem?.name,
  }));
  identity.insertAdjacentHTML("beforebegin", compactPortrait(actor, villageItem ?? null));
}
