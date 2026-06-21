export const MESSAGES = Object.freeze({
  MODE_CHANGE: "downtime.mode.change",
  PROMPT_OPEN: "downtime.prompt.open",
  PROMPT_CLOSE: "downtime.prompt.close",
  PROMPT_SUBMIT: "downtime.prompt.submit",
  PROMPT_SYNC: "downtime.prompt.sync",
  ROLL_REQUEST: "downtime.roll.request",
  ROLL_RESULT: "downtime.roll.result",
  MISSION_OFFER: "downtime.mission.offer",
  MISSION_CHOICE: "downtime.mission.choice",
});

export function validateSubmission(record, msg, userOwnsActor) {
  if (!record) return { ok: false, reason: "no-block" };
  if (record.status !== "open") return { ok: false, reason: "closed" };
  if (msg.submission.userId !== msg.userId) return { ok: false, reason: "user-mismatch" };
  if (!userOwnsActor(msg.userId, msg.submission.actorUuid)) return { ok: false, reason: "not-owner" };
  return { ok: true };
}
