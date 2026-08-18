/* Memorize - a passage in fragments, with escalating occlusion and spaced review.
   Seeds are public-domain scripture, verified against churchofjesuschrist.org. */

import { SHAPES } from "../shell/shell.js";

const SEEDS = await fetch(new URL("../data/memorize-seeds.json", import.meta.url)).then(r => r.json());

export const Memorize = (() => {
  const KEY = "memorize-state";
  const PER_SESSION = 3;
  const LEVELS = 5;                                  // 0 read .. 4 held
  const WAIT = [0, 6e5, 864e5, 2592e5, 6048e5];      // now, 10min, 1d, 3d, 7d

  let state = { passages: [] };
  let ctx = null;
  let queue = [];
  let done = 0;
  let revealed = false;
  let practising = false;            // true = work ahead of schedule, no advancement

  /* ---- fragmenting: clause-sized pieces, 4-14 words ---- */
  function fragment(text){
    const parts = text.replace(/\s+/g, " ").trim().split(/(?<=[,;:.!?—])\s+/);
    const out = [];
    for(const part of parts){
      const words = part.split(" ").length;
      const prev = out[out.length - 1];
      if(prev && prev.split(" ").length + words <= 14 && (words < 4 || prev.split(" ").length < 4)){
        out[out.length - 1] = prev + " " + part;
      }else{
        out.push(part);
      }
    }
    return out.map(t => ({ t, level: 0, due: 0 }));
  }

  function addPassage(title, ref, text){
    state.passages.push({
      id: "p" + Date.now().toString(36),
      title: title || ref || "Untitled",
      ref: ref || "",
      frags: fragment(text)
    });
  }

  /* ---- selection: due first, then least-known ---- */
  function build(){
    const now = Date.now();
    const all = [];
    state.passages.forEach((p, pi) => p.frags.forEach((f, fi) => all.push({ p, pi, fi, f })));
    const unfinished = all.filter(x => x.f.level < LEVELS - 1);
    const due = unfinished.filter(x => x.f.due <= now);
    const pool = (practising ? unfinished : due);
    pool.sort((a, b) => a.f.level - b.f.level || a.f.due - b.f.due);
    // keep a passage together so fragments arrive in order
    const first = pool[0];
    if(!first) return [];
    const same = pool.filter(x => x.p.id === first.p.id).sort((a, b) => a.fi - b.fi);
    return same.slice(0, PER_SESSION);
  }

  /* ---- rendering the fragment at its level ---- */
  const esc = s => s.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

  function occlude(text, level){
    if(level <= 0) return esc(text);
    if(level === 1){
      return text.split(" ").map(w => {
        const lead = w.match(/^[A-Za-z]/);
        return lead
          ? `${esc(w[0])}<span class="hint">${"·".repeat(Math.max(1, w.replace(/[^A-Za-z]/g, "").length - 1))}</span>${esc(w.replace(/[A-Za-z]/g, "").slice(-1) || "")}`
          : esc(w);
      }).join(" ");
    }
    if(level === 2){
      return text.split(" ").map((w, i) =>
        i % 2 ? `<span class="blank">${"—".repeat(Math.min(6, Math.max(2, w.length - 1)))}</span>` : esc(w)
      ).join(" ");
    }
    return `<span class="blank">${"—".repeat(3)}</span>`;
  }

  const PROMPT = ["Read it twice, out loud if you can.", "Fill in the words.",
                  "Fill in the gaps.", "Say the whole line.", ""];

  function renderCard(){
    const item = queue[done];
    const p = item.p, f = item.f;
    const before = item.fi > 0 ? p.frags[item.fi - 1].t : null;
    ctx.setRail([{ label: "Passages", open: renderMap }]);
    ctx.el.className = "card fade";
    ctx.el.innerHTML = `
      <div class="cue">${esc(p.ref || p.title)} &middot; line ${item.fi + 1} of ${p.frags.length}
        ${before ? `<br><b>…${esc(before.split(" ").slice(-4).join(" "))}</b>` : ""}
      </div>
      <p class="frag" id="frag">${revealed ? esc(f.t) : occlude(f.t, f.level)}</p>
      <div class="cue" style="padding:0">${revealed ? "" : PROMPT[f.level] || ""}</div>
      ${revealed ? `
        <div class="grades">
          <button class="ghostbtn" id="miss">Not yet</button>
          <button class="save" id="hit">Had it</button>
        </div>`
      : `<div class="foot"><span></span><button class="save" id="show">
          ${f.level === 0 ? "Got it" : "Show me"}</button></div>`}`;

    const show = ctx.el.querySelector("#show");
    if(show) show.addEventListener("click", () => {
      if(f.level === 0) return grade(true);          // level 0 is just reading
      revealed = true; renderCard();
    });
    const hit = ctx.el.querySelector("#hit");
    if(hit) hit.addEventListener("click", () => grade(true));
    const miss = ctx.el.querySelector("#miss");
    if(miss) miss.addEventListener("click", () => grade(false));
  }

  async function grade(ok){
    const f = queue[done].f;
    const now = Date.now();
    // Only advance if the wait was actually served. Practising early is fine,
    // but it shouldn't let cramming report a line as held - and it shouldn't
    // push the real review further away either.
    if(!ok){
      f.level = Math.max(0, f.level - 1);
      f.due = now + 6e5;
    }else if(now >= f.due){
      f.level = Math.min(LEVELS - 1, f.level + 1);
      f.due = now + WAIT[f.level];
    }
    revealed = false;
    done++;
    await ctx.store.save(KEY, state);
    ctx.done();
    if(done >= queue.length) return renderDone();
    renderCard();
  }

  const heldOf = p => p.frags.filter(f => f.level >= LEVELS - 1).length;

  function renderDone(){
    ctx.setRail([{ label: "Passages", open: renderMap }]);
    const p = queue[0].p;
    const held = heldOf(p), total = p.frags.length;
    ctx.el.className = "card fade";
    ctx.el.innerHTML = `
      <div class="done">
        <div class="mark">${ctx.store.ok ? "Saved" : "Kept for now"}</div>
        <div class="line">${held === total ? "You have the whole thing." : "Three lines, worked."}</div>
        <div class="sub">${esc(p.ref || p.title)}: ${held} of ${total} lines held.<br>
          ${ctx.store.ok ? "They'll come back around when they're due." : "This device won't store progress."}</div>
        <button class="again" id="again">A few more</button>
      </div>`;
    ctx.el.querySelector("#again").addEventListener("click", () => {
      queue = build(); done = 0; revealed = false;
      queue.length ? renderCard() : renderRest();
    });
  }

  function renderRest(){
    ctx.setRail([{ label: "Passages", open: renderMap }]);
    const next = state.passages.flatMap(p => p.frags)
      .filter(f => f.level < LEVELS - 1)
      .sort((a, b) => a.due - b.due)[0];
    const held = state.passages.reduce((n, p) => n + heldOf(p), 0);
    const total = state.passages.reduce((n, p) => n + p.frags.length, 0);
    const when = next ? Math.max(1, Math.round((next.due - Date.now()) / 36e5)) : 0;
    ctx.el.className = "card fade";
    ctx.el.innerHTML = `
      <div class="done">
        <div class="mark">Nothing due</div>
        <div class="line">${next ? "These are resting." : "You have all of it."}</div>
        <div class="sub">${held} of ${total} lines held.<br>
          ${next ? `Next review in about ${when} hour${when === 1 ? "" : "s"}.` : "Add a passage when you want more."}</div>
        ${next ? `<button class="again" id="anyway">Practise anyway</button>` : ""}
        <button class="again" id="addp">Add a passage</button>
      </div>`;
    const a = ctx.el.querySelector("#anyway");
    if(a) a.addEventListener("click", () => {
      practising = true;
      queue = build(); done = 0; revealed = false;
      queue.length ? renderCard() : renderMap();
    });
    ctx.el.querySelector("#addp").addEventListener("click", renderAdd);
  }

  /* ---- the trace ---- */
  function renderMap(){
    ctx.setRail([{ label: "Back", open: () => { queue.length ? renderCard() : renderMap(); } },
                 { label: "Add", open: renderAdd }]);
    ctx.el.className = "card fade";
    if(!state.passages.length){
      ctx.el.innerHTML = `<div class="empty">Nothing to memorize yet. Add a passage and it gets broken into lines.</div>`;
      return;
    }
    const rows = state.passages.map(p => `
      <div class="maprow">
        <div class="maptitle"><span>${esc(p.ref || p.title)}</span><span>${heldOf(p)}/${p.frags.length}</span></div>
        <div class="bars">${p.frags.map(f => `<i data-l="${f.level}"></i>`).join("")}</div>
        <div class="maptext">${esc(p.frags.map(f => f.level >= LEVELS - 1 ? f.t : "…").join(" "))}</div>
      </div>`).join("");
    ctx.el.innerHTML = `<div class="scroll">${rows}</div>`;
  }

  function renderAdd(){
    ctx.setRail([{ label: "Back", open: renderMap }]);
    ctx.el.className = "card fade";
    ctx.el.innerHTML = `
      <div class="picktitle">Add a passage</div>
      <input id="ref" placeholder="Reference, e.g. Mosiah 2:17"
        style="width:100%;border:0;border-bottom:1px solid var(--line);background:none;padding:12px 0;
               font-family:var(--serif);font-size:19px;color:var(--ink);outline:none" />
      <textarea id="body" placeholder="Paste the text." rows="4"></textarea>
      <div class="foot"><span></span><button class="save" id="save" disabled>Add</button></div>`;
    const ref = ctx.el.querySelector("#ref");
    const body = ctx.el.querySelector("#body");
    const save = ctx.el.querySelector("#save");
    const check = () => { save.disabled = !body.value.trim(); };
    body.addEventListener("input", check);
    save.addEventListener("click", async () => {
      addPassage(ref.value.trim(), ref.value.trim(), body.value.trim());
      await ctx.store.save(KEY, state);
      ctx.done();
      queue = build(); done = 0; revealed = false;
      queue.length ? renderCard() : renderRest();
    });
  }

  return {
    id: "memorize",
    name: "Memorize",
    shapes: ["screen", "walking", "scrap"],
    arousal: "neutral",
    unit: "three lines",
    usesShape: false,
    needs: { screen: true, hands: "free", private: false },
    async mount(c){
      ctx = c;
      const saved = await ctx.store.load(KEY);
      if(saved && saved.passages && saved.passages.length) state = saved;
      else { state = { passages: [] }; SEEDS.forEach(s => addPassage(s.title, s.ref, s.text)); }
      practising = false;
      queue = build(); done = 0; revealed = false;
      queue.length ? renderCard() : renderRest();
    },
    unmount(){ ctx = null; },
    summary(){
      const held = state.passages.reduce((n, p) => n + heldOf(p), 0);
      return { count: held, label: held === 1 ? "line held" : "lines held" };
    },
    exportMarkdown(){
      return state.passages.map(p =>
        `## ${p.ref || p.title}\n\n${p.frags.map(f => f.t).join(" ")}\n\n*${heldOf(p)} of ${p.frags.length} lines held*\n`
      ).join("\n");
    }
  };
})();
