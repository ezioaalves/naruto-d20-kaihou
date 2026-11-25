import { renderPortrait } from "./databook-html.mjs";
import { actorPortraitView } from "./portrait-frames.mjs";

function compactPortrait(actor) {
  return renderPortrait(actor.img, actorPortraitView(actor), { compact: true, editable: false });
}

export function renderActorDirectoryPortraits(directory, html) {
  const root = html?.[0] ?? html;
  for (const entry of root.querySelectorAll(".directory-item.entry[data-entry-id]")) {
    const actor = directory.collection.get(entry.dataset.entryId);
    if (!actor?.visible || entry.querySelector(":scope > .db-portrait")) continue;

    entry.querySelector(":scope > img.thumbnail")?.remove();
    entry.insertAdjacentHTML("afterbegin", compactPortrait(actor));
  }
}

export function renderChatSpeakerPortrait(message, html) {
  const root = html?.[0] ?? html;
  const ooc = CONST.CHAT_MESSAGE_STYLES?.OOC ?? CONST.CHAT_MESSAGE_TYPES.OOC;
  if ((message.style ?? message.type) === ooc || message.isContentVisible === false) return;

  const actor = message.constructor.getSpeakerActor(message.speaker);
  if (!actor?.visible) return;
  const sender = root.querySelector(".message-header > .message-sender");
  if (!sender || sender.parentElement.querySelector(":scope > .db-portrait")) return;

  sender.insertAdjacentHTML("beforebegin", compactPortrait(actor));
}
