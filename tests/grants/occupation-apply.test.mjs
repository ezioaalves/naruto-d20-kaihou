import { describe, it, expect } from "vitest";
import { renderOccupationSelectionContent } from "../../scripts/grants/occupation-apply.mjs";

describe("renderOccupationSelectionContent", () => {
  it("renders skill checkboxes for each class skill option", () => {
    const html = renderOccupationSelectionContent({
      classSkillOptions: [{ key: "skl", label: "Stealth" }],
      skillSelectCount: 1,
      featOptions: [],
      techniqueOptions: [],
    });
    expect(html).toContain('name="classSkill"');
    expect(html).toContain('value="skl"');
    expect(html).toContain("Stealth");
    expect(html).toContain("Select exactly 1");
  });

  it("renders feat radio buttons for multiple options", () => {
    const html = renderOccupationSelectionContent({
      classSkillOptions: [],
      skillSelectCount: 0,
      featOptions: ["Iron Will", "Combat Expertise"],
      techniqueOptions: [],
    });
    expect(html).toContain('name="featOption"');
    expect(html).toContain("Iron Will");
    expect(html).toContain("Combat Expertise");
  });

  it("renders technique radio buttons for multiple options", () => {
    const html = renderOccupationSelectionContent({
      classSkillOptions: [],
      skillSelectCount: 0,
      featOptions: [],
      techniqueOptions: ["Bunshin no Jutsu", "Kawarimi no Jutsu"],
    });
    expect(html).toContain('name="techniqueOption"');
    expect(html).toContain("Bunshin no Jutsu");
  });

  it("omits sections when no options exist", () => {
    const html = renderOccupationSelectionContent({
      classSkillOptions: [],
      skillSelectCount: 0,
      featOptions: [],
      techniqueOptions: [],
    });
    expect(html).not.toContain('name="classSkill"');
    expect(html).not.toContain('name="featOption"');
    expect(html).not.toContain('name="techniqueOption"');
  });

  it("wraps output in .kaihou-occupation-selector form", () => {
    const html = renderOccupationSelectionContent({
      classSkillOptions: [],
      skillSelectCount: 0,
      featOptions: ["Iron Will"],
      techniqueOptions: [],
    });
    expect(html).toContain("kaihou-occupation-selector");
  });

  it("escapes HTML in option labels", () => {
    const html = renderOccupationSelectionContent({
      classSkillOptions: [{ key: "x", label: '<script>alert(1)</script>' }],
      skillSelectCount: 1,
      featOptions: [],
      techniqueOptions: [],
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
