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

function getDeepPath(obj, path) {
  return path.split(".").reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);
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

// ─── Q1 Village ───────────────────────────────────────────────────────────────
export function applyQ1Village(_actor, villageItemData) {
  const p = emptyPlan();
  p.creates.push(withWizardMarker(villageItemData ?? {}, "q1Village"));
  return p;
}

export function revertQ1Village(actor) {
  const p = emptyPlan();
  const id = findItemIdByMarker(actor, "q1Village");
  if (id) p.deletes.push(id);
  return p;
}

// ─── Q7 Outsider ──────────────────────────────────────────────────────────────
export function applyQ7Outsider(_actor, markerItemData, classSkillKey) {
  const p = emptyPlan();
  p.creates.push(withWizardMarker(markerItemData ?? {}, "q7Outsider"));
  if (classSkillKey) {
    p.updates[`system.classSkills.${classSkillKey}`] = true;
    p.updates["flags.naruto-d20-kaihou.wizard.q7OutsiderClassSkill"] = classSkillKey;
  }
  return p;
}

export function revertQ7Outsider(actor) {
  const p = emptyPlan();
  const id = findItemIdByMarker(actor, "q7Outsider");
  if (id) p.deletes.push(id);
  const snapshot = actor.flags?.["naruto-d20-kaihou"]?.wizard?.q7OutsiderClassSkill;
  if (snapshot) {
    p.updates[`system.classSkills.${snapshot}`] = false;
    p.updates["flags.naruto-d20-kaihou.wizard.q7OutsiderClassSkill"] = null;
  }
  return p;
}

// ─── Q8 Sceptic ───────────────────────────────────────────────────────────────
export function applyQ8Sceptic(actor, markerItemData, subskillPath) {
  const p = emptyPlan();
  p.creates.push(withWizardMarker(markerItemData ?? {}, "q8Sceptic"));
  if (subskillPath) {
    const currentRank = getDeepPath(actor.system?.skills, subskillPath + ".rank") ?? 0;
    p.updates[`system.skills.${subskillPath}.rank`] = currentRank + 1;
    p.updates["flags.naruto-d20-kaihou.wizard.q8ScepticSubskill"] = subskillPath;
  }
  return p;
}

export function revertQ8Sceptic(actor) {
  const p = emptyPlan();
  const id = findItemIdByMarker(actor, "q8Sceptic");
  if (id) p.deletes.push(id);
  const subskillPath = actor.flags?.["naruto-d20-kaihou"]?.wizard?.q8ScepticSubskill;
  if (subskillPath) {
    const currentRank = getDeepPath(actor.system?.skills, subskillPath + ".rank") ?? 0;
    p.updates[`system.skills.${subskillPath}.rank`] = Math.max(0, currentRank - 1);
    p.updates["flags.naruto-d20-kaihou.wizard.q8ScepticSubskill"] = null;
  }
  return p;
}
