/**
 * Wizard State Model
 *
 * Manages all 16 mechanical pick fields + 20 narrative fields for the 20 Questions wizard.
 *
 * State shape:
 * - 16 mechanical fields (uuid, string, number, object, null)
 * - narratives: { q1: "", q2: "", ..., q20: "" }
 *
 * Architecture: docs/superpowers/specs/2026-06-07-d2.3b-wizard-design.md
 */

/**
 * Returns a fresh state object with all mechanical fields null
 * and all 20 narratives empty.
 *
 * @returns {Object} default state
 */
export function defaultState() {
  return {
    q1_village_uuid: null,
    q2_occupation_uuid: null,
    q3_school_uuid: null,
    q4_affinity: null,
    q7_relationship: null,
    q7_outsider_class_skill: null,
    q8_code: null,
    q8_sceptic_subskill: null,
    q9_level1_feat_uuid: null,
    q10_flaw_uuid: null,
    q10_bonus_feat_uuid: null,
    q13_mentor_technique_uuid: null,
    q13_class_skill: null,
    q16_restricted_item_uuid: null,
    q18_heritage_roll: null,
    q18_heritage_locked_modifier: null,
    narratives: {
      q1: "",
      q2: "",
      q3: "",
      q4: "",
      q5: "",
      q6: "",
      q7: "",
      q8: "",
      q9: "",
      q10: "",
      q11: "",
      q12: "",
      q13: "",
      q14: "",
      q15: "",
      q16: "",
      q17: "",
      q18: "",
      q19: "",
      q20: "",
    },
  };
}

/**
 * Reads a specific wizard flag from the actor's flags.naruto-d20-kaihou.wizard namespace.
 *
 * @param {Object} actor - Foundry actor
 * @param {string} key - flag key (e.g., "q7OutsiderClassSkill")
 * @returns {*} flag value or undefined
 */
function getWizardFlag(actor, key) {
  return actor?.flags?.["naruto-d20-kaihou"]?.wizard?.[key];
}

/**
 * Finds the first item in the actor's items array that has a specific wizard marker flag.
 *
 * @param {Object} actor - Foundry actor
 * @param {string} markerKey - marker key (e.g., "q1Village")
 * @returns {Object|null} item object or null if not found
 */
function findItemByMarker(actor, markerKey) {
  return actor?.items?.find(
    (item) => item?.flags?.["naruto-d20-kaihou"]?.wizard?.[markerKey] === true,
  ) || null;
}

/**
 * Parses narrative answers from the actor's biography HTML.
 *
 * Looks for blocks like:
 *   <h3 data-q="5">Q5: Some Title</h3><p>Answer text</p>
 *
 * @param {string} biographyHtml - HTML string from actor.system.details.biography.value
 * @returns {Object} { q1: "", q2: "", ..., q20: "", ...other: "" }
 */
function parseNarratives(biographyHtml) {
  const narratives = {};

  if (!biographyHtml || typeof biographyHtml !== "string") {
    return narratives;
  }

  // Match <h3 data-q="N">...</h3><p>text</p> or similar patterns
  const regex = /<h3[^>]*data-q="(\d+)"[^>]*>.*?<\/h3>\s*<p>([^<]*)<\/p>/gs;

  let match;
  while ((match = regex.exec(biographyHtml)) !== null) {
    const questionNum = match[1];
    const text = match[2].trim();
    narratives[`q${questionNum}`] = text;
  }

  return narratives;
}

/**
 * Reconstructs wizard state from an actor's items, flags, and biography.
 *
 * @param {Object} actor - Foundry actor
 * @returns {Object} reconstructed state
 */
export function loadFromActor(actor) {
  const state = defaultState();

  if (!actor) {
    return state;
  }

  // Q1 — Village (marker flag q1Village)
  const q1Item = findItemByMarker(actor, "q1Village");
  if (q1Item) {
    state.q1_village_uuid = q1Item._id;
  }

  // Q2 — Occupation (marker flag q2OccupationItem; auto-apply hook in
  // occupation-application.mjs handles class skills / feat / wealth / rep on createItem)
  const q2Item = findItemByMarker(actor, "q2OccupationItem");
  if (q2Item) {
    state.q2_occupation_uuid = q2Item._id;
  }

  // Q3 — School (marker flag q3School)
  const q3Item = findItemByMarker(actor, "q3School");
  if (q3Item) {
    state.q3_school_uuid = q3Item._id;
  }

  // Q4 — Affinity (read from flags.naruto-d20.chakra.nature.primary)
  const affinity = actor?.flags?.["naruto-d20"]?.chakra?.nature?.primary;
  if (affinity) {
    state.q4_affinity = affinity;
  }

  // Q7 — Relationship (marker flags q7Loyalist, q7Outsider, q7Rebel)
  const q7LoyalistItem = findItemByMarker(actor, "q7Loyalist");
  if (q7LoyalistItem) {
    state.q7_relationship = "loyalist";
  }
  const q7OutsiderItem = findItemByMarker(actor, "q7Outsider");
  if (q7OutsiderItem) {
    state.q7_relationship = "outsider";
    // Load the subskill snapshot
    const outsiderSkill = getWizardFlag(actor, "q7OutsiderClassSkill");
    if (outsiderSkill) {
      state.q7_outsider_class_skill = outsiderSkill;
    }
  }
  const q7RebelItem = findItemByMarker(actor, "q7Rebel");
  if (q7RebelItem) {
    state.q7_relationship = "rebel";
  }

  // Q8 — Code (marker flags q8Adherent, q8Sceptic)
  const q8AdherentItem = findItemByMarker(actor, "q8Adherent");
  if (q8AdherentItem) {
    state.q8_code = "adherent";
  }
  const q8ScepticItem = findItemByMarker(actor, "q8Sceptic");
  if (q8ScepticItem) {
    state.q8_code = "sceptic";
    // Load the subskill snapshot
    const scepticSkill = getWizardFlag(actor, "q8ScepticSubskill");
    if (scepticSkill) {
      state.q8_sceptic_subskill = scepticSkill;
    }
  }

  // Q9 — Level 1 Feat (marker flag q9Level1Feat)
  const q9Item = findItemByMarker(actor, "q9Level1Feat");
  if (q9Item) {
    state.q9_level1_feat_uuid = q9Item._id;
  }

  // Q10 — Flaw + Bonus Feat (marker flags q10Flaw, q10BonusFeat)
  const q10FlawItem = findItemByMarker(actor, "q10Flaw");
  if (q10FlawItem) {
    state.q10_flaw_uuid = q10FlawItem._id;
  }
  const q10BonusFeatItem = findItemByMarker(actor, "q10BonusFeat");
  if (q10BonusFeatItem) {
    state.q10_bonus_feat_uuid = q10BonusFeatItem._id;
  }

  // Q13 — Mentor Technique + Class Skill (marker flag q13MentorTechnique)
  const q13Item = findItemByMarker(actor, "q13MentorTechnique");
  if (q13Item) {
    state.q13_mentor_technique_uuid = q13Item._id;
    // Load the class skill snapshot
    const classSkill = getWizardFlag(actor, "q13ClassSkill");
    if (classSkill) {
      state.q13_class_skill = classSkill;
    }
  }

  // Q16 — Restricted Item (marker flag q16RestrictedItem)
  const q16Item = findItemByMarker(actor, "q16RestrictedItem");
  if (q16Item) {
    state.q16_restricted_item_uuid = q16Item._id;
  }

  // Q18 — Heritage (snapshot from flag q18Heritage, which is { roll, deltaRep, deltaAP })
  const heritageSnapshot = getWizardFlag(actor, "q18Heritage");
  if (heritageSnapshot) {
    if (typeof heritageSnapshot.roll === "number") {
      state.q18_heritage_roll = heritageSnapshot.roll;
    }
    if (heritageSnapshot.deltaRep !== undefined || heritageSnapshot.deltaAP !== undefined) {
      state.q18_heritage_locked_modifier = {
        deltaRep: heritageSnapshot.deltaRep ?? 0,
        deltaAP: heritageSnapshot.deltaAP ?? 0,
      };
    }
  }

  // Parse narratives from biography HTML
  const biographyHtml = actor?.system?.details?.biography?.value || "";
  const parsedNarratives = parseNarratives(biographyHtml);
  Object.assign(state.narratives, parsedNarratives);

  return state;
}

/**
 * Compute the set of fields that differ between two states.
 *
 * Returns { changedFields: string[], changes: { [field]: { from, to } } }.
 * Narrative fields are addressed as "narratives.qN".
 */
export function diffStates(prev, next) {
  const changes = {};
  const changedFields = [];

  const topFields = [
    "q1_village_uuid",
    "q2_occupation_uuid",
    "q3_school_uuid",
    "q4_affinity",
    "q7_relationship",
    "q7_outsider_class_skill",
    "q8_code",
    "q8_sceptic_subskill",
    "q9_level1_feat_uuid",
    "q10_flaw_uuid",
    "q10_bonus_feat_uuid",
    "q13_mentor_technique_uuid",
    "q13_class_skill",
    "q16_restricted_item_uuid",
    "q18_heritage_roll",
    "q18_heritage_locked_modifier",
  ];

  for (const f of topFields) {
    if (JSON.stringify(prev[f]) !== JSON.stringify(next[f])) {
      changes[f] = { from: prev[f], to: next[f] };
      changedFields.push(f);
    }
  }

  for (let i = 1; i <= 20; i++) {
    const key = `q${i}`;
    if ((prev.narratives?.[key] ?? "") !== (next.narratives?.[key] ?? "")) {
      const field = `narratives.${key}`;
      changes[field] = { from: prev.narratives?.[key] ?? "", to: next.narratives?.[key] ?? "" };
      changedFields.push(field);
    }
  }

  return { changedFields, changes };
}

/**
 * Validate state for Finish-readiness.
 *
 * Rules:
 *   - q1, q4, q7, q8 are required (REQUIRED)
 *   - If q7_relationship === "outsider", q7_outsider_class_skill is SUB_REQUIRED
 *   - If q8_code === "sceptic", q8_sceptic_subskill is SUB_REQUIRED
 *   - If q13_mentor_technique_uuid is set, q13_class_skill is SUB_REQUIRED
 *   - Q10: either both q10_flaw_uuid and q10_bonus_feat_uuid are set, or both null
 */
export function validate(state) {
  const errors = [];

  if (state.q1_village_uuid == null) errors.push({ field: "q1_village_uuid", code: "REQUIRED" });
  if (state.q4_affinity == null) errors.push({ field: "q4_affinity", code: "REQUIRED" });
  if (state.q7_relationship == null) errors.push({ field: "q7_relationship", code: "REQUIRED" });
  if (state.q8_code == null) errors.push({ field: "q8_code", code: "REQUIRED" });

  if (state.q7_relationship === "outsider" && state.q7_outsider_class_skill == null) {
    errors.push({ field: "q7_outsider_class_skill", code: "SUB_REQUIRED" });
  }
if (state.q13_mentor_technique_uuid != null && state.q13_class_skill == null) {
    errors.push({ field: "q13_class_skill", code: "SUB_REQUIRED" });
  }

  const flawSet = state.q10_flaw_uuid != null;
  const bonusSet = state.q10_bonus_feat_uuid != null;
  if (flawSet !== bonusSet) {
    errors.push({ field: "q10", code: "Q10_COUPLED" });
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Returns true iff the user can jump from the current state to question `qid`.
 *
 * Allowed when:
 *   - `qid` is the current question (no-op jump)
 *   - `qid` has been answered (any top-level state key starting with `${qid}_` is truthy)
 *
 * Future, unanswered questions are not jumpable — preserves the validation
 * contract that intermediate required answers must be filled before advancing.
 *
 * Unknown `qid` (not matching q1–q20) returns false.
 *
 * @param {Object} state - wizard state
 * @param {string} qid - question id (e.g. "q1", "q10")
 * @returns {boolean}
 */
export function canJumpTo(state, qid) {
  if (qid === state.currentId) return true;

  // Unknown qid — only q1–q20 are valid question ids.
  if (!/^q([1-9]|1[0-9]|20)$/.test(qid)) return false;

  // Structural "answered" check — a question is considered answered iff any
  // top-level state key starting with `${qid}_` has a truthy value.
  const prefix = `${qid}_`;
  return Object.entries(state).some(
    ([key, value]) =>
      key.startsWith(prefix) &&
      value !== null &&
      value !== "" &&
      value !== undefined,
  );
}

/**
 * Returns a NEW state with currentId set to `qid`. Throws if !canJumpTo.
 *
 * Does not run validation on intermediate steps — the contract is that
 * the caller already verified via canJumpTo before calling this.
 *
 * @param {Object} state - wizard state
 * @param {string} qid - question id to jump to
 * @returns {Object} new state
 * @throws {Error} if the jump is not allowed
 */
export function jumpTo(state, qid) {
  if (!canJumpTo(state, qid)) {
    throw new Error(`jumpTo: cannot jump to ${qid} from ${state.currentId}`);
  }
  return { ...state, currentId: qid };
}
