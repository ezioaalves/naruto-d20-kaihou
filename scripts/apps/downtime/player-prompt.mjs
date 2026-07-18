import { submitDowntimeAction } from "../../downtime/kernel.mjs";
import { PRIMARY_ACTIONS, buildActionPayload, decideRollPolicy } from "../../downtime/action-payloads.mjs";
import { buildLearnOptions, buildMasterOptions, getTechniqueApi } from "../../downtime/technique-adapter.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const MODULE_ID = "naruto-d20-kaihou";

/** Pure: shape the data the prompt template needs. Exported for tests. */
export function buildPromptContext({ record, actor, selectedAction = "technique", api }) {
  const isTechnique = selectedAction === "technique";
  return {
    actorName: actor?.name ?? "",
    block: record?.block ?? null,
    dateLabel: record?.date?.label ?? "",
    actions: [...PRIMARY_ACTIONS],
    selectedAction,
    isTechnique,
    isNpc: selectedAction === "npc",
    isCrafting: selectedAction === "crafting",
    isMission: selectedAction === "mission",
    isShopping: selectedAction === "shopping",
    isOther: selectedAction === "other",
    learnOptions: isTechnique ? buildLearnOptions(actor, api) : [],
    masterOptions: isTechnique ? buildMasterOptions(actor, api) : [],
  };
}

export default class DowntimePrompt extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "kaihou-downtime-prompt",
    tag: "form",
    classes: ["kaihou-downtime"],
    window: { title: "Kaihou — Action Block" },
    position: { width: 460, height: 560 },
    actions: { submit: DowntimePrompt.#onSubmit },
  };

  static PARTS = {
    body: { template: `modules/${MODULE_ID}/templates/apps/downtime/player-prompt.hbs` },
  };

  static #instance = null;
  static #submitting = false;

  #record;
  #actor;
  #selectedAction = "technique";

  static open(record, actor) {
    if (DowntimePrompt.#instance?.rendered) {
      DowntimePrompt.#instance.#record = record;
      DowntimePrompt.#instance.#actor = actor;
      DowntimePrompt.#instance.#selectedAction = "technique";
      DowntimePrompt.#instance.render(true);
      return DowntimePrompt.#instance;
    }
    const app = new DowntimePrompt();
    app.#record = record;
    app.#actor = actor;
    DowntimePrompt.#instance = app;
    app.render(true);
    return app;
  }

  /**
   * Close the prompt if it belongs to the given block, or unconditionally when
   * blockId is null (used by mode-off). Called by kernel socket handlers.
   */
  static closeIfOpen(blockId) {
    const inst = DowntimePrompt.#instance;
    if (!inst?.rendered) return;
    if (blockId !== null && inst.#record?.id !== blockId) return;
    inst.close();
  }

  async _prepareContext() {
    return buildPromptContext({
      record: this.#record,
      actor: this.#actor,
      selectedAction: this.#selectedAction,
      api: getTechniqueApi(),
    });
  }

  // Re-render the conditional panel when the primary action changes.
  _onRender(context, options) {
    super._onRender?.(context, options);
    const select = this.element?.querySelector('select[name="action"]');
    if (select && !select.dataset.kaihouBound) {
      select.dataset.kaihouBound = "1";
      select.addEventListener("change", (ev) => {
        this.#selectedAction = ev.target.value;
        this.render(false);
      });
    }
  }

  static async #onSubmit(event) {
    if (DowntimePrompt.#submitting) return;
    DowntimePrompt.#submitting = true;
    const form = event.currentTarget.closest("form");
    if (!form) {
      DowntimePrompt.#submitting = false;
      return;
    }
    const data = new FormData(form);
    const action = data.get("action");
    const requestScene = data.get("requestScene") === "on";
    const formObj = Object.fromEntries(data.entries());
    if (action === "technique") {
      formObj.itemUuid = formObj.mode === "master-owned" ? formObj.itemUuidMaster : formObj.itemUuid;
    }
    const payload = buildActionPayload(action, formObj);
    // Guard: technique with no item selected
    if (action === "technique" && !payload.itemUuid) {
      ui.notifications?.warn("Select a technique before submitting.");
      DowntimePrompt.#submitting = false;
      return;
    }
    const submission = {
      id: foundry.utils.randomID(),
      userId: game.user.id,
      actorUuid: this.#actor.uuid,
      actorName: this.#actor.name,
      submittedAt: Date.now(),
      action,
      requestScene,
      payload,
      note: data.get("note") ?? "",
      rollPolicy: decideRollPolicy(action, requestScene),
    };
    await submitDowntimeAction(submission);
    this.close();
    DowntimePrompt.#submitting = false;
  }

  async _onClose(options) {
    DowntimePrompt.#submitting = false;
    return super._onClose(options);
  }
}
