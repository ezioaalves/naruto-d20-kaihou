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

import { loadFromActor } from "./wizard-state.mjs";
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
