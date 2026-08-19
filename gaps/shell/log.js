/* The log.

   A record of what the shell did and what was chosen instead, kept so that a
   fortnight of real use can settle questions a brainstorm can't: whether
   `walking` and `scrap` are real moments or a screen app asking a question it
   doesn't need, whether the router's picks get rejected, whether Ask's deck
   weights match what actually gets wanted in each moment.

   Two rules about what this is not:

   1. It never appears in the app. Not in the rail, not on a card, not in
      summary(). `summary()` reports what was earned; a log is what was done,
      and surfacing it would build the streak counter the spec refuses.
   2. It is not a score. Nothing here should be looked at daily. It exists to
      be exported once, read once, and to change what gets built next.

   Timestamps are local with offset - 2026-08-19T14:32:05-06:00 - because the
   question is what time of day a gap happens, and toISOString() is UTC, which
   makes that ambiguous the moment you answer something in another timezone.
*/

import { Store } from "./store.js";

const KEY = "log";
const CAP = 2000;          // ~50 days at ten gaps a day; oldest fall off first
const FLUSH_EVERY = 20;

let events = [];
let pending = 0;

function stamp(d = new Date()){
  const p = n => String(Math.floor(Math.abs(n))).padStart(2, "0");
  const off = -d.getTimezoneOffset();
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` +
         `T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}` +
         `${off < 0 ? "-" : "+"}${p(off / 60)}:${p(off % 60)}`;
}

export const Log = {
  async init(){
    const saved = await Store.load(KEY);
    events = Array.isArray(saved) ? saved : [];
  },

  // Buffered in memory rather than written per event: an installed web app is
  // frozen without warning, so the shell flushes on hide and on completion.
  add(name, detail){
    events.push(Object.assign({ t: stamp(), e: name }, detail || {}));
    if(events.length > CAP) events = events.slice(-CAP);
    if(++pending >= FLUSH_EVERY) this.flush();
    return true;
  },

  flush(){
    if(!pending) return Promise.resolve(true);
    pending = 0;
    return Store.save(KEY, events);
  },

  all(){ return events.slice(); },

  stamp
};
