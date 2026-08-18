/* Entry point. Adding a module is one import and one register call. */

import { register, start, exportAll } from "./shell/shell.js";
import { Ask } from "./modules/ask.js";
import { Memorize } from "./modules/memorize.js";

register(Ask);
register(Memorize);

start();

// console helper: copy(await gaps.export())
window.gaps = { export: exportAll };

if("serviceWorker" in navigator){
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
