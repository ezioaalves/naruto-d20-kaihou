import { registerSchoolAutoApply } from "./grants/school-apply.mjs";
import {
  registerOccupationAutoApply,
  registerOccupationAutoRevert,
} from "./grants/occupation-apply.mjs";

// Theme layer — registers its own Hooks.once("init", ...) so must be loaded
// at module-import time, before any Hooks.once events fire. Pure side-effect
// import (no exports consumed here).
import "./theme/main.mjs";

const MODULE_ID = "naruto-d20-kaihou";

Hooks.once("ready", () => {
  registerSchoolAutoApply();
  registerOccupationAutoApply();
  registerOccupationAutoRevert();
  console.log(`${MODULE_ID} | school and occupation auto-apply ready`);
});
