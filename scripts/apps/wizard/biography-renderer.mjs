/**
 * Biography renderer for D2.3b wizard.
 * Renders wizard state to HTML, parses HTML back to state, and splices wizard regions into actor biographies.
 */

/**
 * Escape HTML entities to prevent injection attacks.
 * @param {string} text - The text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Unescape HTML entities.
 * @param {string} text - The text to unescape
 * @returns {string} Unescaped text
 */
function unescapeHtml(text) {
  const map = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#039;": "'",
  };
  return text.replace(/&amp;|&lt;|&gt;|&quot;|&#039;/g, (entity) => map[entity]);
}

/**
 * Render wizard state to HTML biography region.
 * @param {Object} state - Wizard state with narratives, q18_heritage_roll, etc.
 * @param {Object} options - { questionDefs, getOutcomeByRoll? }
 * @returns {string} HTML with <!-- 20Q:START --> and <!-- 20Q:END --> delimiters
 */
export function render(state, options) {
  const { questionDefs, getOutcomeByRoll } = options;

  let html = "<!-- 20Q:START -->\n";
  html += "<h2>20 Questions</h2>\n";

  // Render narrative blocks for filled questions
  for (let i = 1; i <= 20; i++) {
    const qKey = `q${i}`;
    const narrative = state.narratives?.[qKey] || "";

    if (narrative.trim()) {
      const qDef = questionDefs.find((q) => q.id === qKey);
      const qText = qDef?.questionText || `Question ${i}`;
      const escapedNarrative = escapeHtml(narrative).replace(/\n/g, "<br>");

      html += `<h3 data-q="${i}">Q${i}: ${escapeHtml(qText)}</h3>\n`;
      html += `<p>${escapedNarrative}</p>\n`;
    }
  }

  // Render Q18 heritage blockquote if roll is set
  if (state.q18_heritage_roll !== null && getOutcomeByRoll) {
    const outcome = getOutcomeByRoll(state.q18_heritage_roll);
    if (outcome) {
      html += `<blockquote data-q18-heritage="${state.q18_heritage_roll}">\n`;
      html += `<p><strong>Heritage roll: ${state.q18_heritage_roll}</strong></p>\n`;
      html += `<p><strong>${escapeHtml(outcome.name)}</strong></p>\n`;
      html += `<p>${escapeHtml(outcome.modifier)}</p>\n`;
      html += `<p><em>${escapeHtml(outcome.otherEffects)}</em></p>\n`;
      html += `</blockquote>\n`;
    }
  }

  html += "<!-- 20Q:END -->\n";

  return html;
}

/**
 * Parse HTML biography region back to state.
 * @param {string} html - HTML string (full biography or just wizard region)
 * @returns {Object} { narratives: {q1: "", ...}, q18_heritage_roll: null | number }
 */
export function parse(html) {
  const narratives = {};
  for (let i = 1; i <= 20; i++) narratives[`q${i}`] = "";

  // Extract narrative blocks
  const narrativeRegex = /<h3 data-q="(\d+)">.*?<\/h3>\s*<p>(.*?)<\/p>/gs;
  let match;
  while ((match = narrativeRegex.exec(html)) !== null) {
    const qNum = parseInt(match[1], 10);
    let narrative = match[2];
    // Unescape HTML entities
    narrative = unescapeHtml(narrative);
    // Convert <br> back to newlines
    narrative = narrative.replace(/<br>/gi, "\n");
    narratives[`q${qNum}`] = narrative;
  }

  // Extract Q18 heritage roll
  let q18_heritage_roll = null;
  const heritageRegex = /<blockquote data-q18-heritage="(\d+)">/;
  const heritageMatch = heritageRegex.exec(html);
  if (heritageMatch) {
    q18_heritage_roll = parseInt(heritageMatch[1], 10);
  }

  return { narratives, q18_heritage_roll };
}

/**
 * Remove the wizard region (markers included) from a biography.
 * Returns the input unchanged when no region exists. Since the § 5.1
 * biography-tab section, wizard answers live in module flags; this strips
 * regions written by older module versions so the bio field belongs to the
 * player again.
 * @param {string} currentBiography - The current biography HTML
 * @returns {string} Biography without the 20Q region
 */
export function strip(currentBiography) {
  const startMarker = "<!-- 20Q:START -->";
  const endMarker = "<!-- 20Q:END -->";
  const startIdx = currentBiography.indexOf(startMarker);
  const endIdx = currentBiography.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1) return currentBiography;
  const afterEnd = endIdx + endMarker.length;
  // Swallow an optional newline immediately after the end marker so we don't
  // leave a stray blank line when the region was the only content.
  const skip = currentBiography[afterEnd] === "\n" ? afterEnd + 1 : afterEnd;
  return currentBiography.substring(0, startIdx) + currentBiography.substring(skip);
}

/**
 * Splice a newly-rendered wizard region into an actor biography.
 * Preserves text before <!-- 20Q:START --> and after <!-- 20Q:END -->.
 * @param {string} currentBiography - The current biography HTML
 * @param {string} newWizardRegion - The newly-rendered wizard region
 * @returns {string} Updated biography with spliced region
 */
export function splice(currentBiography, newWizardRegion) {
  const startMarker = "<!-- 20Q:START -->";
  const endMarker = "<!-- 20Q:END -->";

  const startIdx = currentBiography.indexOf(startMarker);
  const endIdx = currentBiography.indexOf(endMarker);

  if (startIdx === -1 || endIdx === -1) {
    // No existing region — append new one
    return currentBiography + newWizardRegion;
  }

  // Extract text before and after the wizard region
  const beforeRegion = currentBiography.substring(0, startIdx);
  const afterRegion = currentBiography.substring(endIdx + endMarker.length);

  return beforeRegion + newWizardRegion + afterRegion;
}
