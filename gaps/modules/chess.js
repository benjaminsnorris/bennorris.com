/* Chess - tactical motifs, tracked on a board where each of the 64 squares is a
   motif at a difficulty tier.

   Decisions Ben made, encoded here so they're not re-litigated by accident:
     - A square fills at 4 of the last 5 first try. Attendance doesn't count.
       Once filled it stays filled: this is a trace, not a live rating.
     - Five puzzles, hard stop. The only continuation is the board.
     - A miss shows the move and makes you play it, then sends that puzzle back
       two days out. Immediate correction, then spaced. Never a penalty.
     - The whole board is open; the draw just favours low ranks and tier 1.
     - Ratings are never shown anywhere. Tier is the only difficulty signal.

   Motif-first: the first time you meet a motif you get the idea before you get
   a position, and the teaching text stays one tap away from every puzzle. */

import { Chess as Engine } from "../vendor/chess.js";

const MOTIFS = await fetch(new URL("../data/chess-motifs.json", import.meta.url)).then(r => r.json());

/* One flat list of the 64 squares. Rank 1 is foundations, rank 8 is endgame
   technique; tier 1 is the light square, tier 2 the dark one. */
const SQUARES = MOTIFS.ranks.flatMap(r =>
  r.motifs.flatMap(m => [1, 2].map(tier => ({
    key: `${m.theme}:${tier}`,
    theme: m.theme, name: m.name, teach: m.teach,
    rank: r.rank, rankTitle: r.title, rankIdea: r.idea, tier
  })))
);
const BY_KEY = Object.fromEntries(SQUARES.map(s => [s.key, s]));

export const Chess = (() => {
  const KEY = "chess-state";
  const PER_SESSION = 5;             // Ben's call: five, hard stop
  const WINDOW = 5;                  // "4 of the last 5"
  const TO_FILL = 4;
  const RESURFACE = 2 * 864e5;       // a missed puzzle comes back in two days
  const REPLY_MS = 420;              // pause before the opponent answers
  const SETTLE_MS = 780;             // pause on a solved puzzle before the next

  /* Puzzles are 150KB and only needed if chess is actually the module that got
     routed, so they load on first mount rather than at app boot. */
  let puzzlesPromise = null;
  const puzzles = () => (puzzlesPromise ||= fetch(
    new URL("../data/chess-puzzles.json", import.meta.url)
  ).then(r => r.json()).then(d => d.puzzles));

  const GLYPH = { k: "\u265A", q: "\u265B", r: "\u265C", b: "\u265D", n: "\u265E", p: "\u265F" };
  const FILES = "abcdefgh";
  const CARET = `<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 4.5 6 8.5l4-4"/></svg>`;
  const esc = s => String(s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

  let state = { v: 1, sq: {}, due: {}, taught: {} };
  let ctx = null;

  let bank = null;                   // theme:tier -> [puzzle]
  let square = null;                 // the square this session is working
  let queue = [];                    // five puzzles
  let at = 0;                        // index into queue
  let filledThisSession = [];        // squares that filled during this session

  let game = null;                   // Engine instance for the live position
  let puz = null;
  let ply = 0;                       // index into puz.moves of the next move
  let solverIsWhite = true;
  let selected = null;
  let pending = null;                // { from, to } awaiting a promotion choice
  let clean = true;                  // no wrong move yet on this puzzle
  let study = false;                 // showing the line after a miss
  let note = "";                     // one line of feedback under the board
  let locked = false;                // an animation or a reply is in flight

  const rec = key => (state.sq[key] ||= { w: [], filled: 0, n: 0, last: 0, seen: {} });
  const hits = r => r.w.reduce((n, x) => n + x, 0);
  const isFilled = key => !!rec(key).filled;
  const heldCount = () => SQUARES.filter(s => isFilled(s.key)).length;
  const fillFrac = r => Math.min(hits(r), TO_FILL) / TO_FILL;

  /* ---- what to work on ----------------------------------------------------
     Unfilled squares only, weighted towards foundations and tier 1 so the board
     fills roughly bottom-up without ever locking anything. If the whole board
     is held, revisit the one that's been resting longest. */
  function pickSquare() {
    const open = SQUARES.filter(s => !isFilled(s.key));
    if (!open.length) {
      return SQUARES.slice().sort((a, b) => rec(a.key).last - rec(b.key).last)[0];
    }
    const weight = s => (9 - s.rank) * (s.tier === 1 ? 2 : 1);
    const total = open.reduce((t, s) => t + weight(s), 0);
    let r = Math.random() * total;
    for (const s of open) { r -= weight(s); if (r <= 0) return s; }
    return open[open.length - 1];
  }

  /* Due first (those are the ones he missed), then unseen, then whatever he's
     seen least recently. Never the same puzzle twice in one session. */
  function buildQueue(key) {
    const now = Date.now();
    const r = rec(key);
    const list = (bank[key] || []).slice();
    const rankOf = p => {
      if (state.due[p.id] && state.due[p.id] <= now) return 0;
      if (!r.seen[p.id]) return 1;
      return 2;
    };
    list.sort((a, b) => rankOf(a) - rankOf(b) || (r.seen[a.id] || 0) - (r.seen[b.id] || 0));
    return list.slice(0, PER_SESSION);
  }

  /* ---- the live position ------------------------------------------------- */
  function loadPuzzle() {
    puz = queue[at];
    game = new Engine(puz.fen);
    solverIsWhite = game.turn() === "w";
    ply = 0; selected = null; pending = null; clean = true; study = false; note = "";
    locked = false;
  }

  const expected = () => {
    const u = puz.moves[ply] || "";
    return { from: u.slice(0, 2), to: u.slice(2, 4), promo: u.slice(4, 5) || "" };
  };

  function squareName(row, col) {
    // row/col are board() indices: row 0 is rank 8, col 0 is file a.
    return FILES[col] + (8 - row);
  }

  /* ---- rendering the board ----------------------------------------------- */
  function boardHTML() {
    const grid = game.board();
    const rows = solverIsWhite ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
    const cols = solverIsWhite ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
    const last = game.history({ verbose: true }).slice(-1)[0];
    const legal = selected
      ? new Set(game.moves({ square: selected, verbose: true }).map(m => m.to))
      : new Set();

    let out = "";
    rows.forEach(row => cols.forEach(col => {
      const name = squareName(row, col);
      const piece = grid[row][col];
      const dark = (row + col) % 2 === 1;
      const marks = [];
      if (name === selected) marks.push("sel");
      if (legal.has(name)) marks.push(piece ? "take" : "go");
      if (last && (name === last.from || name === last.to)) marks.push("last");
      out += `<button class="sq" data-sq="${name}" data-d="${dark ? 1 : 0}"
        ${marks.length ? `data-m="${marks.join(" ")}"` : ""}
        aria-label="${name}${piece ? ` ${piece.color === "w" ? "white" : "black"} ${piece.type}` : " empty"}">
        ${piece ? `<span class="pc" data-c="${piece.color}">${GLYPH[piece.type]}</span>` : ""}
      </button>`;
    }));
    // Labels live in gutters rather than on the squares: they clear contrast
    // against the card, and a labelled frame is half of what distinguishes a
    // position from the progress map.
    const ranks = rows.map(row => `<span>${8 - row}</span>`).join("");
    const files = cols.map(col => `<span>${FILES[col]}</span>`).join("");
    return `<div class="cwrap">
      <div class="cranks" aria-hidden="true">${ranks}</div>
      <div class="cboard" id="cboard">${out}</div>
      <div class="cfiles" aria-hidden="true">${files}</div>
    </div>`;
  }

  function dotsHTML() {
    return `<span class="dots">` + queue.map((_, i) => {
      const st = i < at ? (queue[i].__missed ? "miss" : "hit") : (i === at ? "now" : "todo");
      return `<i data-s="${st}"></i>`;
    }).join("") + `</span>`;
  }

  function turnLine() {
    if (note) return note;
    if (study) return `The move is <b>${esc(puz.san[ply])}</b>. Play it.`;
    return `${solverIsWhite ? "White" : "Black"} to play`;
  }

  const railSolve = () => ctx.setRail([{ label: "Board", open: renderMap }]);

  function renderPuzzle() {
    railSolve();
    ctx.el.className = "card";
    ctx.el.innerHTML = `
      <button class="deck" id="pickBtn" aria-label="Choose a motif">
        ${esc(square.name)} &middot; tier ${square.tier}${CARET}
      </button>
      ${boardHTML()}
      <div class="turn">${turnLine()}${dotsHTML()}</div>
      ${pending ? promoHTML() : `
        <div class="foot">
          <button class="skip" id="whatBtn">What is this?</button>
          ${study ? "<span></span>" : `<button class="skip" id="passBtn">Show me</button>`}
        </div>`}`;

    ctx.el.querySelector("#pickBtn").addEventListener("click", renderPicker);
    ctx.el.querySelector("#cboard").addEventListener("click", onBoardClick);
    const what = ctx.el.querySelector("#whatBtn");
    if (what) what.addEventListener("click", renderTeach);
    const pass = ctx.el.querySelector("#passBtn");
    if (pass) pass.addEventListener("click", () => { if (!locked && !study) miss(null); });
    if (pending) {
      ctx.el.querySelectorAll("[data-promo]").forEach(b =>
        b.addEventListener("click", () => {
          const p = b.dataset.promo, m = pending;
          pending = null;
          attempt(m.from, m.to, p);
        }));
    }
  }

  function promoHTML() {
    return `<div class="promo"><span class="promolab">Promote to</span>` +
      ["q", "r", "b", "n"].map(p =>
        `<button data-promo="${p}" aria-label="${p}">${GLYPH[p]}</button>`).join("") +
      `</div>`;
  }

  /* ---- interaction -------------------------------------------------------- */
  function onBoardClick(e) {
    if (locked || pending) return;
    const btn = e.target.closest(".sq");
    if (!btn) return;
    const name = btn.dataset.sq;
    const piece = game.get(name);

    if (selected && selected !== name) {
      const options = game.moves({ square: selected, verbose: true }).filter(m => m.to === name);
      if (options.length) {
        if (options.some(m => m.promotion)) { pending = { from: selected, to: name }; selected = null; return renderPuzzle(); }
        const from = selected; selected = null;
        return attempt(from, name, "");
      }
    }
    // Tapping your own piece selects it; anything else clears.
    selected = (piece && piece.color === game.turn() && name !== selected) ? name : null;
    note = "";
    renderPuzzle();
  }

  function attempt(from, to, promo) {
    const exp = expected();
    const right = from === exp.from && to === exp.to && (exp.promo ? promo === exp.promo : true);

    let move;
    try {
      move = game.move({ from, to, promotion: promo || "q" });
    } catch (err) {
      note = "That isn't a legal move here.";
      return renderPuzzle();
    }

    // Lichess accepts any mate as a solution, and so should this.
    if (game.isCheckmate()) {
      note = `<b>${esc(move.san)}</b> &mdash; mate.`;
      return finish(true);
    }
    if (!right) { game.undo(); return miss({ from, to }); }
    if (study) study = false;         // he produced the prompted move

    note = "";
    ply++;
    if (ply >= puz.moves.length) { note = `<b>${esc(move.san)}</b>`; return finish(true); }

    locked = true;
    renderPuzzle();
    setTimeout(() => {
      const reply = expected();
      try { game.move({ from: reply.from, to: reply.to, promotion: reply.promo || "q" }); }
      catch (err) { /* data is validated; if it ever fails, stop cleanly */ return finish(true); }
      ply++;
      locked = false;
      if (ply >= puz.moves.length) { return finish(true); }
      if (!clean) study = true;       // once missed, walk the rest of the line
      renderPuzzle();
    }, REPLY_MS);
  }

  /* A miss shows the move and hands it back. No penalty, no lost streak - the
     only consequence is that this puzzle returns in two days. */
  function miss(tried) {
    if (clean) {
      clean = false;
      state.due[puz.id] = Date.now() + RESURFACE;
    }
    study = true;
    selected = null;
    note = tried
      ? `Not that one. The move is <b>${esc(puz.san[ply])}</b>.`
      : `The move is <b>${esc(puz.san[ply])}</b>. Play it.`;
    renderPuzzle();
  }

  async function finish(solved) {
    locked = true;
    queue[at].__missed = !clean;
    const r = rec(square.key);
    r.w.push(clean ? 1 : 0);
    if (r.w.length > WINDOW) r.w.shift();
    r.n++;
    r.last = Date.now();
    r.seen[puz.id] = Date.now();
    if (clean) delete state.due[puz.id];
    if (!r.filled && hits(r) >= TO_FILL) {
      r.filled = Date.now();
      filledThisSession.push(square.key);
    }
    await ctx.store.save(KEY, state);
    ctx.refresh();
    renderPuzzle();
    setTimeout(() => {
      at++;
      if (at >= queue.length) return renderDone();
      loadPuzzle();
      renderPuzzle();
    }, SETTLE_MS);
  }

  /* ---- the motif, on its own ---------------------------------------------
     This is the point of the thing, so it gets a whole card and it's the first
     screen for a motif you've never worked. */
  function renderIntro() {
    railSolve();
    const first = !state.taught[square.key];
    state.taught[square.key] ||= Date.now();
    ctx.el.className = "card fade";
    ctx.el.innerHTML = `
      <div class="cue">Rank ${square.rank} &middot; ${esc(square.rankTitle)} &middot; tier ${square.tier}</div>
      <h1 class="question">${esc(square.name)}</h1>
      <p class="teach">${esc(square.teach)}</p>
      <div class="foot">
        <button class="skip" id="pickBtn2">A different motif</button>
        <button class="save" id="startBtn">${first ? "Start" : "Five puzzles"}</button>
      </div>`;
    ctx.el.querySelector("#startBtn").addEventListener("click", () => { loadPuzzle(); renderPuzzle(); });
    ctx.el.querySelector("#pickBtn2").addEventListener("click", renderPicker);
  }

  function renderTeach() {
    ctx.setRail([{ label: "Back", open: renderPuzzle }]);
    ctx.el.className = "card fade";
    ctx.el.innerHTML = `
      <div class="cue">Rank ${square.rank} &middot; ${esc(square.rankTitle)} &middot; tier ${square.tier}</div>
      <h1 class="question">${esc(square.name)}</h1>
      <p class="teach">${esc(square.teach)}</p>
      <p class="teach faint">${esc(square.rankIdea)}</p>
      <div class="foot"><span></span><button class="save" id="back">Back to the board</button></div>`;
    ctx.el.querySelector("#back").addEventListener("click", renderPuzzle);
  }

  /* ---- stopping ---------------------------------------------------------- */
  function renderDone() {
    railSolve();
    const r = rec(square.key);
    const missed = queue.filter(q => q.__missed).length;
    const justFilled = filledThisSession.includes(square.key);
    const h = hits(r);
    const held = heldCount();

    const line = justFilled
      ? `${square.name}, tier ${square.tier} is yours.`
      : missed === 0 ? "Five, all first try." : "Five done.";

    const progress = r.filled && !justFilled
      ? `Held since ${new Date(r.filled).toLocaleDateString(undefined, { month: "short", day: "numeric" })}.`
      : r.filled ? `${held} of 64 squares held.`
      : `${h} of your last ${r.w.length} first try. ${TO_FILL - h} more fills it.`;

    ctx.el.className = "card fade";
    ctx.el.innerHTML = `
      <div class="done">
        <div class="mark">${justFilled ? "Square filled" : ctx.store.ok ? "Saved" : "Kept for now"}</div>
        <div class="line">${esc(line)}</div>
        <div class="sub">${esc(square.name)} &middot; tier ${square.tier}<br>${esc(progress)}</div>
        ${justFilled ? `<p class="teach">${esc(square.teach)}</p>` : ""}
        <div class="sub">${ctx.store.ok
          ? "Put the phone away."
          : "This device won't store progress, so the board resets when you close it."}</div>
        ${ctx.store.ok ? "" : `<button class="again" id="copy">Copy the board</button>`}
        <button class="again" id="board">See the board</button>
      </div>`;
    ctx.el.querySelector("#board").addEventListener("click", renderMap);
    const cp = ctx.el.querySelector("#copy");
    if (cp) cp.addEventListener("click", async ev => {
      try { await navigator.clipboard.writeText(asMarkdown()); ev.target.textContent = "Copied"; }
      catch (err) { ev.target.textContent = "Couldn't copy - use the Board view"; }
    });
    ctx.done();
  }

  /* ---- the trace ---------------------------------------------------------
     Deliberately not a chessboard: gaps between cells, motifs paired, rank
     titles, no coordinates, no pieces. It's a map of what's held. */
  function renderMap() {
    ctx.setRail([{ label: "Back", open: () => (puz ? renderPuzzle() : renderIntro()) }]);
    const held = heldCount();
    const rows = MOTIFS.ranks.slice().reverse().map(r => {
      const cells = r.motifs.map(m => [1, 2].map(tier => {
        const s = BY_KEY[`${m.theme}:${tier}`];
        const rc = rec(s.key);
        return `<button class="mapsq" data-key="${s.key}" data-t="${tier}"
          data-f="${rc.filled ? 1 : 0}" style="--fill:${Math.round(fillFrac(rc) * 100)}%"
          aria-label="${esc(s.name)}, tier ${tier}${rc.filled ? ", held" : ""}"></button>`;
      }).join("")).map(pair => `<span class="mappair">${pair}</span>`).join("");
      return `<div class="maprank">
        <div class="maptitle"><span>${r.rank} &middot; ${esc(r.title)}</span><span>${
          r.motifs.filter(m => isFilled(`${m.theme}:1`) && isFilled(`${m.theme}:2`)).length}/4</span></div>
        <div class="mapcells">${cells}</div>
      </div>`;
    }).join("");

    ctx.el.className = "card fade";
    ctx.el.innerHTML = `
      <div class="picktitle">${held} of 64 squares held</div>
      <div class="scroll">${rows}</div>
      <div class="maplegend">Each motif is a pair: tier 1 then tier 2. Tap one to read it or work it.</div>`;
    ctx.el.querySelectorAll(".mapsq").forEach(b =>
      b.addEventListener("click", () => renderSquare(BY_KEY[b.dataset.key])));
  }

  function renderSquare(s) {
    ctx.setRail([{ label: "Board", open: renderMap }]);
    const r = rec(s.key);
    const h = hits(r);
    const status = r.filled
      ? `Held since ${new Date(r.filled).toLocaleDateString(undefined, { month: "short", day: "numeric" })}.`
      : r.n === 0 ? "Not started."
      : `${h} of your last ${r.w.length} first try. ${TO_FILL - h} more fills it.`;
    ctx.el.className = "card fade";
    ctx.el.innerHTML = `
      <div class="cue">Rank ${s.rank} &middot; ${esc(s.rankTitle)} &middot; tier ${s.tier}</div>
      <h1 class="question">${esc(s.name)}</h1>
      <p class="teach">${esc(s.teach)}</p>
      <div class="cue" style="padding:14px 0 0">${esc(status)}</div>
      <div class="foot">
        <span></span>
        <button class="save" id="work">${r.filled ? "Work it again" : "Five puzzles"}</button>
      </div>`;
    ctx.el.querySelector("#work").addEventListener("click", () => startOn(s));
  }

  function renderPicker() {
    ctx.setRail([{ label: "Board", open: renderMap }]);
    const groups = MOTIFS.ranks.map(r => `
      <div class="picktitle" style="padding-top:18px">${r.rank} &middot; ${esc(r.title)}</div>` +
      r.motifs.map(m => `
        <div class="tierrow">
          <span>${esc(m.name)}</span>
          <span class="tiers">${[1, 2].map(t => `
            <button data-key="${m.theme}:${t}" data-f="${isFilled(`${m.theme}:${t}`) ? 1 : 0}">${t}</button>`).join("")}
          </span>
        </div>`).join("")).join("");

    ctx.el.className = "card fade";
    ctx.el.innerHTML = `
      <div class="scroll">
        <button class="pick" id="anyBtn">Surprise me<em>anything unfilled</em></button>
        ${groups}
      </div>`;
    ctx.el.querySelector("#anyBtn").addEventListener("click", () => startOn(pickSquare()));
    ctx.el.querySelectorAll(".tiers button").forEach(b =>
      b.addEventListener("click", () => startOn(BY_KEY[b.dataset.key])));
  }

  function startOn(s) {
    square = s;
    queue = buildQueue(s.key);
    at = 0;
    filledThisSession = [];
    puz = null;
    if (!queue.length) {              // shouldn't happen with the shipped data
      ctx.el.className = "card fade";
      ctx.el.innerHTML = `<div class="empty">No puzzles for ${esc(s.name)} at tier ${s.tier}.
        Re-run tools/extract-puzzles.py to rebuild data/chess-puzzles.json.</div>`;
      return;
    }
    if (rec(s.key).n === 0 || !state.taught[s.key]) return renderIntro();
    loadPuzzle();
    renderPuzzle();
  }

  function asMarkdown() {
    const held = heldCount();
    const out = [`${held} of 64 squares held.\n`];
    MOTIFS.ranks.forEach(r => {
      out.push(`## Rank ${r.rank} — ${r.title}\n`);
      r.motifs.forEach(m => {
        const marks = [1, 2].map(t => {
          const rc = rec(`${m.theme}:${t}`);
          return rc.filled ? "held" : rc.n ? `${hits(rc)}/${TO_FILL}` : "—";
        });
        out.push(`- **${m.name}** — tier 1: ${marks[0]}, tier 2: ${marks[1]}`);
      });
      out.push("");
    });
    const taught = SQUARES.filter(s => s.tier === 1 && state.taught[s.key]);
    if (taught.length) {
      out.push(`## Motifs you've met\n`);
      taught.forEach(s => out.push(`### ${s.name}\n\n${s.teach}\n`));
    }
    return out.join("\n");
  }

  return {
    id: "chess",
    name: "Chess",
    shapes: ["screen"],               // never on a dog walk: it needs a board
    arousal: "activating",
    unit: "five puzzles",
    usesShape: false,
    needs: { screen: true, hands: "free", private: true },

    async mount(c) {
      ctx = c;
      ctx.el.className = "card";
      ctx.el.innerHTML = `<div class="empty">Loading the board…</div>`;
      const [saved, b] = await Promise.all([ctx.store.load(KEY), puzzles()]);
      bank = b;
      if (saved && saved.sq) state = { v: 1, sq: saved.sq, due: saved.due || {}, taught: saved.taught || {} };
      startOn(pickSquare());
    },

    unmount() { ctx = null; game = null; puz = null; queue = []; },

    // Squares held, not puzzles solved. The count shouldn't be inflatable.
    summary() {
      const n = heldCount();
      return { count: n, label: n === 1 ? "square held" : "squares held" };
    },

    exportMarkdown: asMarkdown
  };
})();
