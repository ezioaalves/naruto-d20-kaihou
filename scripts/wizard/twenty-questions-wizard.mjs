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

import { loadFromActor, validate } from "./wizard-state.mjs";
import { QUESTION_DEFINITIONS } from "./question-definitions.mjs";

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

    // Navigation buttons
    html.find(".tqw-next").on("click", () => this._onNextClick());
    html.find(".tqw-back").on("click", () => this._onBackClick());
    html.find(".tqw-cancel").on("click", () => this.close());
    // Finish handler wired in Task 21
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
