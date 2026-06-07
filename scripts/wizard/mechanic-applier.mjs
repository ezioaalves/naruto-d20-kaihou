/**
 * Mechanic appliers for each wizard pick-type.
 *
 * Each apply/revert function returns an "update plan":
 *   { updates: {}, creates: [], deletes: [] }
 *
 * The wizard collects plans for all changed picks, merges them into a single
 * batched dispatch:
 *   - actor.update(mergedPlan.updates)
 *   - actor.createEmbeddedDocuments("Item", mergedPlan.creates)
 *   - actor.deleteEmbeddedDocuments("Item", mergedPlan.deletes)
 *
 * Marker flag namespace: flags.naruto-d20-kaihou.wizard.<key>
 */

const WIZARD_FLAG_NS = "naruto-d20-kaihou";

export function emptyPlan() {
  return { updates: {}, creates: [], deletes: [] };
}

function findItemIdByMarker(actor, markerKey) {
  const item = (actor.items ?? []).find(
    (i) => i.flags?.[WIZARD_FLAG_NS]?.wizard?.[markerKey] === true
  );
  return item?._id ?? null;
}

function withWizardMarker(itemData, markerKey) {
  const out = { ...itemData };
  out.flags = { ...(itemData.flags ?? {}) };
  out.flags[WIZARD_FLAG_NS] = {
    ...(out.flags[WIZARD_FLAG_NS] ?? {}),
    wizard: { ...(out.flags[WIZARD_FLAG_NS]?.wizard ?? {}), [markerKey]: true },
  };
  return out;
}

// ─── Q4 Affinity ──────────────────────────────────────────────────────────────
export function applyQ4Affinity(_actor, value) {
  const p = emptyPlan();
  p.updates["flags.naruto-d20.chakra.nature.primary"] = value;
  return p;
}

export function revertQ4Affinity(_actor) {
  const p = emptyPlan();
  p.updates["flags.naruto-d20.chakra.nature.primary"] = "";
  return p;
}

// ─── Q7 Loyalist ──────────────────────────────────────────────────────────────
export function applyQ7Loyalist(actor, markerItemData) {
  const p = emptyPlan();
  const current = actor.flags?.["naruto-d20"]?.reputation ?? 0;
  p.updates["flags.naruto-d20.reputation"] = current + 1;
  p.creates.push(withWizardMarker(markerItemData ?? {}, "q7Loyalist"));
  return p;
}

export function revertQ7Loyalist(actor) {
  const p = emptyPlan();
  const current = actor.flags?.["naruto-d20"]?.reputation ?? 0;
  p.updates["flags.naruto-d20.reputation"] = current - 1;
  const id = findItemIdByMarker(actor, "q7Loyalist");
  if (id) p.deletes.push(id);
  return p;
}

// ─── Q8 Adherent ──────────────────────────────────────────────────────────────
export function applyQ8Adherent(actor, markerItemData) {
  const p = emptyPlan();
  const current = actor.flags?.["naruto-d20"]?.actionPoints ?? 0;
  p.updates["flags.naruto-d20.actionPoints"] = current + 2;
  p.creates.push(withWizardMarker(markerItemData ?? {}, "q8Adherent"));
  return p;
}

export function revertQ8Adherent(actor) {
  const p = emptyPlan();
  const current = actor.flags?.["naruto-d20"]?.actionPoints ?? 0;
  p.updates["flags.naruto-d20.actionPoints"] = current - 2;
  const id = findItemIdByMarker(actor, "q8Adherent");
  if (id) p.deletes.push(id);
  return p;
}
