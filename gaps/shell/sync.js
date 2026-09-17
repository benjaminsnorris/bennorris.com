/* Sync.
   An optional remote tier for Store, on the same account as the courses.

   This deliberately does NOT use /assets/js/course-store.js, which is how the
   courses sync. That file works by shadowing window.localStorage and mirroring
   every key to Supabase one at a time, holding any divergence aside for the
   learner to pick a side. Two reasons it is the wrong tool here:

     1. Gaps already has merge.js, which reconciles two devices semantically --
        earlier due dates win, the chess window comes from whichever device
        worked the square more recently, the log is a deduped union. Per-key
        "which copy do you want?" would throw all of that away, and "which
        version of your log?" is not a question anyone can answer.
     2. The shim exists because an artifact reads localStorage synchronously at
        init, so course-store has to load remote state before the artifact runs
        -- which is why bin/publish-course retags inline scripts as deferred.
        Store here is already async, so there is nothing to defer and nothing
        to shadow.

   What IS shared is the account. The session lives under the same fixed
   localStorage key as the courses, so signing in on either signs you in on
   both, and it is the same Supabase project and the same course_state table.
   The slug is "gaps", which needs no migration: course_state is deliberately
   schemaless in the shape of a course's progress.

   Everything fails open. No network, no CDN, no session, or a refused row and
   Gaps is exactly the local-only app it was before -- which matters more here
   than on a course page, because this one is used in the places with no signal.
*/

const SUPABASE_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
const SUPABASE_URL = "https://haetugdidypkmgpmtyxj.supabase.co";
const SUPABASE_KEY = "sb_publishable_FNtvYmVmouTVt0Cnh3cl3g_hbJBpwoN";
const TABLE = "course_state";
const SLUG = "gaps";

/* The courses' session key, verbatim. One fixed key across every page on the
   site is what makes this "the same login" rather than a second account that
   happens to share a password. */
const AUTH_KEY = "bn-course:auth";

/* A blocking wait on a CDN is the one thing this app cannot afford: it is used
   in the gaps with the worst signal, and the service worker is cache-first for
   the same reason. Past this, sync simply does not happen this session. */
const CDN_TIMEOUT_MS = 4000;

let client = null;
let loading = null;
let user = null;

function localWorks(){
  try{
    localStorage.setItem("gaps:__auth-probe", "1");
    localStorage.removeItem("gaps:__auth-probe");
    return true;
  }catch(e){ return false; }
}

/* Private browsing has no durable storage, so a session could not survive the
   tab anyway. Better to not offer sign-in than to offer one that forgets. */
export const canSync = localWorks();

function loadSupabaseJs(){
  if(window.supabase && window.supabase.createClient) return Promise.resolve(true);
  if(loading) return loading;
  loading = new Promise(resolve => {
    let settled = false;
    const done = ok => { if(!settled){ settled = true; resolve(ok); } };
    const tag = document.createElement("script");
    tag.src = SUPABASE_CDN;
    tag.async = true;
    tag.onload = () => done(true);
    tag.onerror = () => done(false);
    document.head.appendChild(tag);
    setTimeout(() => done(false), CDN_TIMEOUT_MS);
  });
  return loading;
}

function build(){
  if(client) return client;
  if(!window.supabase || !window.supabase.createClient) return null;
  try{
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        storageKey: AUTH_KEY,
        persistSession: true,
        autoRefreshToken: true,
        // Sign-in is email + password, so a token never arrives in the URL.
        detectSessionInUrl: false
      }
    });
  }catch(e){ client = null; }
  return client;
}

/* Resolves to { email } when there is a live session, else null. Safe to call
   as often as you like; the client is built once. */
export async function init(){
  if(!canSync) return null;
  if(!(await loadSupabaseJs())) return null;
  const c = build();
  if(!c) return null;
  try{
    const { data } = await c.auth.getSession();
    const session = data && data.session;
    user = session ? { id: session.user.id, email: session.user.email || "" } : null;
    return user;
  }catch(e){
    user = null;
    return null;
  }
}

export function current(){ return user; }

export async function signIn(email, password){
  if(!canSync) return { error: "This device won't keep you signed in." };
  if(!(await loadSupabaseJs())) return { error: "Couldn't reach the sign-in service." };
  const c = build();
  if(!c) return { error: "Couldn't reach the sign-in service." };
  try{
    const { data, error } = await c.auth.signInWithPassword({ email, password });
    if(error) return { error: describe(error) };
    user = { id: data.user.id, email: data.user.email || "" };
    return { user };
  }catch(e){ return { error: describe(e) }; }
}

export async function signOut(){
  // Local state is deliberately left alone: it is this person's own progress,
  // already pushed, and keeping it means the app still works signed out.
  if(!client) { user = null; return; }
  try{ await client.auth.signOut(); }catch(e){}
  user = null;
}

function describe(err){
  const m = (err && err.message) || "";
  if(/Invalid login/i.test(m)) return "That email and password don't match.";
  if(/Email not confirmed/i.test(m)) return "That account isn't confirmed yet.";
  if(/network|fetch/i.test(m)) return "No connection.";
  return m || "Sign-in failed.";
}

/* Every row this account holds for Gaps, as { key: value } with values parsed
   back into the shapes Store.dump() produces. Null means "could not read" --
   which is not the same as "nothing there", and must never be merged as if it
   were an empty remote. */
export async function pull(){
  if(!client || !user) return null;
  try{
    const { data, error } = await client
      .from(TABLE)
      .select("key,value")
      .eq("user_id", user.id)
      .eq("course_slug", SLUG);
    if(error) return null;
    const out = {};
    for(const row of data || []){
      try{ out[row.key] = JSON.parse(row.value); }
      catch(e){ /* a row we can't parse is one we leave alone */ }
    }
    return out;
  }catch(e){ return null; }
}

/* Upsert only the keys given. Callers pass just what changed, because the log
   can run to LOG_CAP events and re-sending it on every sync would dominate the
   request for no reason. */
export async function push(data){
  if(!client || !user) return false;
  const rows = Object.entries(data || {}).map(([key, value]) => ({
    user_id: user.id,
    course_slug: SLUG,
    key,
    value: JSON.stringify(value)
  }));
  if(!rows.length) return true;
  try{
    const { error } = await client
      .from(TABLE)
      .upsert(rows, { onConflict: "user_id,course_slug,key" });
    return !error;
  }catch(e){ return false; }
}
