import { esc, renderPortrait } from "./databook-html.mjs";
import { normalizePortraitSettings, portraitView, PORTRAIT_FRAME_CHOICES } from "./portrait-frames.mjs";

const MODULE_ID = "naruto-d20-kaihou";

function readSettings(form) {
  const { frame, x, y, zoom } = form.elements;
  return normalizePortraitSettings({
    frame: frame.value,
    x: x.valueAsNumber,
    y: y.valueAsNumber,
    zoom: zoom.valueAsNumber,
  });
}

export async function editPortrait(actor, villageItem) {
  if (!game.user?.isGM) return;
  const t = (key) => esc(game.i18n.localize(`Kaihou.Sheet.Portrait.${key}`));
  const initial = normalizePortraitSettings(actor.flags?.[MODULE_ID]?.portrait);
  const choices = [
    { value: "auto", label: game.i18n.localize("Kaihou.Sheet.Portrait.Automatic") },
    ...PORTRAIT_FRAME_CHOICES,
  ];
  const options = choices.map(({ value, label }) => (
    `<option value="${value}"${initial.frame === value ? " selected" : ""}>${esc(label)}</option>`
  )).join("");
  const content = `
    <div class="db-portrait-editor">
      ${renderPortrait(actor.img, portraitView(initial, villageItem), { editable: false })}
      <div class="db-portrait-editor__controls">
        <label>${t("Frame")}<select name="frame">${options}</select></label>
        <label>${t("Zoom")}<input type="range" name="zoom" min="1" max="4" step="0.01" value="${initial.zoom}"></label>
        <label>${t("Horizontal")}<input type="range" name="x" min="0" max="100" value="${initial.x}"></label>
        <label>${t("Vertical")}<input type="range" name="y" min="0" max="100" value="${initial.y}"></label>
        <button type="button" data-reset-crop>${t("ResetCrop")}</button>
      </div>
    </div>`;

  const settings = await foundry.applications.api.DialogV2.wait({
    window: { title: game.i18n.localize("Kaihou.Sheet.Portrait.Title") },
    classes: ["kaihou-portrait-dialog"],
    position: { width: 460 },
    modal: true,
    content,
    buttons: [
      {
        action: "save",
        label: "Save",
        default: true,
        callback: (_event, button) => readSettings(button.form),
      },
      { action: "cancel", label: "Cancel", callback: () => null },
    ],
    render: (_event, dialog) => {
      const form = dialog.element.querySelector("form");
      const preview = form.querySelector(".db-portrait");
      const frameImage = preview.querySelector(".db-portrait__frame");
      const updatePreview = () => {
        const view = portraitView(readSettings(form), villageItem);
        preview.style.cssText = view.style;
        if (preview.dataset.frame !== view.frame) {
          preview.dataset.frame = view.frame;
          frameImage.src = view.src;
        }
      };
      updatePreview();
      form.addEventListener("input", updatePreview);
      form.querySelector("[data-reset-crop]").addEventListener("click", () => {
        const reset = normalizePortraitSettings();
        for (const key of ["zoom", "x", "y"]) form.elements[key].value = reset[key];
        updatePreview();
      });
    },
  });

  if (settings) await actor.setFlag(MODULE_ID, "portrait", settings);
}
