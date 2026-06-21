const NARUTO_D20 = "naruto-d20";

/** Thin reader for the naruto-d20 public API. Returns null if unavailable. */
export function getTechniqueApi() {
  return globalThis.game?.modules?.get(NARUTO_D20)?.api ?? null;
}

function optionFromItem(item, mode) {
  return {
    mode,
    itemUuid: item.uuid,
    name: item.name,
    rank: item.system?.rank ?? null,
    discipline: item.system?.discipline ?? "",
  };
}

/** Pure: owned, unlearned techniques as Learn options. */
export function buildLearnOptions(actor, api) {
  if (!api || typeof api.listLearnable !== "function") return [];
  return api.listLearnable(actor).map((item) => optionFromItem(item, "learn-owned"));
}

/** Pure: owned, learned-below-max techniques as Master options. */
export function buildMasterOptions(actor, api) {
  if (!api || typeof api.listMasterable !== "function") return [];
  return api.listMasterable(actor).map((item) => optionFromItem(item, "master-owned"));
}

/**
 * Run the one-per-block learn or mastery attempt via naruto-d20.
 * All mechanical resolution stays inside naruto-d20; we only coordinate.
 */
export async function runTechniqueAttempt({ submission, api, resolveItem }) {
  if (!api) return { ok: false, reason: "api-unavailable" };
  const { mode, itemUuid } = submission?.payload ?? {};
  const item = await resolveItem(itemUuid);
  if (!item) return { ok: false, reason: "item-missing" };
  const fn = mode === "master-owned" ? api.attemptMasterTechnique : api.attemptLearnTechnique;
  if (typeof fn !== "function") return { ok: false, reason: "api-unavailable" };
  const result = await fn(item);
  return { ok: true, mode, chatMessageId: result?.message?.id ?? result?.messageId ?? null };
}
