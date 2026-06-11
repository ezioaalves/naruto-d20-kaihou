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

// ─── Q7 / Q8 stance feats ─────────────────────────────────────────────────────
// The wizard grants the generated pack feats (questions pack); their
// reputation / action-point / bonus-skill-rank payloads ride as dictionary
// flags and are applied by scripts/grants/question-effects.mjs on createItem
// (and reverted on deleteItem). Appliers do no counter math.
export function applyQ7Loyalist(featItemData) {
  const p = emptyPlan();
  p.creates.push(withWizardMarker(featItemData ?? {}, "q7Loyalist"));
  return p;
}

export function revertQ7Loyalist(actor) {
  const p = emptyPlan();
  const id = findItemIdByMarker(actor, "q7Loyalist");
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

// Q2 Occupation is handled via the drag-drop pattern (applyDragDropFeat
// with marker "q2OccupationItem"). All occupation grants (class skills,
// feat, wealth, reputation) are applied by scripts/occupation-application.mjs
// on the createItem hook, so the wizard only needs to add/remove the item.

// classSkills are set on the granted item itself; PF1e aggregates class
// skills from feat/class/race items, NOT from actor.system.classSkills.
export function applyQ7Outsider(featItemData, classSkillKey) {
  const p = emptyPlan();
  const feat = { ...(featItemData ?? {}) };
  if (classSkillKey) {
    feat.system = { ...(feat.system ?? {}), classSkills: { [classSkillKey]: true } };
  }
  p.creates.push(withWizardMarker(feat, "q7Outsider"));
  if (classSkillKey) {
    p.updates["flags.naruto-d20-kaihou.wizard.q7OutsiderClassSkill"] = classSkillKey;
  }
  return p;
}

export function revertQ7Outsider(actor) {
  const p = emptyPlan();
  const id = findItemIdByMarker(actor, "q7Outsider");
  if (id) p.deletes.push(id);
  // Class skill auto-reverts when the marker item is removed (PF1e re-aggregates)
  p.updates["flags.naruto-d20-kaihou.wizard.q7OutsiderClassSkill"] = null;
  return p;
}

export function applyQ8Adherent(featItemData) {
  const p = emptyPlan();
  p.creates.push(withWizardMarker(featItemData ?? {}, "q8Adherent"));
  return p;
}

export function revertQ8Adherent(actor) {
  const p = emptyPlan();
  const id = findItemIdByMarker(actor, "q8Adherent");
  if (id) p.deletes.push(id);
  return p;
}

export function applyQ8Sceptic(featItemData) {
  const p = emptyPlan();
  p.creates.push(withWizardMarker(featItemData ?? {}, "q8Sceptic"));
  return p;
}

export function revertQ8Sceptic(actor) {
  const p = emptyPlan();
  const id = findItemIdByMarker(actor, "q8Sceptic");
  if (id) p.deletes.push(id);
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
// Technique items are type "naruto-d20.technique" — PF1e aggregates classSkills
// only from class/feat/race items, so the class skill grant rides on a separate
// "Mentor's Lesson" marker feat created alongside the technique. Per the
// naruto-d20 module, a technique is "learned" iff system.learning.learned is
// true; the wizard sets it directly so the player skips the empathy / training
// flow for a mentor-taught Rank-2 technique.
export function applyQ13Mentor(_actor, techniqueItemData, classSkillKey) {
  const p = emptyPlan();
  const technique = { ...(techniqueItemData ?? {}) };
  technique.system = {
    ...(technique.system ?? {}),
    learning: {
      ...(technique.system?.learning ?? {}),
      learned: true,
    },
  };
  p.creates.push(withWizardMarker(technique, "q13Mentor"));
  if (classSkillKey) {
    const skillMarker = {
      name: "Mentor's Lesson",
      type: "feat",
      img: "icons/svg/book.svg",
      system: {
        subType: "trait",
        description: {
          value: `<p>Wizard-applied (20 Questions Q13): mentor taught <strong>${classSkillKey}</strong> as a class skill.</p>`,
        },
        classSkills: { [classSkillKey]: true },
      },
    };
    p.creates.push(withWizardMarker(skillMarker, "q13MentorSkill"));
    p.updates["flags.naruto-d20-kaihou.wizard.q13ClassSkill"] = classSkillKey;
  }
  return p;
}

export function revertQ13Mentor(actor) {
  const p = emptyPlan();
  const techId = findItemIdByMarker(actor, "q13Mentor");
  const skillId = findItemIdByMarker(actor, "q13MentorSkill");
  if (techId) p.deletes.push(techId);
  if (skillId) p.deletes.push(skillId);
  // Class skill auto-reverts when the marker item is removed
  p.updates["flags.naruto-d20-kaihou.wizard.q13ClassSkill"] = null;
  return p;
}

// ─── Q17 Parental Influence ───────────────────────────────────────────────────
export function applyQ17ParentalInfluence(featItemData) {
  const p = emptyPlan();
  p.creates.push(withWizardMarker(featItemData ?? {}, "q17ParentalInfluence"));
  return p;
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
