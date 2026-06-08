/**
 * TwentyQuestionsWizard — Application V1 Subclass
 *
 * Manages the 20 Questions wizard window lifecycle, state tracking, and navigation.
 * Extends Foundry's Application class to provide:
 * - State loading from actor (via loadFromActor)
 * - Question navigation (forward, backward)
 * - Rendering lifecycle (getData for template binding)
 * - Status tracking (answered, empty-required, etc.)
 *
 * Architecture: docs/superpowers/specs/2026-06-07-d2.3b-wizard-design.md
 */

/* eslint-disable no-unused-vars */
import { loadFromActor, validate, diffStates } from "./wizard-state.mjs";
import { QUESTION_DEFINITIONS } from "./question-definitions.mjs";
import { render as renderBiography, splice as spliceBiography } from "./biography-renderer.mjs";
import {
  emptyPlan,
  applyQ1Village,
  revertQ1Village,
  applyQ3HumanBonusFeat,
  revertQ3HumanBonusFeat,
  applyQ4Affinity,
  revertQ4Affinity,
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
  applyQ17SkillBump,
  revertQ17SkillBump,
  applyQ18Heritage,
  revertQ18Heritage,
} from "./mechanic-applier.mjs";
import { getOutcomeByRoll, extractModifierDeltas } from "./heritage-table.mjs";
/* eslint-enable no-unused-vars */

const MODULE_ID = "naruto-d20-kaihou";
const TEMPLATE = `modules/${MODULE_ID}/templates/apps/twenty-questions-wizard.hbs`;

export default class TwentyQuestionsWizard extends Application {
  /**
   * Create a new wizard instance for an actor.
   *
   * @param {Object} actor - Foundry actor to edit
   * @param {Object} options - Application options override
   */
  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
    this.state = loadFromActor(actor);
    this.currentIndex = 0;
    this.validationError = null;
  }

  /**
   * Return merged default options for the wizard window.
   *
   * @returns {Object} Foundry Application options
   */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "twenty-questions-wizard",
      classes: ["naruto-d20-kaihou", "twenty-questions-wizard-app"],
      template: TEMPLATE,
      width: 880,
      height: 640,
      resizable: true,
      title: game.i18n.localize("NARUTO_D20_KAIHOU.WIZARD.TITLE"),
    });
  }

  /**
   * Get the current question definition (by currentIndex).
   *
   * @returns {Object} Question definition from QUESTION_DEFINITIONS
   */
  get currentDef() {
    return QUESTION_DEFINITIONS[this.currentIndex];
  }

  /**
   * Get the current question's ID (e.g., "q1", "q5", etc.).
   *
   * @returns {string} Question ID
   */
  get currentId() {
    return this.currentDef.id;
  }

  /**
   * Get the narrative text for the current question.
   *
   * @returns {string} Narrative text or empty string
   */
  get narrativeText() {
    return this.state.narratives[this.currentId] ?? "";
  }

  /**
   * Prepare template context for rendering.
   *
   * Returns data structure expected by the template:
   * - questions: array with num, statusClass for each Q
   * - current: current question definition
   * - currentId: current question ID
   * - currentStep: 1-indexed current step
   * - narrativeText: narrative for current Q
   * - canBack: boolean (currentIndex > 0)
   * - isLastStep: boolean (currentIndex === 19)
   * - validationError: current validation error (if any)
   *
   * @returns {Object} Template context
   */
  getData() {
    const questions = QUESTION_DEFINITIONS.map((d, i) => ({
      ...d,
      num: i + 1,
      statusClass: this._statusClass(d),
    }));

    return {
      questions,
      current: this.currentDef,
      currentId: this.currentId,
      currentStep: this.currentIndex + 1,
      narrativeText: this.narrativeText,
      canBack: this.currentIndex > 0,
      isLastStep: this.currentIndex === 19,
      validationError: this.validationError,
    };
  }

  /**
   * Activate event listeners for the wizard window.
   *
   * Wires up sidebar navigation, radio/select changes, sub-picker reveals,
   * narrative changes, and navigation buttons.
   *
   * @param {jQuery} html - Rendered HTML to bind
   */
  activateListeners(html) {
    super.activateListeners(html);

    // Sidebar navigation
    html.find(".tqw-sidebar-item").on("click", (e) => this._onSidebarClick(e, html));

    // Radio changes (Q4, Q7, Q8)
    html.find("input[type='radio']").on("change", (e) => this._onPickChange(e, html));

    // Select changes (Q1, Q17)
    html.find("select[name^='pick-']").on("change", (e) => this._onPickChange(e, html));

    // Sub-picker select changes (nested types)
    html.find("select[name^='sub-pick-']").on("change", (e) => this._onSubPickChange(e, html));

    // Narrative textarea changes
    html.find("textarea[name='narrative']").on("change", (e) => this._onNarrativeChange(e));

    // Drag-drop zones (Task 19)
    html.find(".tqw-drop-zone").on("dragover", (e) => this._onDragOver(e));
    html.find(".tqw-drop-zone").on("dragleave", (e) => this._onDragLeave(e));
    html.find(".tqw-drop-zone").on("drop", (e) => this._onDrop(e));
    html.find(".tqw-clear-drop").on("click", (e) => this._onClearDrop(e));

    // Roll-table (Task 20)
    html.find(".tqw-roll-button").on("click", (e) => this._onRoll(e));
    html.find(".tqw-outcome-row").on("click", (e) => this._onOutcomeClick(e));

    // Navigation buttons
    html.find(".tqw-next").on("click", () => this._onNextClick());
    html.find(".tqw-back").on("click", () => this._onBackClick());
    html.find(".tqw-cancel").on("click", () => this.close());

    // Finish button (Task 21)
    html.find(".tqw-finish").on("click", () => this._onFinish());
  }

  /**
   * Handle sidebar item clicks for question navigation.
   *
   * Jumps to the clicked question by index, clears validation errors,
   * and re-renders the wizard.
   *
   * @param {Event} event - Click event
   * @param {jQuery} _html - Rendered HTML
   */
  _onSidebarClick(event, _html) {
    const qid = event.currentTarget.dataset.qid;
    const qIndex = QUESTION_DEFINITIONS.findIndex((d) => d.id === qid);
    if (qIndex !== -1) {
      this.currentIndex = qIndex;
      this.validationError = null;
      this.render();
    }
  }

  /**
   * Handle pick changes (radio and select inputs).
   *
   * Updates state[stateField] with the selected value, reveals sub-pickers
   * if needed (nested type), and clears validation errors.
   *
   * @param {Event} event - Change event
   * @param {jQuery} html - Rendered HTML
   */
  _onPickChange(event, html) {
    const qid = event.currentTarget.dataset.qid;
    const qDef = QUESTION_DEFINITIONS.find((d) => d.id === qid);
    if (!qDef || !qDef.stateField) return;

    // Extract the value
    const value = event.currentTarget.value;
    if (event.currentTarget.type === "radio") {
      // Radio: value is the option value
      this.state[qDef.stateField] = value || null;
    } else if (event.currentTarget.name.startsWith("pick-")) {
      // Select: value is the option value
      this.state[qDef.stateField] = value || null;
    }

    // Reveal sub-picker if nested
    if (qDef.subPicker && qDef.pickType === "nested") {
      const subpicker = html.find(".tqw-subpicker");
      const shouldShow = value === qDef.subPicker.revealWhen || qDef.subPicker.revealWhen === "any";
      subpicker.toggle(shouldShow);
      if (!shouldShow) {
        this.state[qDef.subPicker.stateField] = null;
      }
    }

    this.validationError = null;
  }

  /**
   * Handle sub-picker select changes.
   *
   * Updates state[subPicker.stateField] with the selected value and
   * clears validation errors.
   *
   * @param {Event} event - Change event
   * @param {jQuery} _html - Rendered HTML
   */
  _onSubPickChange(event, _html) {
    const qid = event.currentTarget.dataset.qid || event.currentTarget.name.replace("sub-pick-", "");
    const qDef = QUESTION_DEFINITIONS.find((d) => d.id === qid);
    if (!qDef || !qDef.subPicker) return;

    const value = event.currentTarget.value;
    this.state[qDef.subPicker.stateField] = value || null;
    this.validationError = null;
  }

  /**
   * Handle narrative textarea changes.
   *
   * Updates state.narratives[currentId] with the textarea value.
   *
   * @param {Event} event - Change event
   */
  _onNarrativeChange(event) {
    const qid = this.currentId;
    this.state.narratives[qid] = event.currentTarget.value || "";
  }

  /**
   * Handle the "Next" button click.
   *
   * Validates the current question, displays errors if any, or advances
   * to the next question.
   */
  async _onNextClick() {
    // Validate current question
    const validResult = validate(this.state);
    if (!validResult.ok) {
      this.validationError = this._errorMessageForValidation(validResult);
      this.render();
      return;
    }

    if (this.currentIndex < 19) {
      this.currentIndex += 1;
      this.validationError = null;
      this.render();
    }
  }

  /**
   * Handle the "Back" button click.
   *
   * Moves to the previous question if we're not at the start.
   */
  async _onBackClick() {
    if (this.currentIndex > 0) {
      this.currentIndex -= 1;
      this.validationError = null;
      this.render();
    }
  }

  /**
   * Convert validation error codes to user-friendly messages.
   *
   * @param {Object} validResult - Validation result from validate()
   * @returns {string} User-friendly error message
   */
  _errorMessageForValidation(validResult) {
    if (!validResult.ok && validResult.errors.length > 0) {
      const firstError = validResult.errors[0];
      if (firstError.code === "REQUIRED") {
        return `${firstError.field} is required.`;
      } else if (firstError.code === "SUB_REQUIRED") {
        return `Please answer the sub-question for ${firstError.field}.`;
      } else if (firstError.code === "Q10_COUPLED") {
        return "Please select both flaw and bonus feat (or neither).";
      }
    }
    return "Please fill in all required fields.";
  }

  /**
   * Handle dragover event on drop zones (Task 19).
   *
   * @param {Event} event - Dragover event
   */
  _onDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add("tqw-drop-active");
  }

  /**
   * Handle dragleave event on drop zones (Task 19).
   *
   * @param {Event} event - Dragleave event
   */
  _onDragLeave(event) {
    event.currentTarget.classList.remove("tqw-drop-active");
  }

  /**
   * Handle drop event on drop zones (Task 19).
   *
   * Extracts the dragged item from Foundry, validates it against the question's
   * acceptance rules, and stores it in state.
   *
   * @param {Event} event - Drop event
   */
  _onDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove("tqw-drop-active");

    const dataTransfer = event.dataTransfer;
    if (!dataTransfer.types.includes("text/html")) return;

    const html = dataTransfer.getData("text/html");
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    const item = tempDiv.querySelector("[data-item-id]");
    if (!item) return;

    const itemId = item.dataset.itemId;
    const zone = event.currentTarget;
    const qid = zone.dataset.qid;
    const zoneIndex = zone.dataset.zone ?? 0;

    // Look up the item from Foundry
    const actor = this.actor;
    const droppedItem = actor.items.get(itemId);
    if (!droppedItem) return;

    const qDef = QUESTION_DEFINITIONS.find((d) => d.id === qid);
    if (!qDef) return;

    // Validate drop acceptance
    if (!this._validateDrop(qDef, droppedItem)) return;

    // Store dropped item data
    if (qDef.zones && zoneIndex < qDef.zones.length) {
      // Coupled zone (Q10)
      const zoneData = qDef.zones[zoneIndex];
      this.state[zoneData.stateField] = { _id: droppedItem._id, name: droppedItem.name };
    } else {
      // Single zone
      this.state[qDef.stateField] = { _id: droppedItem._id, name: droppedItem.name };
    }

    this.render();
  }

  /**
   * Handle clear button click on drop zones (Task 19).
   *
   * @param {Event} event - Click event
   */
  _onClearDrop(event) {
    event.preventDefault();
    const qid = event.currentTarget.dataset.qid;
    const zoneIndex = event.currentTarget.dataset.zone ?? 0;

    const qDef = QUESTION_DEFINITIONS.find((d) => d.id === qid);
    if (!qDef) return;

    if (qDef.zones && zoneIndex < qDef.zones.length) {
      const zoneData = qDef.zones[zoneIndex];
      this.state[zoneData.stateField] = null;
    } else {
      this.state[qDef.stateField] = null;
    }

    this.render();
  }

  /**
   * Validate drop acceptance against a question's rules.
   *
   * @param {Object} qDef - Question definition
   * @param {Object} item - Dropped item from Foundry
   * @returns {boolean} true if accepted, false otherwise
   */
  _validateDrop(qDef, item) {
    if (!qDef.dropAccepts && !qDef.zones) return false;

    const accepts = qDef.dropAccepts || (qDef.zones ? qDef.zones[0]?.dropAccepts : null);
    if (!accepts) return true; // No validation specified

    if (accepts.type) {
      return item.type === accepts.type;
    }
    if (accepts.typeIn) {
      return accepts.typeIn.includes(item.type);
    }
    return true;
  }

  /**
   * Handle roll button click for Q18 (Task 20).
   *
   * @param {Event} event - Click event
   */
  async _onRoll(event) {
    event.preventDefault();
    const qid = event.currentTarget.dataset.qid;
    const formula = event.currentTarget.dataset.formula || "1d10";

    try {
      const roll = new Roll(formula);
      await roll.evaluate({ async: true });
      const result = roll.total;

      const qDef = QUESTION_DEFINITIONS.find((d) => d.id === qid);
      if (qDef && qDef.stateField) {
        this.state[qDef.stateField] = result;
      }

      this.render();
    } catch (error) {
      console.error("Roll error:", error);
    }
  }

  /**
   * Handle outcome row click for Q18 (Task 20).
   *
   * @param {Event} event - Click event
   */
  _onOutcomeClick(event) {
    event.preventDefault();
    const roll = parseInt(event.currentTarget.dataset.roll, 10);

    // Find the question (should be Q18)
    const qid = this.currentId;
    if (qid !== "q18") return;

    // Store the roll selection
    this.state.q18_heritage_roll = roll;

    this.render();
  }

  /**
   * Handle the Finish button click (Task 21).
   *
   * Validates the full state, diffs against original, collects update plans,
   * merges them, applies to actor, updates biography, and closes the wizard.
   */
  async _onFinish() {
    // Validate full state
    const validResult = validate(this.state);
    if (!validResult.ok) {
      this.validationError = "Cannot finish: " + validResult.errors.map((e) => e.field).join(", ");
      this.render();
      return;
    }

    // Diff state vs original
    const originalState = loadFromActor(this.actor);
    const diff = diffStates(originalState, this.state);

    // Collect update plans for each changed field
    const plans = [];
    for (const field of diff.changedFields) {
      const plan = this._planForField(field, originalState, this.state);
      if (plan) plans.push(plan);
    }

    // Merge all plans
    const mergedPlan = this._mergePlans(plans);

    // Apply to actor
    try {
      if (Object.keys(mergedPlan.updates).length > 0) {
        await this.actor.update(mergedPlan.updates);
      }
      if (mergedPlan.creates.length > 0) {
        await this.actor.createEmbeddedDocuments("Item", mergedPlan.creates);
      }
      if (mergedPlan.deletes.length > 0) {
        await this.actor.deleteEmbeddedDocuments("Item", mergedPlan.deletes);
      }

      // Update biography
      const bioHtml = renderBiography(this.state, {
        questionDefs: QUESTION_DEFINITIONS,
        getOutcomeByRoll,
      });
      const newBio = spliceBiography(this.actor.system.details.biography.value, bioHtml);
      await this.actor.update({ "system.details.biography.value": newBio });

      this.close();
    } catch (error) {
      console.error("Finish error:", error);
      ui.notifications.error("Failed to save character: " + error.message);
    }
  }

  /**
   * Plan updates for a single changed field (Task 21).
   *
   * Maps field names to their corresponding mechanic applier functions
   * and calls them with the new state values.
   *
   * @param {string} field - Changed field name (e.g., "q1_village_uuid", "narratives.q5")
   * @param {Object} originalState - Original state before wizard
   * @param {Object} newState - New state after wizard
   * @returns {Object|null} Update plan or null if no plan needed
   */
  _planForField(field, originalState, newState) {
    // Skip narrative fields for now (they're handled by biography render)
    if (field.startsWith("narratives.")) {
      return null;
    }

    const newValue = newState[field];
    const wasSet = newValue != null;
    const isObject = typeof newValue === "object" && newValue !== null;

    // Q1 Village
    if (field === "q1_village_uuid" && wasSet && isObject) {
      const villageItem = this.actor.items.get(newValue._id);
      return villageItem ? applyQ1Village(this.actor, villageItem.toObject()) : null;
    }

    // Q3 Human Bonus Feat
    if (field === "q3_human_bonus_feat_uuid" && wasSet && isObject) {
      const featItem = this.actor.items.get(newValue._id);
      return featItem ? applyDragDropFeat(featItem.toObject(), "q3HumanBonusFeat") : null;
    }

    // Q4 Affinity
    if (field === "q4_affinity" && wasSet) {
      return applyQ4Affinity(this.actor, newValue);
    }

    // Q7 Relationship changes
    if (field === "q7_relationship") {
      const oldRel = originalState.q7_relationship;
      const newRel = newValue;

      if (newRel === "loyalist" && oldRel !== "loyalist") {
        return applyQ7Loyalist(this.actor, {});
      }
      if (newRel === "outsider" && oldRel !== "outsider") {
        const classSkill = newState.q7_outsider_class_skill;
        return applyQ7Outsider(this.actor, {}, classSkill);
      }
      if (newRel !== oldRel && oldRel) {
        // Reverting a relationship — handled separately below
        return null;
      }
    }

    // Q8 Code changes
    if (field === "q8_code") {
      const oldCode = originalState.q8_code;
      const newCode = newValue;

      if (newCode === "adherent" && oldCode !== "adherent") {
        return applyQ8Adherent(this.actor, {});
      }
      if (newCode === "sceptic" && oldCode !== "sceptic") {
        const subskill = newState.q8_sceptic_subskill;
        return applyQ8Sceptic(this.actor, {}, subskill);
      }
      if (newCode !== oldCode && oldCode) {
        // Reverting a code — handled separately below
        return null;
      }
    }

    // Q9 Level 1 Feat
    if (field === "q9_level1_feat_uuid" && wasSet && isObject) {
      const featItem = this.actor.items.get(newValue._id);
      return featItem ? applyDragDropFeat(featItem.toObject(), "q9Level1Feat") : null;
    }

    // Q10 Coupled (flaw + bonus feat)
    if (field === "q10_flaw_uuid" || field === "q10_bonus_feat_uuid") {
      const flawId = newState.q10_flaw_uuid;
      const bonusId = newState.q10_bonus_feat_uuid;

      let flawItem = null;
      let bonusItem = null;

      if (flawId && typeof flawId === "object") {
        flawItem = this.actor.items.get(flawId._id);
      }
      if (bonusId && typeof bonusId === "object") {
        bonusItem = this.actor.items.get(bonusId._id);
      }

      return applyQ10Coupled(flawItem?.toObject(), bonusItem?.toObject());
    }

    // Q13 Mentor Technique + Class Skill
    if (field === "q13_mentor_technique_uuid" && wasSet && isObject) {
      const techniqueItem = this.actor.items.get(newValue._id);
      const classSkill = newState.q13_class_skill;
      return techniqueItem ? applyQ13Mentor(this.actor, techniqueItem.toObject(), classSkill) : null;
    }

    // Q16 Restricted Item
    if (field === "q16_restricted_item_uuid" && wasSet && isObject) {
      const itemData = this.actor.items.get(newValue._id);
      return itemData ? applyDragDropFeat(itemData.toObject(), "q16RestrictedItem") : null;
    }

    // Q17 Skill Bump
    if (field === "q17_skill_key" && wasSet) {
      return applyQ17SkillBump(this.actor, newValue);
    }

    // Q18 Heritage
    if (field === "q18_heritage_roll" && wasSet) {
      const outcome = getOutcomeByRoll(newValue);
      if (outcome) {
        const deltas = extractModifierDeltas(outcome.modifier);
        return applyQ18Heritage(this.actor, newValue, deltas);
      }
    }

    return null;
  }

  /**
   * Merge multiple update plans into a single batched plan (Task 21).
   *
   * @param {Array} plans - Array of update plans
   * @returns {Object} Merged plan { updates, creates, deletes }
   */
  _mergePlans(plans) {
    const merged = { updates: {}, creates: [], deletes: [] };
    for (const plan of plans) {
      Object.assign(merged.updates, plan.updates);
      merged.creates.push(...plan.creates);
      merged.deletes.push(...plan.deletes);
    }
    return merged;
  }

  /**
   * Determine the CSS class for a question's status badge.
   *
   * - "answered" if the question is filled (has narrative or mechanical pick)
   * - "empty-required" if the question is required but empty
   * - "" (empty string) otherwise
   *
   * @param {Object} def - Question definition
   * @returns {string} CSS class
   */
  _statusClass(def) {
    const filled = this._isFilled(def);
    if (filled) return "answered";
    if (def.required && !filled) return "empty-required";
    return "";
  }

  /**
   * Check if a question is filled (has content).
   *
   * For narrative-only questions (pickType === "none"):
   *   - Check if narrative text exists and is non-empty
   * For mechanical pick questions:
   *   - Check if the state field is not null
   *
   * @param {Object} def - Question definition
   * @returns {boolean} true if filled, false otherwise
   */
  _isFilled(def) {
    if (def.pickType === "none") {
      return (this.state.narratives[def.id] ?? "").length > 0;
    }
    if (def.stateField) {
      return this.state[def.stateField] != null;
    }
    return false;
  }
}
