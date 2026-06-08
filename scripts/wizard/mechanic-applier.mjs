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

// ─── Generic drag-drop (Q3, Q9, Q16) ──────────────────────────────────────────
export function applyDragDropFeat(itemData, markerKey) {
  const p = emptyPlan();
  p.creates.push(withWizardMarker(itemData ?? {}, markerKey));
  return p;
}

export function revertDragDropFeat(actor, markerKey) {
  const p = emptyPlan();
  const id = findItemIdByMarker(actor, markerKey);
  if (id) p.deletes.push(id);
  return p;
}

// ─── Q10 Coupled (flaw + bonus feat) ──────────────────────────────────────────
export function applyQ10Coupled(flawItemData, bonusFeatItemData) {
  const p = emptyPlan();
  if (flawItemData) p.creates.push(withWizardMarker(flawItemData, "q10Flaw"));
  if (bonusFeatItemData) p.creates.push(withWizardMarker(bonusFeatItemData, "q10BonusFeat"));
  return p;
}

export function revertQ10Coupled(actor) {
  const p = emptyPlan();
  const flawId = findItemIdByMarker(actor, "q10Flaw");
  const bonusId = findItemIdByMarker(actor, "q10BonusFeat");
  if (flawId) p.deletes.push(flawId);
  if (bonusId) p.deletes.push(bonusId);
  return p;
}

// ─── Q13 Mentor (technique + classSkill) ──────────────────────────────────────
export function applyQ13Mentor(_actor, techniqueItemData, classSkillKey) {
  const p = emptyPlan();
  p.creates.push(withWizardMarker(techniqueItemData ?? {}, "q13Mentor"));
  if (classSkillKey) {
    p.updates[`system.classSkills.${classSkillKey}`] = true;
    p.updates["flags.naruto-d20-kaihou.wizard.q13ClassSkill"] = classSkillKey;
  }
  return p;
}

export function revertQ13Mentor(actor) {
  const p = emptyPlan();
  const id = findItemIdByMarker(actor, "q13Mentor");
  if (id) p.deletes.push(id);
  const snapshot = actor.flags?.["naruto-d20-kaihou"]?.wizard?.q13ClassSkill;
  if (snapshot) {
    p.updates[`system.classSkills.${snapshot}`] = false;
    p.updates["flags.naruto-d20-kaihou.wizard.q13ClassSkill"] = null;
  }
  return p;
}

// ─── Q17 0-rank Skill Bump ────────────────────────────────────────────────────
export function applyQ17SkillBump(_actor, skillKey) {
  const p = emptyPlan();
  if (!skillKey) return p;
  p.updates[`system.skills.${skillKey}.rank`] = 2;
  p.updates["flags.naruto-d20-kaihou.wizard.q17PickedSkill"] = skillKey;
  return p;
}

export function revertQ17SkillBump(actor) {
  const p = emptyPlan();
  const snapshot = actor.flags?.["naruto-d20-kaihou"]?.wizard?.q17PickedSkill;
  if (!snapshot) return p;
  const currentRank = getDeepPath(actor.system?.skills, snapshot + ".rank") ?? 0;
  p.updates[`system.skills.${snapshot}.rank`] = Math.max(0, currentRank - 2);
  p.updates["flags.naruto-d20-kaihou.wizard.q17PickedSkill"] = null;
  return p;
}

/**
 * Enumerate skills on the actor with current rank === 0.
 * Returns array of { key, label, currentRank } — label is the bare key (UI
 * layer can resolve to display name via lang or skill-key-mapping).
 *
 * Walks top-level skills + subSkills (for crf, pro, etc.).
 */
export function listZeroRankSkills(actor) {
  const out = [];
  const skills = actor.system?.skills ?? {};
  for (const [key, value] of Object.entries(skills)) {
    if (value == null || typeof value !== "object") continue;
    if (value.subSkills && typeof value.subSkills === "object") {
      for (const [subKey, sub] of Object.entries(value.subSkills)) {
        if (sub?.rank === 0) {
          out.push({ key: `${key}.subSkills.${subKey}`, label: `${key} (${subKey})`, currentRank: 0 });
        }
      }
    } else if (value.rank === 0) {
      out.push({ key, label: key, currentRank: 0 });
    }
  }
  return out;
}

// ─── Q18 Heritage Modifier ────────────────────────────────────────────────────
export function applyQ18Heritage(actor, roll, deltas) {
  const p = emptyPlan();
  const deltaRep = deltas?.deltaRep ?? 0;
  const deltaAP = deltas?.deltaAP ?? 0;
  const currentRep = actor.flags?.["naruto-d20"]?.reputation ?? 0;
  const currentAP = actor.flags?.["naruto-d20"]?.actionPoints ?? 0;
  p.updates["flags.naruto-d20.reputation"] = currentRep + deltaRep;
  p.updates["flags.naruto-d20.actionPoints"] = currentAP + deltaAP;
  p.updates["flags.naruto-d20-kaihou.wizard.q18Heritage"] = { roll, deltaRep, deltaAP };
  return p;
}

export function revertQ18Heritage(actor) {
  const p = emptyPlan();
  const snapshot = actor.flags?.["naruto-d20-kaihou"]?.wizard?.q18Heritage;
  if (!snapshot) return p;
  const currentRep = actor.flags?.["naruto-d20"]?.reputation ?? 0;
  const currentAP = actor.flags?.["naruto-d20"]?.actionPoints ?? 0;
  p.updates["flags.naruto-d20.reputation"] = currentRep - (snapshot.deltaRep ?? 0);
  p.updates["flags.naruto-d20.actionPoints"] = currentAP - (snapshot.deltaAP ?? 0);
  p.updates["flags.naruto-d20-kaihou.wizard.q18Heritage"] = null;
  return p;
}
