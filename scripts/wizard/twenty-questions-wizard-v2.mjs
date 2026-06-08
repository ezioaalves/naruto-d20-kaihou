/**
 * Twenty Questions Wizard — ApplicationV2.
 *
 * V2 PARTS:
 *   header   — brushstroke title bar
 *   progress — click-jumpable strip with status badges
 *   content  — question + pick-type body + narrative
 *   footer   — Back / Cancel / Next or Finish
 *
 * Actions are wired via DEFAULT_OPTIONS.actions; drag-drop is wired via
 * the form-root listeners. State is held on `this.state` (mutable) and
 * persisted to the actor only on `tqw-finish`.
 */

import { questions } from "./question-definitions.mjs";
import {
  defaultState,
  loadFromActor,
  validate,
  canJumpTo,
  jumpTo,
} from "./wizard-state.mjs";
import { openBrowse } from "./browse.mjs";
import { finishWizard, FinishValidationError } from "./finish-orchestrator.mjs";

const MODULE_ID = "naruto-d20-kaihou";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class TwentyQuestionsWizardV2 extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "twenty-questions-wizard-v2",
    classes: ["tqw-v2"],
    tag: "form",
    window: {
      title: "NARUTO_D20_KAIHOU.WIZARD.TITLE",
      icon: "fas fa-scroll",
      resizable: true,
    },
    position: { width: 640, height: 720 },
    actions: {
      "tqw-back":              TwentyQuestionsWizardV2._onBack,
      "tqw-next":              TwentyQuestionsWizardV2._onNext,
      "tqw-cancel":            TwentyQuestionsWizardV2._onCancel,
      "tqw-finish":            TwentyQuestionsWizardV2._onFinish,
      "tqw-progress-jump":     TwentyQuestionsWizardV2._onProgressJump,
      "tqw-radio-select":      TwentyQuestionsWizardV2._onRadioSelect,
      "tqw-select-change":     TwentyQuestionsWizardV2._onSelectChange,
      "tqw-subpicker-change":  TwentyQuestionsWizardV2._onSubpickerChange,
      "tqw-narrative-change":  TwentyQuestionsWizardV2._onNarrativeChange,
      "tqw-clear-drop":        TwentyQuestionsWizardV2._onClearDrop,
      "tqw-browse":            TwentyQuestionsWizardV2._onBrowse,
      "tqw-roll":              TwentyQuestionsWizardV2._onRoll,
    },
  };

  static PARTS = {
    header:   { template: `modules/${MODULE_ID}/templates/apps/tqw-v2/header.hbs` },
    progress: { template: `modules/${MODULE_ID}/templates/apps/tqw-v2/progress.hbs` },
    content:  { template: `modules/${MODULE_ID}/templates/apps/tqw-v2/content.hbs` },
    footer:   { template: `modules/${MODULE_ID}/templates/apps/tqw-v2/footer.hbs` },
  };

  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
    this.state = loadFromActor(actor) ?? defaultState();
  }

  get title() {
    return game.i18n.localize("NARUTO_D20_KAIHOU.WIZARD.TITLE");
  }

  // _prepareContext + handlers are wired in subsequent tasks (G2-G5).
}
