/**
 * Finish-button orchestration extracted from V1's TwentyQuestionsWizard.
 *
 * Provides a single entry point `finishWizard(actor, state)` that:
 *   1. Validates the state
 *   2. Diffs against the original (actor-loaded) state
 *   3. Generates per-changed-field update plans
 *   4. Merges plans into a single batched plan
 *   5. Applies updates / creates / deletes to the actor
 *   6. Renders biography and splices into actor.system.details.biography.value
 *
 * Originally extracted from the V1 TwentyQuestionsWizard finish logic.
 */

import { questions as QUESTION_DEFINITIONS } from "./question-definitions.mjs";
import { validate, loadFromActor, diffStates } from "./wizard-state.mjs";
import { render as renderBiography, splice as spliceBiography } from "./biography-renderer.mjs";
import { getOutcomeByRoll, extractModifierDeltas, heritageFeatName } from "./heritage-table.mjs";
import {
  emptyPlan,
  applyQ1Village,
  revertQ1Village,
  applyQ4Affinity,
  applyQ7Loyalist,
  revertQ7Loyalist,
  applyQ7Outsider,
  revertQ7Outsider,
  applyQ8Adherent,
  revertQ8Adherent,
  applyQ8Sceptic,
  revertQ8Sceptic,
  applyDragDropFeat,
  revertDragDropFeat,
  applyQ10Coupled,
  revertQ10Coupled,
  applyQ13Mentor,
  revertQ13Mentor,
  applyQ17ParentalInfluence,
  applyQ18Heritage,
  revertQ18Heritage,
} from "./mechanic-applier.mjs";
import { findCompendiumItemByName } from "../../grants/item-grants.mjs";

export class FinishValidationError extends Error {
  constructor(errors) {
    super(`Cannot finish — ${errors.map((e) => e.field).join(", ")}`);
    this.errors = errors;
  }
}

/**
 * Run the full finish flow. Throws FinishValidationError on validation
 * failure. Throws a plain Error on actor.update / createEmbeddedDocuments
 * failures (callers should surface via ui.notifications).
 */
export async function finishWizard(actor, state) {
  const validResult = validate(state);
  if (!validResult.ok) {
    throw new FinishValidationError(validResult.errors);
  }

  const originalState = loadFromActor(actor);
  const diff = diffStates(originalState, state);

  const plans = [];
  for (const field of diff.changedFields) {
    const plan = await planForField(actor, field, originalState, state);
    if (plan) plans.push(plan);
  }

  const mergedPlan = mergePlans(plans);

  if (Object.keys(mergedPlan.updates).length > 0) {
    await actor.update(mergedPlan.updates);
  }
  if (mergedPlan.creates.length > 0) {
    await actor.createEmbeddedDocuments("Item", mergedPlan.creates);
  }
  if (mergedPlan.deletes.length > 0) {
    await actor.deleteEmbeddedDocuments("Item", mergedPlan.deletes);
  }

  // Unconditional Q17 grant: Parental Influence feat (once per actor)
  const q17Plan = await buildQ17Grant(actor);
  if (q17Plan.creates.length > 0) {
    await actor.createEmbeddedDocuments("Item", q17Plan.creates);
  }

  const bioHtml = renderBiography(state, {
    questionDefs: QUESTION_DEFINITIONS,
    getOutcomeByRoll,
  });
  const newBio = spliceBiography(actor.system.details.biography.value, bioHtml);
  await actor.update({ "system.details.biography.value": newBio });
}

function mergeTwo(a, b) {
  if (!a) return b;
  if (!b) return a;
  return {
    updates: { ...a.updates, ...b.updates },
    creates: [...a.creates, ...b.creates],
    deletes: [...a.deletes, ...b.deletes],
  };
}

const DRAGDROP_MARKERS = {
  q2_occupation_uuid: "q2OccupationItem",
  q3_school_uuid: "q3School",
  q9_level1_feat_uuid: "q9Level1Feat",
  q16_restricted_item_uuid: "q16RestrictedItem",
};

async function planForField(actor, field, originalState, newState) {
  if (field.startsWith("narratives.")) return null;

  const newValue = newState[field];
  const oldValue = originalState[field];
  const wasSet = newValue != null;
  const isObject = typeof newValue === "object" && newValue !== null;

  if (field === "q1_village_uuid") {
    const revert = oldValue != null ? revertQ1Village(actor) : null;
    if (!(wasSet && typeof newValue === "string")) return revert;
    const data = await fetchItemData(actor, { id: newValue, pack: "naruto-d20-kaihou.villages" });
    return mergeTwo(revert, data ? applyQ1Village(actor, data) : null);
  }

  if (field in DRAGDROP_MARKERS) {
    const marker = DRAGDROP_MARKERS[field];
    const revert = oldValue != null ? revertDragDropFeat(actor, marker) : null;
    if (!(wasSet && isObject)) return revert;
    const data = await fetchItemData(actor, newValue);
    return mergeTwo(revert, data ? applyDragDropFeat(data, marker) : null);
  }

  if (field === "q4_affinity") {
    return wasSet ? applyQ4Affinity(actor, newValue) : null;
  }

  if (field === "q7_relationship" || field === "q7_outsider_class_skill") {
    const relChanged = newState.q7_relationship !== originalState.q7_relationship;
    const skillChanged =
      newState.q7_outsider_class_skill !== originalState.q7_outsider_class_skill;
    if (!relChanged && !skillChanged) return null;
    // When BOTH changed, the q7_relationship invocation owns the work.
    // Skip the sub-field invocation to avoid duplicate plans.
    if (field === "q7_outsider_class_skill" && relChanged) return null;
    // When only the sub-field changed, the q7_relationship field is not in changedFields
    // at all, so this guard only fires for the q7_relationship invocation when skill didn't change.
    if (field === "q7_relationship" && !relChanged) return null;

    let revert = null;
    if (originalState.q7_relationship === "loyalist") revert = revertQ7Loyalist(actor);
    if (originalState.q7_relationship === "outsider") revert = revertQ7Outsider(actor);

    const newRel = newState.q7_relationship;
    if (newRel === "loyalist") {
      const feat = await fetchQuestionFeat("Village Loyalist");
      return mergeTwo(revert, feat ? applyQ7Loyalist(feat) : null);
    }
    if (newRel === "outsider") {
      const feat = await fetchQuestionFeat("Village Outsider");
      return mergeTwo(revert, feat ? applyQ7Outsider(feat, newState.q7_outsider_class_skill) : null);
    }
    return revert;
  }

  if (field === "q8_code") {
    if (newValue === oldValue) return null;
    let revert = null;
    if (oldValue === "adherent") revert = revertQ8Adherent(actor);
    if (oldValue === "sceptic") revert = revertQ8Sceptic(actor);
    if (newValue === "adherent") {
      const feat = await fetchQuestionFeat("Code Adherent");
      return mergeTwo(revert, feat ? applyQ8Adherent(feat) : null);
    }
    if (newValue === "sceptic") {
      const feat = await fetchQuestionFeat("Code Sceptic");
      return mergeTwo(revert, feat ? applyQ8Sceptic(feat) : null);
    }
    return revert;
  }

  // Q10 coupled — anchor on flaw, skip bonus feat (handled in the same plan).
  if (field === "q10_bonus_feat_uuid") return null;
  if (field === "q10_flaw_uuid") {
    const hadOld =
      originalState.q10_flaw_uuid != null || originalState.q10_bonus_feat_uuid != null;
    const revert = hadOld ? revertQ10Coupled(actor) : null;
    const flawRef = newState.q10_flaw_uuid;
    const bonusRef = newState.q10_bonus_feat_uuid;
    const flawData = flawRef && typeof flawRef === "object"
      ? await fetchItemData(actor, flawRef) : null;
    const bonusData = bonusRef && typeof bonusRef === "object"
      ? await fetchItemData(actor, bonusRef) : null;
    if (!flawData && !bonusData) return revert;
    return mergeTwo(revert, applyQ10Coupled(flawData, bonusData));
  }

  if (field === "q13_mentor_technique_uuid" || field === "q13_class_skill") {
    const techChanged =
      JSON.stringify(newState.q13_mentor_technique_uuid) !==
      JSON.stringify(originalState.q13_mentor_technique_uuid);
    const skillChanged = newState.q13_class_skill !== originalState.q13_class_skill;
    if (!techChanged && !skillChanged) return null;
    // When BOTH changed, the q13_mentor_technique_uuid invocation owns the work.
    if (field === "q13_class_skill" && techChanged) return null;

    const hadOld = originalState.q13_mentor_technique_uuid != null;
    const revert = hadOld ? revertQ13Mentor(actor) : null;

    // Resolve the technique ref — new state may have an object ref (if the
    // technique itself changed) or a bare string id (if only the class skill
    // changed and loadFromActor stored the existing item's _id as a string).
    const ref = newState.q13_mentor_technique_uuid;
    let techniqueData = null;
    if (ref && typeof ref === "object") {
      techniqueData = await fetchItemData(actor, ref);
    } else if (ref && typeof ref === "string" && !techChanged) {
      // Only class skill changed; the technique item already lives on the actor
      // with the q13Mentor marker. Fetch it directly from the actor's items.
      const existingItem = (actor.items ?? []).find(
        (i) => i.flags?.["naruto-d20-kaihou"]?.wizard?.q13Mentor === true
      );
      if (existingItem) {
        techniqueData = existingItem.toObject?.() ?? { ...existingItem };
      }
    }

    if (!techniqueData) return revert;
    const mentorFeat = await fetchQuestionFeat("Mentor's Lesson");
    return mergeTwo(revert, applyQ13Mentor(techniqueData, mentorFeat, newState.q13_class_skill));
  }

  if (field === "q18_heritage_roll") {
    const revert = originalState.q18_heritage_roll != null ? revertQ18Heritage(actor) : null;
    if (!wasSet) return revert;
    const outcome = getOutcomeByRoll(newValue);
    if (!outcome) return revert;
    const feat = await fetchQuestionFeat(heritageFeatName(newValue));
    if (!feat) return revert;
    const deltas = extractModifierDeltas(outcome.modifier);
    return mergeTwo(revert, applyQ18Heritage(feat, newValue, deltas));
  }

  return null;
}

function mergePlans(plans) {
  const merged = { updates: {}, creates: [], deletes: [] };
  for (const plan of plans) {
    Object.assign(merged.updates, plan.updates);
    merged.creates.push(...plan.creates);
    merged.deletes.push(...plan.deletes);
  }
  return merged;
}

const QUESTIONS_PACK_IDS = ["naruto-d20-kaihou.questions"];

async function fetchQuestionFeat(name) {
  const doc = await findCompendiumItemByName(name, QUESTIONS_PACK_IDS, "feat");
  if (!doc) {
    console.warn(`naruto-d20-kaihou | question feat missing from compendia: ${name}`);
    globalThis.ui?.notifications?.warn(`20 Questions: missing compendium feat "${name}"`);
    return null;
  }
  return doc.toObject();
}

async function fetchItemData(actor, ref) {
  if (!ref) return null;
  let doc = null;
  if (ref.uuid) {
    doc = await fromUuid(ref.uuid);
  } else if (ref.id && ref.pack) {
    doc = await fromUuid(`Compendium.${ref.pack}.Item.${ref.id}`);
  } else if (ref._id) {
    doc = actor.items.get(ref._id);
  }
  return doc?.toObject?.() ?? null;
}

async function buildQ17Grant(actor) {
  const alreadyGranted = Array.from(actor.items ?? []).some(
    (i) => i.flags?.["naruto-d20-kaihou"]?.wizard?.q17ParentalInfluence === true
  );
  if (alreadyGranted) return emptyPlan();

  const doc = await findCompendiumItemByName(
    "Parental Influence",
    ["naruto-d20-kaihou.questions"],
    "feat"
  );
  if (!doc) return emptyPlan();

  return applyQ17ParentalInfluence(doc.toObject());
}
