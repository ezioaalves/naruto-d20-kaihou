export const PRIMARY_ACTIONS = Object.freeze([
  "technique",
  "npc",
  "crafting",
  "mission",
  "shopping",
  "other",
]);

const BUILDERS = Object.freeze({
  technique: (f) => ({ mode: f.mode, itemUuid: f.itemUuid, ...(f.sourcePack ? { sourcePack: f.sourcePack } : {}) }),
  npc: (f) => ({ npcName: f.npcName ?? "" }),
  crafting: (f) => ({ skillKey: f.skillKey ?? "", skillLabel: f.skillLabel ?? "" }),
  mission: () => ({ wantsMission: true }),
  shopping: (f) => ({ storeName: f.storeName ?? "", otherText: f.otherText ?? "" }),
  other: (f) => ({ text: f.text ?? "" }),
});

export function buildActionPayload(action, form) {
  const build = BUILDERS[action];
  return build ? build(form ?? {}) : {};
}

export function decideRollPolicy(action, requestScene) {
  if (requestScene) return "defer";
  if (action === "technique") return "auto";
  if (action === "mission") return "defer";
  return "none";
}

export function validateActionPayload(submission) {
  const { action, payload = {} } = submission ?? {};
  if (!PRIMARY_ACTIONS.includes(action)) return { ok: false, reason: "unknown-action" };
  if (action === "technique" && !payload.itemUuid) return { ok: false, reason: "technique-no-item" };
  if (action === "other" && !payload.text) return { ok: false, reason: "other-no-text" };
  return { ok: true };
}
