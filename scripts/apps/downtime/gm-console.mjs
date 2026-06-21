import { BLOCKS } from "../../downtime/block-identity.mjs";
import {
  getDowntimeMode,
  setDowntimeMode,
  suggestCurrentBlock,
  promptCurrentBlock,
  getCurrentBlockRecord,
} from "../../downtime/kernel.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const MODULE_ID = "naruto-d20-kaihou";

/** Pure: shape the data the console template needs. Exported for tests. */
export function buildConsoleContext({ mode, suggestion, record }) {
  return {
    active: mode === true,
    blocks: [...BLOCKS],
    suggestedBlock: suggestion?.block ?? null,
    dateLabel: suggestion?.date?.label ?? "",
    recipients: record?.recipients ?? [],
    queues: record?.queues ?? { scenes: [], other: [] },
  };
}

export default class DowntimeConsole extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "kaihou-downtime-console",
    tag: "form",
    window: { title: "Kaihou — Downtime Console" },
    position: { width: 720, height: 640 },
    actions: {
      toggleMode: DowntimeConsole.#onToggleMode,
      promptBlock: DowntimeConsole.#onPromptBlock,
    },
  };

  static PARTS = {
    body: { template: `modules/${MODULE_ID}/templates/apps/downtime/gm-console.hbs` },
  };

  static #instance = null;

  static open() {
    if (!game.user?.isGM) return null;
    if (DowntimeConsole.#instance?.rendered) {
      DowntimeConsole.#instance.render(true);
      return DowntimeConsole.#instance;
    }
    DowntimeConsole.#instance = new DowntimeConsole();
    DowntimeConsole.#instance.render(true);
    return DowntimeConsole.#instance;
  }

  async _prepareContext() {
    return buildConsoleContext({
      mode: getDowntimeMode(),
      suggestion: suggestCurrentBlock(),
      record: getCurrentBlockRecord(),
    });
  }

  static async #onToggleMode() {
    await setDowntimeMode(!getDowntimeMode());
    DowntimeConsole.#instance?.render(false);
  }

  static async #onPromptBlock(event, target) {
    await promptCurrentBlock(target?.dataset?.block);
    DowntimeConsole.#instance?.render(false);
  }
}
