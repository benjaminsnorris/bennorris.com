/* node test-merge.mjs — proves the merge rules against divergent devices. */
import { mergeAsk, mergeMemorize, mergeChess, mergeLog, mergeAll, LOG_CAP } from "../shell/merge.js";

let failures = 0;
const ok = (cond, name) => {
  console.log((cond ? "  ok  " : "  FAIL") + " " + name);
  if(!cond) failures++;
};
const clone = o => JSON.parse(JSON.stringify(o));

/* ---- fixtures: device A (phone, older, more progress) and B (newer) ------- */

const askA = {
  entries: [
    { q: "What did you notice today?", a: "Frost on the fence", deck: "noticing", shape: "walking", at: "2026-08-10T08:00:00.000Z" },
    { q: "What would you tell Miles?",  a: "Slow is smooth",     deck: "family",   shape: "screen",  at: "2026-08-09T21:00:00.000Z" }
  ],
  recent: ["What did you notice today?", "What would you tell Miles?"]
};
const askB = {
  entries: [
    { q: "What did you notice today?", a: "Frost on the fence", deck: "noticing", shape: "walking", at: "2026-08-10T08:00:00.000Z" }, // synced earlier: dupe
    { q: "What is this meeting for?",  a: "Deciding the cut",   deck: "meeting",  shape: "meeting", at: "2026-08-12T15:00:00.000Z" }
  ],
  recent: ["What is this meeting for?"]
};

// Same seed passage, DIFFERENT ids (the per-device id trap), divergent levels.
const mkFrags = levels => [
  { t: "when ye are in the service of your fellow beings,", level: levels[0], due: levels[0] ? 1000 + levels[0] : 0 },
  { t: "ye are only in the service of your God.",           level: levels[1], due: levels[1] ? 2000 + levels[1] : 0 }
];
const memA = { passages: [ { id: "pAAA", title: "Mosiah 2:17", ref: "Mosiah 2:17", frags: mkFrags([3, 1]) } ] };
const memB = { passages: [
  { id: "pBBB", title: "Mosiah 2:17", ref: "Mosiah 2:17", frags: mkFrags([2, 4]) },
  { id: "pCCC", title: "Articles of Faith 13", ref: "AoF 13", frags: [{ t: "We believe in being honest,", level: 0, due: 0 }] }
] };

const chessA = {
  v: 1,
  sq: {
    "fork:1": { w: [1,1,0,1,1], n: 12, last: 100, filled: 500, seen: { a1: 100, a2: 90 } },
    "pin:1":  { w: [1,0],       n: 2,  last: 300, filled: 0,   seen: { b1: 300 } }
  },
  due: { a3: 700 },
  taught: { "fork:1": 50, "pin:1": 250 }
};
const chessB = {
  v: 1,
  sq: {
    "fork:1": { w: [0,1,1,1,1], n: 15, last: 200, filled: 400, seen: { a1: 100, a4: 200 } }, // fresher, earlier fill
    "skewer:1": { w: [1,1,1,1], n: 4, last: 900, filled: 950, seen: { c1: 900 } }            // only on B, filled
  },
  due: { a3: 600, a5: 800 },
  taught: { "fork:1": 40, "skewer:1": 880 }
};

const logA = [ { t: "2026-08-10T08:00:00-06:00", e: "moment", shape: "walking" },
               { t: "2026-08-10T08:05:00-06:00", e: "completed", module: "ask", shape: "walking" } ];
const logB = [ logA[0],                                                          // shared history
               { t: "2026-08-12T15:00:00-06:00", e: "moment", shape: "meeting" } ];

/* ---- ask ------------------------------------------------------------------ */
console.log("ask");
{
  const m = mergeAsk(clone(askA), clone(askB));
  ok(m.state.entries.length === 3 && m.added === 1, "union on (at, q): 2 + 2 with 1 dupe -> 3");
  ok(m.state.entries[0].q === "What is this meeting for?", "sorted newest first");
  ok(m.state.entries.every(e => e.a), "no entry lost or blanked");
  ok(m.state.recent.length === 3 && m.state.recent[0] === askA.recent[0], "recent merged, local order first");
  const again = mergeAsk(clone(m.state), clone(askB));
  ok(again.added === 0 && again.state.entries.length === 3, "idempotent: re-importing the same file adds nothing");
  const empty = mergeAsk(null, clone(askB));
  ok(empty.state.entries.length === 2, "fresh device adopts the file wholesale");
}

/* ---- memorize ------------------------------------------------------------- */
console.log("memorize");
{
  const m = mergeMemorize(clone(memA), clone(memB));
  ok(m.state.passages.length === 2, "same passage under different ids did NOT duplicate; new passage added");
  ok(m.passagesAdded === 1, "reports 1 passage added");
  const p = m.state.passages.find(x => x.ref === "Mosiah 2:17");
  ok(p.id === "pAAA", "local id kept");
  ok(p.frags[0].level === 3 && p.frags[1].level === 4, "higher level wins per line");
  ok(p.frags[0].due === 1002 && p.frags[1].due === 2001, "earlier due wins per line");
  ok(m.advanced === 1, "reports 1 line advanced (frag 2: 1 -> 4)");
  // no regression: merge B into the merged result; nothing may go down
  const before = clone(m.state);
  const again = mergeMemorize(clone(m.state), clone(memB));
  ok(JSON.stringify(again.state) === JSON.stringify(before), "idempotent, no regression on re-import");
}

/* ---- chess ---------------------------------------------------------------- */
console.log("chess");
{
  const m = mergeChess(clone(chessA), clone(chessB));
  const fork = m.state.sq["fork:1"];
  ok(fork.w.join("") === "01111", "window comes from the fresher device (B, last=200)");
  ok(fork.filled === 400, "filled never unfills; earlier fill date stands");
  ok(fork.n === 15 && fork.last === 200, "n and last take the max");
  ok(Object.keys(fork.seen).length === 3 && fork.seen.a1 === 100, "seen unioned");
  ok(m.state.sq["pin:1"] && m.state.sq["skewer:1"], "one-sided squares carried over both ways");
  ok(m.state.sq["skewer:1"].filled === 950 && m.filled === 1, "square filled only on B counts as newly filled here");
  ok(m.state.due.a3 === 600 && m.state.due.a5 === 800, "due: earlier wins, one-sided kept (misses resurface)");
  ok(m.state.taught["fork:1"] === 40, "taught: earliest teaching date");
  const again = mergeChess(clone(m.state), clone(chessB));
  ok(JSON.stringify(again.state.sq) === JSON.stringify(m.state.sq), "idempotent");
}

/* ---- log ------------------------------------------------------------------ */
console.log("log");
{
  const m = mergeLog(clone(logA), clone(logB));
  ok(m.events.length === 3 && m.added === 1, "union deduped the shared event");
  ok(m.events[0].t <= m.events[1].t && m.events[1].t <= m.events[2].t, "time-sorted");
  const big = Array.from({ length: LOG_CAP + 500 }, (_, i) =>
    ({ t: `2026-01-01T00:00:${String(i % 60).padStart(2, "0")}-06:00`, e: "x", i }));
  ok(mergeLog(big, []).events.length === LOG_CAP, `capped at ${LOG_CAP}`);
}

/* ---- mergeAll ------------------------------------------------------------- */
console.log("mergeAll");
{
  const localDump  = { "ask-state": clone(askA), "memorize-state": clone(memA), "chess-state": clone(chessA), "log": clone(logA), "shell-state": { lastShape: "screen" } };
  const remoteData = { "ask-state": clone(askB), "memorize-state": clone(memB), "chess-state": clone(chessB), "log": clone(logB), "shell-state": { lastShape: "walking" }, "future-module": { x: 1 } };
  const m = mergeAll(localDump, remoteData);
  ok(!("shell-state" in m.writes), "shell-state (lastShape) stays local");
  ok(m.writes["future-module"] && m.writes["future-module"].x === 1, "unknown key adopted when this device has nothing");
  const m2 = mergeAll({ ...localDump, "future-module": { x: 9 } }, remoteData);
  ok(!("future-module" in m2.writes) && m2.skipped.includes("future-module"), "unknown key skipped + reported when both sides have it");
  console.log("  report:", m.report.join(" · "));
  ok(m.report.some(s => s.includes("answer")) && m.report.some(s => s.includes("line")) && m.report.some(s => s.includes("square")), "report covers every module");
  // full-circle idempotence
  const merged = m.writes;
  const m3 = mergeAll({ ...localDump, ...merged }, remoteData);
  ok((m3.report.filter(s => !s.includes("kept") && !s.includes("adopted")).length === 0), "second import of the same file reports nothing new");
}


/* ---- device id -------------------------------------------------------------- */
console.log("device-id");
{
  const local  = { "log": [], "device-id": "aaaa" };
  const remote = { "log": [ { t: "2026-08-12T15:00:00-06:00", d: "bbbb", e: "moment" } ], "device-id": "bbbb" };
  const m = mergeAll(local, remote);
  ok(!("device-id" in m.writes), "device-id never overwritten");
  const fresh = mergeAll({ "log": [] }, remote);
  ok(!("device-id" in fresh.writes), "device-id never adopted, even on a fresh device");
  ok(m.writes["log"][0].d === "bbbb", "merged log events keep their origin device stamp");
}

console.log(failures ? `\n${failures} FAILURE(S)` : "\nall passed");
process.exit(failures ? 1 : 0);
