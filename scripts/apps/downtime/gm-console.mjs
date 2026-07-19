import { KaihouApplication } from "../kaihou-application.mjs";
import { BLOCKS } from "../../downtime/block-identity.mjs";
import {
  getDowntimeMode,
  setDowntimeMode,
  suggestCurrentBlock,
  promptCurrentBlock,
  getCurrentBlockRecord,
  runSubmission,
  closeBlockCollection,
  postBlockSummary,
} from "../../downtime/kernel.mjs";

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

export default class DowntimeConsole extends KaihouApplication {
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
    body: { template: KaihouApplication.kaihouTemplate("apps/downtime/gm-console.hbs") },
  };

  static open() {
    if (!game.user?.isGM) return null;
    return super.open();
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
    this.render(false);
  }

  static async #onPromptBlock(event, target) {
    await promptCurrentBlock(target?.dataset?.block);
    this.render(false);
  }

  static async #onRunOne(event, target) {
    await runSubmission(target?.dataset?.submissionId);
    this.render(false);
  }

  static async #onCloseCollection() {
    await closeBlockCollection();
    this.render(false);
  }

  static async #onPostSummary() {
    await postBlockSummary();
  }
}
