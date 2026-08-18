/* Shell.
   Routes a moment to a module. See MODULE-CONTRACT.md.

   Three rules enforced here so a module can't quietly break the spec:
   1. Never ask a question whose answer can't change the outcome.
   2. A session ends when the module says it's done. One quiet continuation.
   3. There is always a way back to a new gap, from any screen, in one tap.

   Rule 3 is the shell's job rather than a module's because a module with a
   narrow `shapes` list used to be a dead end: choosing "In a meeting" left
   only Ask eligible, the module switcher never rendered, and nothing on screen
   led back to the picker. That can't recur now - the way out doesn't depend on
   how many modules happen to fit.

   The nesting: a new gap is the outer loop, switching activity is the inner
   one. The rail button is the moment, and the module switcher lives one level
   in, inside the shape picker.
*/

import { Store } from "./store.js";

export const SHAPES = {
  screen:  { label: "At a screen",  hint: "Bathroom, before a call" },
  walking: { label: "Walking",      hint: "Dog walk, break outside" },
  scrap:   { label: "A quick gap",  hint: "Standing in line" },
  meeting: { label: "In a meeting", hint: "Half an ear on the room" }
};

const SHELL_KEY = "shell-state";

const CARET = `<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:8px;height:8px;margin-left:5px"><path d="M2 4.5 6 8.5l4-4"/></svg>`;

const Modules = [];
export const register = m => Modules.push(m);

let countEl, railEl, card;
let shape = null;
let lastShape = null;
let active = null;
let lastUsed = {};
let completed = false;      // has the running module reported a finished session?
let picking = false;        // is a picker on screen rather than a module?

const eligible = s => Modules.filter(m => !s || m.shapes.includes(s));

// Ask only when the answer changes something: which module runs, or what it serves.
function shapeMatters(){
  const sets = Object.keys(SHAPES).map(s => eligible(s).map(m => m.id).sort().join("|"));
  if(new Set(sets).size > 1) return true;
  return Modules.some(m => m.usesShape);
}

// Random among eligible, never the same twice running when there's a choice.
function choose(s){
  const pool = eligible(s);
  if(pool.length <= 1) return pool[0] || null;
  const fresh = pool.filter(m => m.id !== (active && active.id));
  const list = fresh.length ? fresh : pool;
  const coldest = Math.min(...list.map(m => lastUsed[m.id] || 0));
  const cold = list.filter(m => (lastUsed[m.id] || 0) === coldest);
  return cold[Math.floor(Math.random() * cold.length)];
}

function railButton(label, onClick){
  const b = document.createElement("button");
  b.textContent = label;
  b.addEventListener("click", onClick);
  railEl.appendChild(b);
  return b;
}

function setRail(views){
  railEl.innerHTML = "";
  (views || []).forEach(v => railButton(v.label, () => v.open()));
}

async function setCount(){
  const s = active && active.summary ? await active.summary() : null;
  const tag = Store.ok ? "" : " &middot; session only";
  const text = s && s.count ? `<b>${s.count}</b> ${s.label}${tag}` : (Store.ok ? "" : "session only");

  // The button is the moment, not the module. The module name is redundant -
  // the card already says which one you're in - while the moment is invisible
  // state that drives routing and Ask's deck weighting. It renders whenever a
  // moment can change anything at all, so it never disappears out from under
  // you the way the old module switcher did.
  const label = (shape && SHAPES[shape]) ? SHAPES[shape].label : "New gap";

  countEl.innerHTML = shapeMatters()
    ? `<button id="shapeBtn" aria-label="Start a new gap">${label}${CARET}</button>${text ? ` &middot; ${text}` : ""}`
    : (text || "&nbsp;");

  const b = countEl.querySelector("#shapeBtn");
  if(b) b.addEventListener("click", renderShapePicker);
}

async function run(mod){
  if(active && active.unmount) active.unmount();
  active = mod;
  completed = false;
  picking = false;
  lastUsed[mod.id] = Date.now();
  await mod.mount({
    el: card,
    store: Store,
    shape,
    setRail,
    refresh: setCount,
    done: () => { completed = true; return setCount(); },
    again: () => run(mod)
  });
  await setCount();
}

function go(s){
  shape = s || null;
  if(shape){ lastShape = shape; Store.save(SHELL_KEY, { lastShape }); }
  const mod = choose(shape);
  if(mod) run(mod);
}

function renderShapePicker(){
  setRail([]);
  countEl.innerHTML = "&nbsp;";
  picking = true;
  completed = false;
  card.className = "card fade";

  // Switching activity is offered here, one level in, and only when more than
  // one module fits the moment you're already in. Rendering it against a
  // one-item list would be a question whose answer can't change the outcome.
  const canSwitch = active && shape && eligible(shape).length > 1;

  card.innerHTML = `<div class="picktitle">Where are you?</div>
    <div class="scroll">` +
    Object.entries(SHAPES).map(([k, v]) => `
      <button class="pick" data-shape="${k}" data-live="${lastShape === k ? 1 : 0}">
        ${v.label}<em>${v.hint}</em>
      </button>`).join("") +
    `</div>
    <div class="foot"><button class="skip" id="skipShape">Just ask me</button>${
      canSwitch ? `<button class="skip" id="otherMod">Something else</button>` : `<span></span>`
    }</div>`;

  card.querySelectorAll(".pick").forEach(b => b.addEventListener("click", () => go(b.dataset.shape)));
  card.querySelector("#skipShape").addEventListener("click", () => go(lastShape));
  const other = card.querySelector("#otherMod");
  if(other) other.addEventListener("click", renderModulePicker);
}

function renderModulePicker(){
  setRail([]);
  picking = true;
  const here = SHAPES[shape];
  const options = eligible(shape);
  card.className = "card fade";
  card.innerHTML = `<div class="picktitle">Instead of this${here ? ` &middot; ${here.label.toLowerCase()}` : ""}</div>
    <div class="scroll">` +
    options.map(m => `
      <button class="pick" data-id="${m.id}" data-live="${active && active.id === m.id ? 1 : 0}">
        ${m.name}${m.unit ? `<em>${m.unit}</em>` : ""}
      </button>`).join("") +
    `</div>
    <div class="foot"><button class="skip" id="backShape">Somewhere else</button><span></span></div>`;

  card.querySelectorAll(".pick").forEach(b => {
    b.addEventListener("click", () => {
      const mod = options.find(m => m.id === b.dataset.id);
      if(mod) run(mod);
    });
  });
  card.querySelector("#backShape").addEventListener("click", renderShapePicker);
}

/* ---- coming back to it ----

   An installed web app is frozen and restored, not reloaded. app.js never runs
   a second time, so without this you return to whatever screen you walked away
   from - in practice the confirmation card, with no way to start another gap.

   Reset only from a session the module said was finished, and only when
   nothing is typed. Mid-session state - puzzle three of five, a half-written
   answer - is never thrown away, however long you were gone. There's no
   elapsed-time threshold, so this stays a resume rule rather than a timer.

   The draft check is a backstop: a module may offer its own continuation
   without telling the shell, so a completed flag alone could still land on a
   half-typed answer. Nothing here can destroy input.
*/
function draftPending(){
  return Array.from(card.querySelectorAll("textarea, input"))
    .some(el => typeof el.value === "string" && el.value.trim() !== "");
}

function resumeFresh(){
  if(typeof document.visibilityState === "string" && document.visibilityState !== "visible") return;
  if(picking || !completed || draftPending()) return;
  if(shapeMatters()) return renderShapePicker();
  go(lastShape);
}

export async function start(){
  countEl = document.getElementById("count");
  railEl  = document.getElementById("railActions");
  card    = document.getElementById("card");

  card.innerHTML = "";
  if(!Modules.length){
    card.innerHTML = `<div class="empty">No modules are loaded yet.</div>`;
    return;
  }

  document.addEventListener("visibilitychange", resumeFresh);
  window.addEventListener("pageshow", e => { if(e && e.persisted) resumeFresh(); });

  const shell = await Store.load(SHELL_KEY);
  if(shell && shell.lastShape) lastShape = shell.lastShape;
  if(shapeMatters()) return renderShapePicker();
  await run(choose(null));
}

// Handy in the console: gaps.export() dumps everything as markdown.
export async function exportAll(){
  const parts = [];
  for(const m of Modules){
    if(!m.exportMarkdown) continue;
    if(!m.__loaded && m.load) await m.load(Store);
    const md = await m.exportMarkdown();
    if(md && md.trim()) parts.push(`# ${m.name}\n\n${md}`);
  }
  return parts.join("\n\n---\n\n");
}
