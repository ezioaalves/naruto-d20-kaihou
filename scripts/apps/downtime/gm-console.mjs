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

function resultLabel(sub) {
  if (sub.rollResult?.ok) return "resolved";
  if (sub.rollResult && sub.rollResult.ok === false) return `failed: ${sub.rollResult.reason ?? "error"}`;
  if (sub.rollPolicy === "defer") return "deferred";
  if (sub.rollPolicy === "auto") return "pending";
  return "—";
}

function rowFor(sub) {
  return {
    id: sub.id,
    actorName: sub.actorName,
    action: sub.action,
    scene: sub.requestScene === true,
    note: sub.note ?? "",
    resultLabel: resultLabel(sub),
    canRun: sub.action === "technique" && sub.rollResult == null,
  };
}

/** Pure: shape the data the console template needs. Exported for tests. */
export function buildConsoleContext({ mode, suggestion, record }) {
  const order = record?.order ?? [];
  const subs = record?.submissions ?? {};
  const rows = order.map((id) => subs[id]).filter(Boolean).map(rowFor);
  const queues = record?.queues ?? { scenes: [], other: [] };
  const rowById = Object.fromEntries(rows.map((r) => [r.id, r]));
  return {
    active: mode === true,
    hasBlock: Boolean(record),
    blocks: [...BLOCKS],
    suggestedBlock: suggestion?.block ?? null,
    dateLabel: suggestion?.date?.label ?? record?.date?.label ?? "",
    recipients: record?.recipients ?? [],
    responses: rows,
    sceneRows: queues.scenes.map((id) => rowById[id]).filter(Boolean),
    otherRows: queues.other.map((id) => rowById[id]).filter(Boolean),
    rollLog: rows.filter((r) => r.resultLabel === "resolved" || String(r.resultLabel).startsWith("failed")),
  };
}

export default class DowntimeConsole extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "kaihou-downtime-console",
    tag: "form",
    classes: ["kaihou-downtime"],
    window: { title: "Kaihou — Downtime Console" },
    position: { width: 720, height: 680 },
    actions: {
      toggleMode: DowntimeConsole.#onToggleMode,
      promptBlock: DowntimeConsole.#onPromptBlock,
      runOne: DowntimeConsole.#onRunOne,
      closeCollection: DowntimeConsole.#onCloseCollection,
      postSummary: DowntimeConsole.#onPostSummary,
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

  // Dynamic imports: runSubmission, closeBlockCollection, postBlockSummary are
  // Task 5 kernel exports — not yet available. Dynamic import prevents load-time
  // failure so the module boots and the pure buildConsoleContext test passes now.
  static async #onRunOne(event, target) {
    const { runSubmission } = await import("../../downtime/kernel.mjs");
    await runSubmission(target?.dataset?.submissionId);
    DowntimeConsole.#instance?.render(false);
  }

  static async #onCloseCollection() {
    const { closeBlockCollection } = await import("../../downtime/kernel.mjs");
    await closeBlockCollection();
    DowntimeConsole.#instance?.render(false);
  }

  static async #onPostSummary() {
    const { postBlockSummary } = await import("../../downtime/kernel.mjs");
    await postBlockSummary();
  }
}
