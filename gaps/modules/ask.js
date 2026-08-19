/* Ask - one question, one short answer, hard stop. */

import { SHAPES } from "../shell/shell.js";

const data = await fetch(new URL("../data/ask-decks.json", import.meta.url)).then(r => r.json());
const DECKS = data.decks, LABEL = data.labels, GENERAL = data.general;

export const Ask = (() => {
  const KEY = "ask-state";            // unchanged, so existing answers survive

  // What each moment is actually good for. Higher = more likely.
  // "meeting" is deliberately exclusive: those questions are about the room
  // you're sitting in, so they're only ever served when Ben says he's in one.
  const WEIGHTS = {
    screen:  { writing: 3, craft: 3, leadership: 3, faith: 1, family: 1, noticing: 1 },
    walking: { faith: 3, family: 3, writing: 2, leadership: 2, noticing: 2, craft: 1 },
    scrap:   { noticing: 4, family: 2, faith: 2, writing: 1, leadership: 1, craft: 1 },
    meeting: { meeting: 1 }
  };
  let state = { entries: [], recent: [] };
  let ctx = null;
  let shape = null;                   // the moment, from the shell
  let chosen = null;                  // null = surprise me
  let current = null;
  let skips = 0;
  let saving = false;

  // An explicit topic wins. Otherwise weight the decks by the moment; with no
  // moment given, every general deck is equally likely.
  function deckFor(){
    if(chosen) return chosen;
    const w = WEIGHTS[shape] || null;
    const decks = w ? Object.keys(w) : GENERAL;
    const total = decks.reduce((t, d) => t + (w ? w[d] : 1), 0);
    let r = Math.random() * total;
    for(const d of decks){
      r -= w ? w[d] : 1;
      if(r <= 0) return d;
    }
    return decks[decks.length - 1];
  }

  function pick(){
    const deck = deckFor();
    const all = DECKS[deck].map(q => [deck, q]);
    let fresh = all.filter(([, q]) => !state.recent.includes(q) && q !== (current && current[1]));
    if(!fresh.length) fresh = all.filter(([, q]) => q !== (current && current[1]));
    if(!fresh.length) fresh = all;
    return fresh[Math.floor(Math.random() * fresh.length)];
  }

  const esc = s => s.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

  const asMarkdown = () => state.entries.slice().reverse().map(e =>
    `## ${e.q}\n\n${e.a}\n\n*${new Date(e.at).toLocaleDateString()} — ${LABEL[e.deck] || ""}${e.shape ? ", " + (SHAPES[e.shape] || {}).label : ""}*\n`
  ).join("\n");

  const CARET = `<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 4.5 6 8.5l4-4"/></svg>`;

  const rail = () => ctx.setRail([{ label: "Answers", open: renderArchive }]);

  function renderAsk(){
    rail();
    ctx.el.className = "card fade";
    ctx.el.innerHTML = `
      <button class="deck" id="deckBtn" aria-label="Choose a topic">
        ${LABEL[current[0]]}${chosen ? "" : (shape && SHAPES[shape] ? " &middot; " + SHAPES[shape].label.toLowerCase() : " &middot; surprise me")}${CARET}
      </button>
      <h1 class="question">${current[1]}</h1>
      <textarea id="ans" placeholder="A sentence or two." rows="3"></textarea>
      <div class="foot">
        <button class="skip" id="skip" ${skips >= 2 ? "disabled" : ""}>
          ${skips >= 2 ? "This is the one." : "Different question"}
        </button>
        <button class="save" id="go" disabled>Save</button>
      </div>`;

    ctx.el.querySelector("#deckBtn").addEventListener("click", renderPicker);
    const ta = ctx.el.querySelector("#ans");
    const go = ctx.el.querySelector("#go");
    ta.addEventListener("input", () => { go.disabled = !ta.value.trim(); });
    go.addEventListener("click", () => commit(ta.value.trim()));
    if(skips < 2){
      ctx.el.querySelector("#skip").addEventListener("click", () => {
        ctx.log("skip", { deck: current && current[0], n: skips + 1 });
        skips++; current = pick(); renderAsk();
      });
    }
  }

  function renderPicker(){
    ctx.setRail([]);
    ctx.el.className = "card fade";
    const rows = [["", "Surprise me", shape && SHAPES[shape] ? "fits this moment" : "any topic"]]
      .concat(GENERAL.map(d => [d, LABEL[d], ""]))
      .concat([["meeting", LABEL.meeting, "about the room"]])
      .map(([key, label, note]) => `
        <button class="pick" data-key="${key}" data-live="${(chosen || "") === key ? 1 : 0}">
          ${label}${note ? `<em>${note}</em>` : ""}
        </button>`).join("");
    ctx.el.innerHTML = `<div class="picktitle">Ask me about</div><div class="scroll">${rows}</div>`;
    ctx.el.querySelectorAll(".pick").forEach(b => {
      b.addEventListener("click", () => {
        // What the weights served vs. what was actually wanted in this moment.
        ctx.log("deck", { from: current && current[0], to: b.dataset.key || "auto" });
        chosen = b.dataset.key || null;
        skips = 0; current = pick(); renderAsk();
      });
    });
  }

  async function commit(text){
    if(!text || saving) return;
    saving = true;
    const go = ctx.el.querySelector("#go");
    if(go){ go.disabled = true; go.textContent = "Saving"; }
    state.recent = [current[1], ...state.recent.filter(x => x !== current[1])].slice(0, 40);
    state.entries.unshift({ q: current[1], a: text, deck: current[0],
                           shape: shape || null, at: new Date().toISOString() });
    await ctx.store.save(KEY, state);
    saving = false;
    ctx.done();
    renderDone();
  }

  function renderDone(){
    ctx.setRail([{ label: "Answers", open: renderArchive }]);
    const n = state.entries.length;
    const kept = ctx.store.ok;
    ctx.el.className = "card fade";
    ctx.el.innerHTML = `
      <div class="done">
        <div class="mark">${kept ? "Saved" : "Kept for now"}</div>
        <div class="line">That's the one for now.</div>
        <div class="sub">${kept
          ? `${n} answer${n === 1 ? "" : "s"} kept.<br>Put the phone away.`
          : `This device won't store answers, so ${n === 1 ? "it lives" : "they live"} here until you close the app.<br>Copy ${n === 1 ? "it" : "them"} out to keep ${n === 1 ? "it" : "them"}.`}</div>
        ${kept ? "" : `<button class="again" id="cpone">${n === 1 ? "Copy this answer" : `Copy all ${n} answers`}</button>`}
        <button class="again" id="again">One more</button>
      </div>`;
    ctx.el.querySelector("#again").addEventListener("click", () => {
      skips = 0; current = pick(); renderAsk();
    });
    const cp = ctx.el.querySelector("#cpone");
    if(cp) cp.addEventListener("click", async ev => {
      try{ await navigator.clipboard.writeText(asMarkdown()); ev.target.textContent = "Copied"; }
      catch(err){ ev.target.textContent = "Couldn't copy — open Answers"; }
    });
  }

  function renderArchive(){
    ctx.setRail([{ label: "Back", open: renderAsk }]);
    ctx.el.className = "card fade";
    if(!state.entries.length){
      ctx.el.innerHTML = `<div class="empty">Nothing kept yet. Answer one question and it lands here.</div>`;
      return;
    }
    const rows = state.entries.map(e => `
      <div class="entry">
        <div class="q">${esc(e.q)}</div>
        <div class="a">${esc(e.a)}</div>
        <div class="d">${new Date(e.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })} &middot; ${LABEL[e.deck] || ""}${e.shape && SHAPES[e.shape] ? " &middot; " + SHAPES[e.shape].label : ""}</div>
      </div>`).join("");
    ctx.el.innerHTML = `<div class="scroll">${rows}</div>
      <div class="foot"><span></span><button class="save" id="cp">Copy as markdown</button></div>`;
    ctx.el.querySelector("#cp").addEventListener("click", async ev => {
      try{ await navigator.clipboard.writeText(asMarkdown()); ev.target.textContent = "Copied"; }
      catch(err){ ev.target.textContent = "Couldn't copy"; }
      setTimeout(() => { ev.target.textContent = "Copy as markdown"; }, 1800);
    });
  }

  return {
    id: "ask",
    name: "Ask",
    shapes: ["screen", "walking", "scrap", "meeting"],
    arousal: "restoring",
    unit: "one question",
    needs: { screen: true, hands: "free", private: false },
    usesShape: true,
    async mount(c){
      ctx = c;
      shape = c.shape || null;
      const saved = await ctx.store.load(KEY);
      if(saved) state = { entries: saved.entries || [], recent: saved.recent || [] };
      chosen = null; skips = 0; current = pick();
      renderAsk();
    },
    unmount(){ ctx = null; },
    summary(){ return { count: state.entries.length, label: "answered" }; },
    exportMarkdown(){ return asMarkdown(); }
  };
})();
