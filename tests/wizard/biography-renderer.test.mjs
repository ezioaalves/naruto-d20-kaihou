import { describe, it, expect } from "vitest";
import { render, parse, splice } from "../../scripts/apps/wizard/biography-renderer.mjs";
import { QUESTION_DEFINITIONS } from "../../scripts/apps/wizard/question-definitions.mjs";
import { getOutcomeByRoll } from "../../scripts/apps/wizard/heritage-table.mjs";

function stateWith(overrides = {}) {
  const narratives = {};
  for (let i = 1; i <= 20; i++) narratives[`q${i}`] = "";
  return {
    q1_village_uuid: null,
    q3_school_uuid: null,
    q4_affinity: null,
    q7_relationship: null,
    q7_outsider_class_skill: null,
    q8_code: null,
    q8_sceptic_subskill: null,
    q9_level1_feat_uuid: null,
    q10_flaw_uuid: null,
    q10_bonus_feat_uuid: null,
    q13_mentor_technique_uuid: null,
    q13_class_skill: null,
    q16_restricted_item_uuid: null,
    q17_skill_key: null,
    q18_heritage_roll: null,
    q18_heritage_locked_modifier: null,
    narratives,
    ...overrides,
  };
}

describe("render", () => {
  it("returns empty wizard region when no narratives + no Q18", () => {
    const html = render(stateWith(), { questionDefs: QUESTION_DEFINITIONS });
    expect(html).toContain("<!-- 20Q:START -->");
    expect(html).toContain("<!-- 20Q:END -->");
    expect(html).toContain("<h2>20 Questions</h2>");
    // No <h3> blocks since no narratives
    expect(html).not.toMatch(/<h3 data-q="\d+">/);
  });

  it("renders one <h3>/<p> block per filled narrative", () => {
    const s = stateWith();
    s.narratives.q1 = "I am from Kanigakure.";
    s.narratives.q5 = "Protect the heir.";
    const html = render(s, { questionDefs: QUESTION_DEFINITIONS });
    expect(html).toMatch(/<h3 data-q="1">Q1: Which Great Village does your character come from\?<\/h3>\s*<p>I am from Kanigakure\.<\/p>/);
    expect(html).toMatch(/<h3 data-q="5">[^<]+<\/h3>\s*<p>Protect the heir\.<\/p>/);
    expect(html).not.toMatch(/<h3 data-q="2">/); // q2 empty -> omitted
  });

  it("preserves newlines in narrative as <br> tags", () => {
    const s = stateWith();
    s.narratives.q1 = "Line one.\nLine two.";
    const html = render(s, { questionDefs: QUESTION_DEFINITIONS });
    expect(html).toContain("Line one.<br>Line two.");
  });

  it("escapes HTML in player text to prevent injection", () => {
    const s = stateWith();
    s.narratives.q1 = "<script>alert('x')</script>";
    const html = render(s, { questionDefs: QUESTION_DEFINITIONS });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("renders Q18 heritage blockquote when q18_heritage_roll is set", () => {
    const s = stateWith({
      q18_heritage_roll: 1,
      q18_heritage_locked_modifier: { deltaRep: 1, deltaAP: 0 },
    });
    s.narratives.q18 = "Named for great-grandfather.";
    const html = render(s, { questionDefs: QUESTION_DEFINITIONS, getOutcomeByRoll });
    expect(html).toMatch(/<blockquote data-q18-heritage="1">/);
    expect(html).toContain("Heritage roll: 1");
    expect(html).toContain("Famous Deed");
    expect(html).toContain("+1 Reputation");
    expect(html).toContain("family heirloom"); // Other Effects text
  });

  it("does NOT render Q18 blockquote when roll is null", () => {
    const s = stateWith();
    s.narratives.q18 = "Named for someone.";
    const html = render(s, { questionDefs: QUESTION_DEFINITIONS, getOutcomeByRoll });
    expect(html).not.toMatch(/<blockquote data-q18-heritage/);
  });
});

describe("parse", () => {
  it("recovers narratives from rendered HTML (round-trip)", () => {
    const s = stateWith();
    s.narratives.q1 = "I am from Kanigakure.";
    s.narratives.q5 = "Protect the heir.";
    const html = render(s, { questionDefs: QUESTION_DEFINITIONS });
    const parsed = parse(html);
    expect(parsed.narratives.q1).toBe("I am from Kanigakure.");
    expect(parsed.narratives.q5).toBe("Protect the heir.");
    expect(parsed.narratives.q2).toBe("");
  });

  it("recovers escaped HTML back to original text (round-trip)", () => {
    const s = stateWith();
    s.narratives.q1 = "<script>x</script>";
    const html = render(s, { questionDefs: QUESTION_DEFINITIONS });
    const parsed = parse(html);
    expect(parsed.narratives.q1).toBe("<script>x</script>");
  });

  it("recovers <br> back to newlines (round-trip)", () => {
    const s = stateWith();
    s.narratives.q1 = "Line one.\nLine two.";
    const html = render(s, { questionDefs: QUESTION_DEFINITIONS });
    const parsed = parse(html);
    expect(parsed.narratives.q1).toBe("Line one.\nLine two.");
  });

  it("recovers q18_heritage_roll from blockquote", () => {
    const s = stateWith({
      q18_heritage_roll: 9,
      q18_heritage_locked_modifier: { deltaRep: 0, deltaAP: 3 },
    });
    const html = render(s, { questionDefs: QUESTION_DEFINITIONS, getOutcomeByRoll });
    const parsed = parse(html);
    expect(parsed.q18_heritage_roll).toBe(9);
  });
});

describe("splice", () => {
  it("inserts wizard region into empty biography", () => {
    const wizardHtml = render(stateWith(), { questionDefs: QUESTION_DEFINITIONS });
    const result = splice("", wizardHtml);
    expect(result).toContain("<!-- 20Q:START -->");
    expect(result).toContain("<!-- 20Q:END -->");
  });

  it("preserves player text BEFORE the wizard region", () => {
    const s = stateWith();
    s.narratives.q1 = "From Kani.";
    const wizardHtml = render(s, { questionDefs: QUESTION_DEFINITIONS });
    const original = "<p>Pre-wizard backstory.</p>" + wizardHtml;
    const newWizardHtml = render(stateWith({ q1_village_uuid: "x" }), {
      questionDefs: QUESTION_DEFINITIONS,
    });
    const result = splice(original, newWizardHtml);
    expect(result.startsWith("<p>Pre-wizard backstory.</p>")).toBe(true);
    expect(result).toContain("<!-- 20Q:START -->");
  });

  it("preserves player text AFTER the wizard region", () => {
    const wizardHtml = render(stateWith(), { questionDefs: QUESTION_DEFINITIONS });
    const original = wizardHtml + "<p>Post-wizard addendum.</p>";
    const newWizardHtml = render(stateWith(), { questionDefs: QUESTION_DEFINITIONS });
    const result = splice(original, newWizardHtml);
    expect(result.endsWith("<p>Post-wizard addendum.</p>")).toBe(true);
  });

  it("replaces wizard region but keeps surrounding text", () => {
    const oldS = stateWith();
    oldS.narratives.q1 = "Old village memory.";
    const oldWizardHtml = render(oldS, { questionDefs: QUESTION_DEFINITIONS });
    const original = "<p>Pre.</p>" + oldWizardHtml + "<p>Post.</p>";

    const newS = stateWith();
    newS.narratives.q1 = "New village memory.";
    const newWizardHtml = render(newS, { questionDefs: QUESTION_DEFINITIONS });

    const result = splice(original, newWizardHtml);
    expect(result).toContain("<p>Pre.</p>");
    expect(result).toContain("New village memory.");
    expect(result).not.toContain("Old village memory.");
    expect(result).toContain("<p>Post.</p>");
  });
});
