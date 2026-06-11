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
  applyQ4Affinity,
  applyQ7Loyalist,
  applyQ7Outsider,
  applyQ8Adherent,
  applyQ8Sceptic,
  applyDragDropFeat,
  applyQ10Coupled,
  applyQ13Mentor,
  applyQ17ParentalInfluence,
  applyQ18Heritage,
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

async function planForField(actor, field, originalState, newState) {
  if (field.startsWith("narratives.")) return null;

  const newValue = newState[field];
  const wasSet = newValue != null;
  const isObject = typeof newValue === "object" && newValue !== null;

  if (field === "q1_village_uuid" && wasSet && typeof newValue === "string") {
    const data = await fetchItemData(actor, { id: newValue, pack: "naruto-d20-kaihou.villages" });
    return data ? applyQ1Village(actor, data) : null;
  }

  if (field === "q2_occupation_uuid" && wasSet && isObject) {
    const data = await fetchItemData(actor, newValue);
    return data ? applyDragDropFeat(data, "q2OccupationItem") : null;
  }

  if (field === "q3_school_uuid" && wasSet && isObject) {
    const data = await fetchItemData(actor, newValue);
    return data ? applyDragDropFeat(data, "q3School") : null;
  }

  if (field === "q4_affinity" && wasSet) {
    return applyQ4Affinity(actor, newValue);
  }

  if (field === "q7_relationship") {
    const oldRel = originalState.q7_relationship;
    const newRel = newValue;
    if (newRel === "loyalist" && oldRel !== "loyalist") {
      const feat = await fetchQuestionFeat("Village Loyalist");
      return feat ? applyQ7Loyalist(feat) : null;
    }
    if (newRel === "outsider" && oldRel !== "outsider") {
      const feat = await fetchQuestionFeat("Village Outsider");
      return feat ? applyQ7Outsider(feat, newState.q7_outsider_class_skill) : null;
    }
    return null;
  }

  if (field === "q8_code") {
    const oldCode = originalState.q8_code;
    const newCode = newValue;
    if (newCode === "adherent" && oldCode !== "adherent") {
      const feat = await fetchQuestionFeat("Code Adherent");
      return feat ? applyQ8Adherent(feat) : null;
    }
    if (newCode === "sceptic" && oldCode !== "sceptic") {
      const feat = await fetchQuestionFeat("Code Sceptic");
      return feat ? applyQ8Sceptic(feat) : null;
    }
    return null;
  }

  if (field === "q9_level1_feat_uuid" && wasSet && isObject) {
    const data = await fetchItemData(actor, newValue);
    return data ? applyDragDropFeat(data, "q9Level1Feat") : null;
  }

  // Q10 coupled — anchor on flaw, skip bonus feat (handled in the same plan).
  if (field === "q10_bonus_feat_uuid") return null;
  if (field === "q10_flaw_uuid") {
    const flawRef = newState.q10_flaw_uuid;
    const bonusRef = newState.q10_bonus_feat_uuid;
    const flawData = flawRef && typeof flawRef === "object"
      ? await fetchItemData(actor, flawRef) : null;
    const bonusData = bonusRef && typeof bonusRef === "object"
      ? await fetchItemData(actor, bonusRef) : null;
    return applyQ10Coupled(flawData, bonusData);
  }

  if (field === "q13_mentor_technique_uuid" && wasSet && isObject) {
    const data = await fetchItemData(actor, newValue);
    if (!data) return null;
    const mentorFeat = await fetchQuestionFeat("Mentor's Lesson");
    return applyQ13Mentor(data, mentorFeat, newState.q13_class_skill);
  }

  if (field === "q16_restricted_item_uuid" && wasSet && isObject) {
    const data = await fetchItemData(actor, newValue);
    return data ? applyDragDropFeat(data, "q16RestrictedItem") : null;
  }

  if (field === "q18_heritage_roll" && wasSet) {
    const outcome = getOutcomeByRoll(newValue);
    if (!outcome) return null;
    const feat = await fetchQuestionFeat(heritageFeatName(newValue));
    if (!feat) return null;
    const deltas = extractModifierDeltas(outcome.modifier);
    return applyQ18Heritage(feat, newValue, deltas);
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
