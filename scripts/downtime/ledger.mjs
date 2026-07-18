export function createBlockRecord({ id, calendarId, date, block, gmUserId, recipients }) {
  return {
    id,
    promptId: id,
    calendarId,
    date,
    block,
    status: "draft",
    createdAt: Date.now(),
    gmUserId,
    recipients: recipients.map((r) => ({ ...r })),
    order: [],
    submissions: {},
    queues: { scenes: [], other: [] },
  };
}

export function openPrompt(record) {
  return { ...record, status: "open" };
}

export function deriveQueues(record) {
  const scenes = [];
  const other = [];
  for (const id of record.order) {
    const s = record.submissions[id];
    if (!s) continue;
    if (s.requestScene) scenes.push(id);
    else if (s.action === "other") other.push(id);
  }
  return { scenes, other };
}

export function upsertSubmission(record, submission) {
  const stored = {
    ...submission,
    rollPolicy: submission.requestScene ? "defer" : submission.rollPolicy,
  };
  const order = record.order.includes(stored.id) ? record.order : [...record.order, stored.id];
  const submissions = { ...record.submissions, [stored.id]: stored };
  const next = { ...record, order, submissions };
  next.queues = deriveQueues(next);
  return next;
}

export function closeCollection(record) {
  const submittedActors = new Set(Object.values(record.submissions).map((s) => s.actorUuid));
  const recipients = record.recipients.map((r) =>
    submittedActors.has(r.actorUuid)
      ? { ...r, status: "submitted" }
      : r.status === "pending"
        ? { ...r, status: "missed" }
        : { ...r },
  );
  return { ...record, status: "closed", recipients };
}

export function resolveBlock(record) {
  return { ...record, status: "resolved", closedAt: Date.now() };
}

export function pruneResolvedBefore(ledger, isBefore) {
  const out = {};
  for (const [id, record] of Object.entries(ledger)) {
    if (record.status === "resolved" && isBefore(record.date)) continue;
    out[id] = record;
  }
  return out;
}

export function recordResult(record, submissionId, result) {
  const sub = record.submissions[submissionId];
  if (!sub) return record;
  const submissions = { ...record.submissions, [submissionId]: { ...sub, rollResult: result } };
  return { ...record, submissions };
}
