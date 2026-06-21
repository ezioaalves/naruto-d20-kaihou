import { MESSAGES } from "../../downtime/messages.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const MODULE_ID = "naruto-d20-kaihou";
const CHANNEL = `module.${MODULE_ID}`;

export const PRIMARY_ACTIONS = Object.freeze([
  "technique",
  "npc",
  "crafting",
  "mission",
  "shopping",
  "other",
]);

/** Pure: shape the data the prompt template needs. Exported for tests. */
export function buildPromptContext({ record, actor }) {
  return {
    actorName: actor?.name ?? "",
    block: record?.block ?? null,
    dateLabel: record?.date?.label ?? "",
    actions: [...PRIMARY_ACTIONS],
  };
}

export default class DowntimePrompt extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "kaihou-downtime-prompt",
    tag: "form",
    window: { title: "Kaihou — Action Block" },
    position: { width: 460, height: 520 },
    actions: { submit: DowntimePrompt.#onSubmit },
  };

  static PARTS = {
    body: { template: `modules/${MODULE_ID}/templates/apps/downtime/player-prompt.hbs` },
  };

  static #instance = null;
  static #submitting = false;

  #record;
  #actor;

  static open(record, actor) {
    if (DowntimePrompt.#instance?.rendered) {
      DowntimePrompt.#instance.#record = record;
      DowntimePrompt.#instance.#actor = actor;
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

  async _prepareContext() {
    return buildPromptContext({ record: this.#record, actor: this.#actor });
  }

  static async #onSubmit(event) {
    if (DowntimePrompt.#submitting) return;
    DowntimePrompt.#submitting = true;
    const form = event.currentTarget.closest("form");
    if (!form) return;
    const data = new FormData(form);
    const requestScene = data.get("requestScene") === "on";
    const submission = {
      id: foundry.utils.randomID(),
      userId: game.user.id,
      actorUuid: this.#actor.uuid,
      actorName: this.#actor.name,
      submittedAt: Date.now(),
      action: data.get("action"),
      requestScene,
      payload: {},
      note: data.get("note") ?? "",
      rollPolicy: requestScene ? "defer" : "auto",
    };
    game.socket.emit(CHANNEL, { action: MESSAGES.PROMPT_SUBMIT, userId: game.user.id, submission });
    this.close();
    DowntimePrompt.#submitting = false;
  }

  async _onClose(options) {
    DowntimePrompt.#submitting = false;
    return super._onClose(options);
  }
}
