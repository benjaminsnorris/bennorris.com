/* Merge.
   Combines an exported Gaps file with what's already on this device, so two
   devices that diverged can each absorb the other's progress. Pure functions
   over plain state - no DOM, no Store - so the headless harness can prove the
   rules before a real export ever meets a real device.

   The rules, agreed in advance rather than guessed:

   1. Additive only. Import can add entries and advance state; it never removes
      anything and never regresses an item. There is no undo via import -
      deletion is a different feature.
   2. Spaced-rep conflicts take the higher level and the EARLIER due date.
      Earlier is conservative: worst case is a review that comes slightly soon,
      versus a skipped review that fakes mastery.
   3. Chess's last-5 window (`w`) is ordered but untimestamped, so two windows
      can't be honestly interleaved. The window comes from whichever device
      worked that square more recently. `filled` never unfills; if both devices
      filled a square, the earlier date stands.
   4. The log is a union - deduped, time-sorted, newest LOG_CAP kept. shell/log.js
      carries the same cap so a merged log isn't trimmed back on the next write.
   5. Unknown keys: adopted whole if this device has nothing under that key,
      otherwise left alone and reported. Guessing a merge for a schema this
      file doesn't know would be worse than skipping it.

   Memorize has one trap worth naming: passage ids are generated per device
   ("p" + Date.now()), so both devices hold the same seed passages under
   different ids. Passages are matched by reference + fragment text, never by
   id, and the local id is kept. A passage whose text differs at all is a
   different passage and gets added rather than half-merged.
*/

export const LOG_CAP = 10000;

const A = v => (Array.isArray(v) ? v : []);
const O = v => (v && typeof v === "object" && !Array.isArray(v) ? v : {});

/* ---- ask-state: { entries: [{q,a,deck,shape,at}], recent: [q] } ---------- */
export function mergeAsk(local, remote){
  const l = O(local), r = O(remote);
  const le = A(l.entries), re = A(r.entries);
  const seen = new Set(le.map(e => `${e.at}\u0000${e.q}`));
  const added = re.filter(e => e && e.q && e.at && !seen.has(`${e.at}\u0000${e.q}`));
  const entries = le.concat(added)
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));   // newest first, as the app keeps it

  const recent = A(l.recent).slice();
  for(const q of A(r.recent)) if(!recent.includes(q)) recent.push(q);

  return {
    state: { entries, recent: recent.slice(0, 40) },
    added: added.length
  };
}

/* ---- memorize-state: { passages: [{id,title,ref,frags:[{t,level,due}]}] } */
const passageSig = p =>
  `${(p.ref || p.title || "").trim()}\u0000${A(p.frags).map(f => f.t).join("\u0001")}`;

export function mergeMemorize(local, remote){
  const l = O(local), r = O(remote);
  const passages = A(l.passages).map(p => ({
    ...p, frags: A(p.frags).map(f => ({ ...f }))
  }));
  const bySig = new Map(passages.map(p => [passageSig(p), p]));

  let advanced = 0, passagesAdded = 0;
  for(const rp of A(r.passages)){
    const lp = bySig.get(passageSig(rp));
    if(!lp){
      passages.push({ ...rp, frags: A(rp.frags).map(f => ({ ...f })) });
      bySig.set(passageSig(rp), passages[passages.length - 1]);
      passagesAdded++;
      continue;
    }
    // Same text, same fragmenting - align by index. Higher level wins; the
    // earlier due date wins so a review is never silently skipped.
    lp.frags.forEach((lf, i) => {
      const rf = rp.frags[i];
      if(!rf) return;
      const level = Math.max(lf.level || 0, rf.level || 0);
      if(level > (lf.level || 0)) advanced++;
      lf.level = level;
      const ld = lf.due || 0, rd = rf.due || 0;
      lf.due = ld && rd ? Math.min(ld, rd) : (ld || rd);
    });
  }
  return { state: { passages }, advanced, passagesAdded };
}

/* ---- chess-state: { v, sq: {key: rec}, due: {id: ts}, taught: {key: ts} } */
export function mergeChess(local, remote){
  const l = O(local), r = O(remote);
  const sq = {};
  let advanced = 0, filled = 0;

  const keys = new Set([...Object.keys(O(l.sq)), ...Object.keys(O(r.sq))]);
  for(const k of keys){
    const a = O(l.sq)[k], b = O(r.sq)[k];
    if(!a || !b){
      sq[k] = JSON.parse(JSON.stringify(a || b));
      if(!a){ advanced++; if(sq[k].filled) filled++; }
      continue;
    }
    // The fresher record is the one worked more recently; its window is the
    // true "last five". Everything cumulative is max'd or unioned.
    const fresher = (b.last || 0) > (a.last || 0) ? b : a;
    const merged = {
      w: A(fresher.w).slice(),
      n: Math.max(a.n || 0, b.n || 0),
      last: Math.max(a.last || 0, b.last || 0),
      filled: a.filled && b.filled ? Math.min(a.filled, b.filled) : (a.filled || b.filled || 0),
      seen: {}
    };
    for(const id of new Set([...Object.keys(O(a.seen)), ...Object.keys(O(b.seen))]))
      merged.seen[id] = Math.max(O(a.seen)[id] || 0, O(b.seen)[id] || 0);
    if((b.last || 0) > (a.last || 0)) advanced++;
    if(merged.filled && !a.filled) filled++;
    sq[k] = merged;
  }

  // A due on either device means a miss that hasn't been cleanly re-solved
  // there. Keeping it is the conservative side: the puzzle resurfaces.
  const due = {};
  for(const id of new Set([...Object.keys(O(l.due)), ...Object.keys(O(r.due))])){
    const a = O(l.due)[id], b = O(r.due)[id];
    due[id] = a && b ? Math.min(a, b) : (a || b);
  }

  const taught = {};
  for(const k of new Set([...Object.keys(O(l.taught)), ...Object.keys(O(r.taught))])){
    const a = O(l.taught)[k], b = O(r.taught)[k];
    taught[k] = a && b ? Math.min(a, b) : (a || b);
  }

  return { state: { v: 1, sq, due, taught }, advanced, filled };
}

/* ---- log: [{t, e, ...detail}] -------------------------------------------- */
export function mergeLog(local, remote, cap = LOG_CAP){
  const seen = new Set();
  const all = [];
  for(const ev of A(local).concat(A(remote))){
    const key = JSON.stringify(ev);
    if(seen.has(key)) continue;
    seen.add(key);
    all.push(ev);
  }
  all.sort((a, b) => ((a && a.t) || "") < ((b && b.t) || "") ? -1
                   : ((a && a.t) || "") > ((b && b.t) || "") ? 1 : 0);
  const events = all.slice(-cap);
  return { events, added: events.length - A(local).length };
}

/* ---- the whole file -------------------------------------------------------
   Takes what this device holds and what the file holds, returns what to write
   and a plain-words report. Never touches storage itself.
*/
export function mergeAll(localData, remoteData){
  const local = O(localData), remote = O(remoteData);
  const writes = {};
  const report = [];
  const skipped = [];

  if("ask-state" in remote){
    const m = mergeAsk(local["ask-state"], remote["ask-state"]);
    writes["ask-state"] = m.state;
    if(m.added) report.push(`${m.added} answer${m.added === 1 ? "" : "s"} added`);
  }

  if("memorize-state" in remote){
    const m = mergeMemorize(local["memorize-state"], remote["memorize-state"]);
    writes["memorize-state"] = m.state;
    if(m.advanced) report.push(`${m.advanced} line${m.advanced === 1 ? "" : "s"} advanced`);
    if(m.passagesAdded) report.push(`${m.passagesAdded} passage${m.passagesAdded === 1 ? "" : "s"} added`);
  }

  if("chess-state" in remote){
    const m = mergeChess(local["chess-state"], remote["chess-state"]);
    writes["chess-state"] = m.state;
    if(m.filled) report.push(`${m.filled} square${m.filled === 1 ? "" : "s"} filled`);
    if(m.advanced) report.push(`${m.advanced} square${m.advanced === 1 ? "" : "s"} updated`);
  }

  if("log" in remote){
    const m = mergeLog(local["log"], remote["log"]);
    writes["log"] = m.events;
    if(m.added > 0) report.push(`${m.added} log event${m.added === 1 ? "" : "s"} added`);
  }

  // Anything this file doesn't know how to merge: adopt it whole if this
  // device has nothing there, otherwise leave the device's copy alone.
  // "device-id" is deliberately in KNOWN with no merger: adopting another
  // device's id would make two devices look like one in the log, corrupting
  // the exact signal it exists to provide.
  const KNOWN = new Set(["ask-state", "memorize-state", "chess-state", "log", "shell-state", "device-id"]);
  for(const key of Object.keys(remote)){
    if(KNOWN.has(key)) continue;
    if(local[key] == null){
      writes[key] = remote[key];
      report.push(`"${key}" adopted`);
    }else{
      skipped.push(key);
    }
  }
  if(skipped.length) report.push(`kept this device's copy of: ${skipped.join(", ")}`);

  return { writes, report, skipped };
}
