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

  #record;
  #actor;

  static open(record, actor) {
    const app = new DowntimePrompt();
    app.#record = record;
    app.#actor = actor;
    app.render(true);
    return app;
  }

  async _prepareContext() {
    return buildPromptContext({ record: this.#record, actor: this.#actor });
  }

  static async #onSubmit(event) {
    const form = event.currentTarget.closest("form");
    const data = new FormData(form);
    const submission = {
      id: foundry.utils.randomID(),
      userId: game.user.id,
      actorUuid: this.#actor.uuid,
      actorName: this.#actor.name,
      submittedAt: Date.now(),
      action: data.get("action"),
      requestScene: data.get("requestScene") === "on",
      payload: {},
      note: data.get("note") ?? "",
      rollPolicy: data.get("requestScene") === "on" ? "defer" : "auto",
    };
    game.socket.emit(CHANNEL, { action: MESSAGES.PROMPT_SUBMIT, userId: game.user.id, submission });
    this.close();
  }
}
