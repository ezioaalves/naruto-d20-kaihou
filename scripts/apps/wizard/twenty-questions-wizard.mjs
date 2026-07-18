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
 * the form-root listeners. State is held on `this.wizardState` (mutable) and
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
import { KaihouApplication } from "../kaihou-application.mjs";

export default class TwentyQuestionsWizard extends KaihouApplication {
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
    kaihou: { centerOnFirstRender: true },
    actions: {
      "tqw-back":              TwentyQuestionsWizard._onBack,
      "tqw-next":              TwentyQuestionsWizard._onNext,
      "tqw-cancel":            TwentyQuestionsWizard._onCancel,
      "tqw-finish":            TwentyQuestionsWizard._onFinish,
      "tqw-progress-jump":     TwentyQuestionsWizard._onProgressJump,
      "tqw-radio-select":      TwentyQuestionsWizard._onRadioSelect,
      // NOTE: the tqw-*-change handlers are deliberately NOT registered here.
      // ApplicationV2 dispatches `actions` on CLICK — and a native <select>
      // emits a click when it is opened. Registering the change handlers as
      // click actions made opening the dropdown re-render the app, destroying
      // the <select> and snapping the native popup shut before the user could
      // pick. They are wired on the `change` event instead — see
      // _wireChangeActions().
      "tqw-clear-drop":        TwentyQuestionsWizard._onClearDrop,
      "tqw-browse":            TwentyQuestionsWizard._onBrowse,
      "tqw-roll":              TwentyQuestionsWizard._onRoll,
    },
  };

  static PARTS = {
    header:   { template: KaihouApplication.kaihouTemplate("apps/tqw-v2/header.hbs") },
    progress: { template: KaihouApplication.kaihouTemplate("apps/tqw-v2/progress.hbs") },
    content:  { template: KaihouApplication.kaihouTemplate("apps/tqw-v2/content.hbs") },
    footer:   { template: KaihouApplication.kaihouTemplate("apps/tqw-v2/footer.hbs") },
  };

  _renderLock = false;

  // Inline validation stays hidden until the user tries to advance without
  // answering the current question. Set in _onNext, cleared on navigation.
  _showValidation = false;

  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
    this.wizardState = loadFromActor(actor) ?? defaultState();
  }

  get title() {
    return game.i18n.localize("NARUTO_D20_KAIHOU.WIZARD.TITLE");
  }

  // _prepareContext + handlers are wired in subsequent tasks (G2-G5).

  async _prepareContext(_options) {
    const currentId = this.wizardState.currentId ?? "q1";
    const currentIdx = questions.findIndex((q) => q.id === currentId);
    const current = questions[currentIdx];

    const enriched = await this._enrichCurrent(current);

    const answeredCount = this._countAnswered();
    const isLastStep = currentIdx === questions.length - 1;
    const canBack = currentIdx > 0;

    const validationResult = validate(this.wizardState);
    const blockingError = this._errorForQuestion(validationResult, currentId);
    // Only surface the inline error once the user has tried to skip ahead.
    const validationError =
      this._showValidation && blockingError ? this._messageForError(blockingError) : null;

    return {
      currentId,
      currentStep: currentIdx + 1,
      current: enriched,
      questions: this._questionsForStrip(),
      answeredCount,
      isLastStep,
      canBack,
      // Narratives are stored under state.narratives[qid] — see V1 line 96.
      narrativeText: this.wizardState.narratives?.[currentId] ?? "",
      validationError,
    };
  }

  _questionsForStrip() {
    return questions.map((q) => ({
      id: q.id,
      sidebarLabel: q.sidebarLabel,
      isAnswered: this._isQuestionAnswered(q),
    }));
  }

  _countAnswered() {
    return questions.filter((q) => this._isQuestionAnswered(q)).length;
  }

  // Mirrors V1's _isFilled (twenty-questions-wizard.mjs line 871-885):
  //   - pickType "none" → narrative non-empty
  //   - mechanical pick → stateField (or any of its array entries) non-null
  _isQuestionAnswered(question) {
    if (question.pickType === "none") {
      return (this.wizardState.narratives?.[question.id] ?? "").length > 0;
    }
    const fields = Array.isArray(question.stateField)
      ? question.stateField
      : [question.stateField];
    return fields.some((f) => {
      if (!f) return false;
      const v = this.wizardState[f];
      return v !== null && v !== "" && v !== undefined;
    });
  }

  async _enrichCurrent(question) {
    // Copy and augment with runtime data (dropped items, rolled values, etc.).
    const enriched = { ...question };

    // Drag-drop single zone
    if (question.pickType === "drag-drop" && typeof question.stateField === "string") {
      const ref = this.wizardState[question.stateField];
      enriched.droppedItem = await this._resolveDroppedItem(ref);
    }

    // Normalize `browse` (single config or array) into a list the template
    // renders one button per entry, carrying its index for _onBrowse.
    if (question.browse) {
      const list = Array.isArray(question.browse) ? question.browse : [question.browse];
      enriched.browseButtons = list.map((cfg, idx) => ({ ...cfg, idx }));
    }

    // Drag-drop coupled (zones array)
    if (question.pickType === "drag-drop-coupled" && Array.isArray(question.zones)) {
      enriched.zones = await Promise.all(
        question.zones.map(async (zone, zoneIdx) => {
          const zoneEnriched = {
            ...zone,
            droppedItem: await this._resolveDroppedItem(this.wizardState[zone.stateField]),
          };
          if (zone.browse) {
            const list = Array.isArray(zone.browse) ? zone.browse : [zone.browse];
            zoneEnriched.browseButtons = list.map((cfg, idx) => ({ ...cfg, idx, zoneIdx }));
          }
          return zoneEnriched;
        }),
      );
    }

    // Radio / select / nested primary value
    if (typeof question.stateField === "string") {
      enriched.value = this.wizardState[question.stateField] ?? null;
    }

    // Sub-picker current value
    if (question.subPicker?.stateField) {
      enriched.subPickerValue = this.wizardState[question.subPicker.stateField] ?? null;
    }

    // Sub-picker reveal condition
    if (question.subPicker?.revealWhen) {
      const { field, value } = question.subPicker.revealWhen;
      enriched.subPickerVisible = this.wizardState[field] === value;
    } else if (question.subPicker) {
      enriched.subPickerVisible = Boolean(enriched.value);
    }

    // Roll-table current rolled value + outcome lookup.
    // Q18 has rollFormula + outcomes:[{roll,name,modifier,otherEffects}].
    // The roll result is stored at state.q18_heritage_roll (first element of
    // the array stateField). The same pattern generalises to any future
    // roll-table question.
    if (question.pickType === "roll-table" && Array.isArray(question.outcomes)) {
      const rollField = Array.isArray(question.stateField)
        ? question.stateField[0]
        : question.stateField;
      const rolled = rollField ? this.wizardState[rollField] ?? null : null;
      enriched.rolledValue = rolled;
      enriched.rolledOutcome = rolled
        ? question.outcomes.find((o) => o.roll === rolled) ?? null
        : null;
    }

    return enriched;
  }

  // Resolve a state-stored item reference to a Foundry document for display.
  // State stores either a plain UUID string (Q1 village) or a {uuid, id, pack}
  // object (drag-drop fields). See V1 _fetchItemData (line 841-852) for the
  // original contract — we mirror it here for display purposes.
  async _resolveDroppedItem(ref) {
    if (!ref) return null;
    if (typeof ref === "string") {
      return (await fromUuid(ref).catch(() => null)) ?? null;
    }
    if (ref.uuid) return (await fromUuid(ref.uuid).catch(() => null)) ?? null;
    if (ref.id && ref.pack) {
      return (await fromUuid(`Compendium.${ref.pack}.Item.${ref.id}`).catch(() => null)) ?? null;
    }
    return null;
  }

  static async _onBack(_event, _target) {
    if (this._renderLock) return;
    this._renderLock = true;
    try {
      const currentIdx = questions.findIndex((q) => q.id === this.wizardState.currentId);
      if (currentIdx <= 0) return;
      this._showValidation = false;
      this.wizardState = { ...this.wizardState, currentId: questions[currentIdx - 1].id };
      await this.render();
    } finally {
      this._renderLock = false;
    }
  }

  static async _onNext(_event, _target) {
    if (this._renderLock) return;
    this._renderLock = true;
    try {
      const currentIdx = questions.findIndex((q) => q.id === this.wizardState.currentId);
      if (currentIdx >= questions.length - 1) return;

      const validationResult = validate(this.wizardState);
      const blockingError = this._errorForQuestion(validationResult, this.wizardState.currentId);
      if (blockingError) {
        // Reveal the inline error now — the user tried to skip without answering.
        this._showValidation = true;
        await this.render();
        return;
      }

      this._showValidation = false;
      this.wizardState = { ...this.wizardState, currentId: questions[currentIdx + 1].id };
      await this.render();
    } finally {
      this._renderLock = false;
    }
  }

  /**
   * Return the first error in `result` that applies to question `qid`.
   * Errors expose `field` (state-key name like "q1_village_uuid" or "q10"),
   * not a `qid` — we match by the leading "qN_" prefix or by exact "qN" id.
   */
  _errorForQuestion(result, qid) {
    if (!result?.errors?.length) return null;
    return result.errors.find(
      (e) => e.field === qid || e.field?.startsWith(`${qid}_`),
    ) ?? null;
  }

  /** Translate a {field, code} validation error into a user-facing string. */
  _messageForError(error) {
    const L = (key) => game.i18n.localize(`NARUTO_D20_KAIHOU.WIZARD.${key}`);
    switch (error?.code) {
      case "REQUIRED":     return L("VALIDATION_REQUIRED");
      case "SUB_REQUIRED": return L("VALIDATION_SUB_REQUIRED");
      case "Q10_COUPLED":  return L("VALIDATION_COUPLED");
      default:             return L("VALIDATION_DEFAULT");
    }
  }

  static async _onCancel(_event, _target) {
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("NARUTO_D20_KAIHOU.WIZARD.CANCEL_CONFIRM_TITLE") },
      content: `<p>${game.i18n.localize("NARUTO_D20_KAIHOU.WIZARD.CANCEL_CONFIRM_BODY")}</p>`,
    });
    if (confirmed) await this.close();
  }

  static async _onFinish(_event, _target) {
    if (this._renderLock) return;
    this._renderLock = true;
    try {
      await finishWizard(this.actor, this.wizardState);
      ui.notifications?.info(
        game.i18n.localize("NARUTO_D20_KAIHOU.WIZARD.FINISH_OK"),
      );
      await this.close();
    } catch (err) {
      if (err instanceof FinishValidationError) {
        ui.notifications?.warn(
          game.i18n.localize("NARUTO_D20_KAIHOU.WIZARD.FINISH_BLOCKED"),
        );
        await this.render();
        return;
      }
      console.error("[tqw-v2] Finish failed:", err);
      ui.notifications?.error(
        `${game.i18n.localize("NARUTO_D20_KAIHOU.WIZARD.FINISH_ERR")}: ${err.message}`,
      );
    } finally {
      this._renderLock = false;
    }
  }

  static async _onProgressJump(_event, target) {
    if (this._renderLock) return;
    this._renderLock = true;
    try {
      const qid = target?.dataset?.qid;
      if (!qid) return;
      if (!canJumpTo(this.wizardState, qid)) return;
      this._showValidation = false;
      this.wizardState = jumpTo(this.wizardState, qid);
      await this.render();
    } finally {
      this._renderLock = false;
    }
  }

  static async _onRadioSelect(_event, target) {
    const qid = target?.dataset?.qid;
    const value = target?.dataset?.value;
    if (!qid || value === undefined) return;
    const question = questions.find((q) => q.id === qid);
    if (!question?.stateField) return;
    this.wizardState = { ...this.wizardState, [question.stateField]: value };
    await this.render();
  }

  static async _onSelectChange(event, target) {
    const qid = target?.dataset?.qid;
    const stateField = target?.dataset?.stateField;
    const value = event?.target?.value ?? target?.value ?? "";
    if (!qid || !stateField) return;
    this.wizardState = { ...this.wizardState, [stateField]: value };
    await this.render();
  }

  static async _onSubpickerChange(event, target) {
    const qid = target?.dataset?.qid;
    const stateField = target?.dataset?.stateField;
    const value = event?.target?.value ?? target?.value ?? "";
    if (!qid || !stateField) return;
    this.wizardState = { ...this.wizardState, [stateField]: value };
    await this.render();
  }

  static async _onNarrativeChange(event, target) {
    const qid = target?.dataset?.qid;
    const value = event?.target?.value ?? target?.value ?? "";
    if (!qid) return;
    // Narratives are stored under state.narratives[qid] — see V1 line 339.
    const narratives = { ...(this.wizardState.narratives ?? {}), [qid]: value };
    this.wizardState = { ...this.wizardState, narratives };
    // No render — narrative is a textarea, re-rendering would steal focus.
  }

  static async _onClearDrop(_event, target) {
    const qid = target?.dataset?.qid;
    const zoneIdx = target?.dataset?.zone;
    if (!qid) return;
    const question = questions.find((q) => q.id === qid);
    if (!question) return;

    if (question.pickType === "drag-drop-coupled" && zoneIdx !== undefined) {
      const idx = parseInt(zoneIdx, 10);
      const zoneStateField = question.zones?.[idx]?.stateField;
      if (zoneStateField) this.wizardState = { ...this.wizardState, [zoneStateField]: null };
    } else if (question.stateField) {
      this.wizardState = { ...this.wizardState, [question.stateField]: null };
    }
    await this.render();
  }

  static async _onBrowse(_event, target) {
    const qid = target?.dataset?.qid;
    const zoneIdx = target?.dataset?.zone;
    if (!qid) return;
    const question = questions.find((q) => q.id === qid);
    if (!question) return;

    let browseCfg;
    if (zoneIdx !== undefined) {
      const idx = parseInt(zoneIdx, 10);
      browseCfg = question.zones?.[idx]?.browse;
    } else {
      browseCfg = question.browse;
    }
    if (!browseCfg) return;
    // `browse` may be a single config or a list of targets (one button each).
    if (Array.isArray(browseCfg)) {
      const bIdx = parseInt(target?.dataset?.browseIdx ?? "0", 10);
      browseCfg = browseCfg[Number.isFinite(bIdx) ? bIdx : 0];
    }
    if (!browseCfg) return;
    await openBrowse(browseCfg);
  }

  static async _onRoll(_event, target) {
    const qid = target?.dataset?.qid;
    if (!qid) return;
    const question = questions.find((q) => q.id === qid);
    if (question?.pickType !== "roll-table") return;

    // Inline d10 roll — mirrors V1 _onRoll (line 601-626).
    const formula = target?.dataset?.formula || question.rollFormula || "1d10";
    try {
      const roll = new Roll(formula);
      await roll.evaluate({ async: true });
      const result = roll.total;

      // Q18 stateField is an array; the roll target is the first entry
      // (q18_heritage_roll). Generalises to any future array-stateField roll.
      const rollField = Array.isArray(question.stateField)
        ? question.stateField[0]
        : question.stateField;
      if (!rollField) return;
      this.wizardState = { ...this.wizardState, [rollField]: result };
      await this.render();
    } catch (error) {
      console.error("[tqw-v2] Roll error:", error);
      ui.notifications?.error(`Roll failed: ${error.message}`);
    }
  }

  _onRender(_context, _options) {
    super._onRender?.(_context, _options);
    this._wireDropZones();
    // Change-event delegation: ApplicationV2 `actions` dispatch on CLICK only,
    // and a native <select> emits a click when opened — registering these as
    // click actions would re-render mid-open and snap the popup shut. The
    // base-class delegator wires `change` once per app root.
    this._wireChangeActions({
      "tqw-select-change":    TwentyQuestionsWizard._onSelectChange,
      "tqw-subpicker-change": TwentyQuestionsWizard._onSubpickerChange,
      "tqw-narrative-change": TwentyQuestionsWizard._onNarrativeChange,
    });
  }

  _wireDropZones() {
    const root = this.element;
    if (!root) return;
    const zones = root.querySelectorAll(".zen-drop-zone[data-qid]");
    for (const zone of zones) {
      zone.addEventListener("dragover", (e) => this._onDragOverZone(e, zone));
      zone.addEventListener("dragleave", (e) => this._onDragLeaveZone(e, zone));
      zone.addEventListener("drop", (e) => this._onDropZone(e, zone));
    }
  }

  _onDragOverZone(event, zone) {
    event.preventDefault();
    zone.classList.add("zen-drop-zone--drag-over");
  }

  _onDragLeaveZone(_event, zone) {
    zone.classList.remove("zen-drop-zone--drag-over");
  }

  async _onDropZone(event, zone) {
    event.preventDefault();
    zone.classList.remove("zen-drop-zone--drag-over");

    let payload;
    try {
      payload = JSON.parse(event.dataTransfer.getData("text/plain"));
    } catch (_e) {
      return;
    }

    const qid = zone.dataset.qid;
    const zoneIdx = zone.dataset.zone;
    const question = questions.find((q) => q.id === qid);
    if (!question) return;

    if (payload?.type !== "Item" || !payload?.uuid) {
      ui.notifications?.warn(
        game.i18n.localize("NARUTO_D20_KAIHOU.WIZARD.DROP_TYPE_REJECTED"),
      );
      return;
    }

    const item = await fromUuid(payload.uuid).catch(() => null);
    if (!item) return;

    // Validate dropAccepts.type if specified.
    const accepts = zoneIdx !== undefined
      ? question.zones?.[parseInt(zoneIdx, 10)]?.dropAccepts
      : question.dropAccepts;
    if (accepts?.type && !this._matchesDropType(item, accepts.type)) {
      ui.notifications?.warn(
        game.i18n.format("NARUTO_D20_KAIHOU.WIZARD.DROP_WRONG_TYPE", {
          expected: accepts.type,
          got: item.type,
        }),
      );
      return;
    }

    // Persist the drop into state. Mirror V1's stored shape — the
    // finish-orchestrator's planForField does `typeof newValue === "object"`
    // gating and looks up via {uuid, id, pack} / {_id} fallbacks.
    const stateField = zoneIdx !== undefined
      ? question.zones?.[parseInt(zoneIdx, 10)]?.stateField
      : question.stateField;
    if (!stateField) return;
    const stored = {
      uuid: item.uuid,
      _id: item.id ?? item._id,
      name: item.name,
    };
    this.wizardState = { ...this.wizardState, [stateField]: stored };
    await this.render();
  }

  _matchesDropType(item, expected) {
    // "feat" matches item.type === "feat".
    // "naruto-d20.technique" matches item.system?.type === "naruto-d20.technique"
    //   OR a system-tagged technique item.
    if (expected === item.type) return true;
    if (expected.includes(".") && item.system?.type === expected) return true;
    return false;
  }
}
