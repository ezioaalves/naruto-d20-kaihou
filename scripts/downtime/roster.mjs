export function seedRoster(users) {
  const out = [];
  for (const user of users) {
    if (user.isGM) continue;
    const uuid = user.character?.uuid;
    if (uuid && !out.includes(uuid)) out.push(uuid);
  }
  return out;
}

export function addToRoster(roster, uuid) {
  return roster.includes(uuid) ? roster.slice() : [...roster, uuid];
}

export function removeFromRoster(roster, uuid) {
  return roster.filter((u) => u !== uuid);
}

export function resolveRecipients(roster, resolveActor) {
  const recipients = [];
  for (const uuid of roster) {
    const actor = resolveActor(uuid);
    if (!actor) continue;
    recipients.push({
      userId: actor.ownerUserId ?? null,
      actorUuid: actor.uuid,
      actorName: actor.name,
      status: "pending",
    });
  }
  return recipients;
}
