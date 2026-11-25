import { VILLAGE_CHOICES, villageChoice } from "../apps/wizard/village-choices.mjs";

const ASSET_DIRECTORY = "modules/naruto-d20-kaihou/assets/portrait_frames";
export const PORTRAIT_FRAME_CHOICES = [
  { value: "common", label: "Common" },
  ...VILLAGE_CHOICES.map(({ frame, label }) => ({ value: frame, label })),
];

// Openings measured from the central transparent region of each 2:3 PNG.
// The clipping edge overlaps the border slightly to avoid visible seams.
const APERTURES = {
  common: {
    inset: "8.3% 12.1% 9.1% 12.1%",
    clip: "19.5% 8.3%, 12.1% 13.5%, 12.1% 83.1%, 12.5% 85.7%, 19.9% 90.6%, 63.3% 90.6%, 67.6% 88.0%, 69.5% 87.8%, 71.1% 86.7%, 72.7% 83.6%, 77.0% 80.2%, 82.0% 78.4%, 87.9% 74.2%, 87.5% 13.3%, 80.5% 8.3%",
  },
  crab: {
    inset: "8.3% 12.1% 9.9% 12.1%",
    clip: "18.8% 8.3%, 12.1% 13.0%, 12.1% 84.6%, 19.9% 89.8%, 65.6% 89.8%, 69.5% 87.2%, 71.5% 83.3%, 76.2% 79.7%, 83.6% 77.6%, 87.9% 75.0%, 87.9% 13.0%, 81.2% 8.3%",
  },
  crane: {
    inset: "8.1% 12.1% 8.1% 11.7%",
    clip: "18.0% 8.1%, 11.7% 12.2%, 11.7% 87.5%, 18.0% 91.7%, 59.4% 91.7%, 61.7% 89.8%, 67.6% 87.2%, 69.5% 83.6%, 75.0% 79.7%, 80.5% 78.1%, 87.9% 77.9%, 87.9% 12.0%, 82.0% 8.1%",
  },
  dragon: {
    inset: "8.9% 11.7% 9.9% 11.3%",
    clip: "18.4% 8.9%, 11.3% 13.5%, 11.3% 85.4%, 18.0% 89.8%, 63.7% 89.8%, 69.1% 87.2%, 70.7% 83.6%, 74.6% 80.5%, 78.9% 78.6%, 84.0% 77.6%, 88.3% 74.7%, 88.3% 13.5%, 81.2% 8.9%",
  },
  imperial: {
    inset: "8.3% 11.7% 9.1% 11.3%",
    clip: "18.8% 8.3%, 11.3% 13.5%, 11.3% 85.4%, 19.1% 90.6%, 63.3% 90.6%, 68.4% 87.2%, 70.3% 86.7%, 71.9% 83.6%, 75.4% 80.7%, 82.4% 78.4%, 88.3% 74.5%, 88.3% 13.3%, 80.9% 8.3%",
  },
  kirin: {
    inset: "7.8% 11.3% 9.4% 11.3%",
    clip: "19.1% 7.8%, 11.3% 13.0%, 11.3% 85.2%, 18.4% 89.8%, 25.8% 90.4%, 53.9% 90.4%, 57.8% 90.1%, 67.6% 86.7%, 68.4% 84.6%, 71.5% 81.0%, 76.6% 78.1%, 82.8% 76.6%, 88.7% 72.1%, 88.7% 41.1%, 86.3% 40.4%, 86.3% 39.8%, 88.7% 35.7%, 88.7% 13.3%, 80.9% 7.8%",
  },
  lion: {
    inset: "8.1% 10.9% 9.1% 10.9%",
    clip: "19.1% 8.1%, 10.9% 13.3%, 10.9% 85.2%, 19.1% 90.6%, 60.2% 90.6%, 68.0% 86.5%, 69.5% 83.3%, 74.2% 79.7%, 80.5% 77.6%, 85.9% 77.1%, 89.1% 74.7%, 89.1% 13.3%, 81.2% 8.1%",
  },
  mantis: {
    inset: "7.8% 12.1% 10.2% 12.1%",
    clip: "18.8% 7.8%, 12.1% 12.2%, 12.1% 85.2%, 18.8% 89.6%, 65.6% 89.6%, 68.0% 88.0%, 69.9% 83.6%, 74.6% 79.9%, 80.5% 77.9%, 87.9% 77.3%, 87.9% 12.2%, 81.2% 7.8%",
  },
  phoenix: {
    inset: "8.1% 12.1% 8.9% 12.1%",
    clip: "19.9% 8.1%, 12.1% 13.3%, 12.1% 85.7%, 19.5% 90.9%, 60.2% 90.9%, 68.0% 86.5%, 69.9% 82.3%, 73.8% 79.2%, 78.5% 77.3%, 83.2% 76.6%, 87.9% 73.2%, 87.9% 13.3%, 80.1% 8.1%",
  },
  nukenin: {
    inset: "8.1% 12.1% 9.9% 11.7%",
    clip: "18.4% 8.1%, 12.1% 12.2%, 11.7% 27.9%, 12.1% 85.4%, 18.8% 89.8%, 64.1% 89.8%, 68.0% 87.0%, 70.3% 82.8%, 73.8% 80.2%, 77.7% 78.6%, 83.2% 77.6%, 87.9% 74.5%, 87.9% 12.5%, 81.6% 8.1%",
  },
  scorpion: {
    inset: "7.8% 12.1% 8.9% 11.7%",
    clip: "19.1% 7.8%, 11.7% 12.8%, 11.7% 85.4%, 19.5% 90.9%, 63.3% 90.9%, 68.8% 87.5%, 71.5% 83.3%, 75.8% 80.2%, 82.8% 78.1%, 87.9% 74.7%, 87.9% 12.8%, 80.9% 7.8%",
  },
};

function clamp(value, min, max, fallback) {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
}

export function normalizePortraitSettings(settings = {}) {
  settings ??= {};
  return {
    frame: Object.hasOwn(APERTURES, settings.frame) ? settings.frame : "auto",
    x: clamp(settings.x, 0, 100, 50),
    y: clamp(settings.y, 0, 100, 50),
    zoom: clamp(settings.zoom, 1, 4, 1),
  };
}

export function portraitView(settings, villageItem) {
  const { frame, x, y, zoom } = normalizePortraitSettings(settings);
  const key = frame === "auto" ? villageChoice(villageItem)?.frame ?? "common" : frame;
  const aperture = APERTURES[key];
  // Nukenin uses the original Ronin artwork.
  const basename = key === "nukenin" ? "ronin" : key;
  return {
    frame: key,
    src: `${ASSET_DIRECTORY}/${basename}.png`,
    style: [
      `--db-portrait-inset:${aperture.inset}`,
      `--db-portrait-clip:polygon(${aperture.clip})`,
      `--db-portrait-x:${x}%`,
      `--db-portrait-y:${y}%`,
      `--db-portrait-zoom:${zoom}`,
    ].join(";"),
  };
}
