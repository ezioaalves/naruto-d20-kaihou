function escape(text) {
  return String(text ?? "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

export function buildChatSummary(record) {
  const items = (record.order ?? [])
    .map((id) => record.submissions?.[id])
    .filter(Boolean)
    .map((s) => {
      const scene = s.requestScene ? " (scene)" : "";
      const ok = s.rollResult?.ok ? " ✓" : "";
      return `<li><b>${escape(s.actorName)}</b>: ${escape(s.action)}${scene}${ok}</li>`;
    })
    .join("");
  const label = escape(record.date?.label ?? "");
  const block = escape(record.block ?? "");
  return `<div class="kaihou-downtime-summary"><h3>${label} — ${block}</h3><ul>${items}</ul></div>`;
}
