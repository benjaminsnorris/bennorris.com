/*
 * course-store.js — cloud-backed progress for self-contained course artifacts.
 *
 * Loaded as a deferred classic script in <head>, before anything the artifact
 * itself does:
 *
 *   <script src="/assets/js/course-store.js" defer data-course-slug="my-course"></script>
 *
 * What it does, and why:
 *
 * 1. Replaces window.localStorage for this page. The artifacts were generated
 *    against localStorage and already treat it as "the persistence layer", so
 *    swapping the implementation beats editing each artifact's logic.
 *
 * 2. Namespaces the real localStorage mirror per course. Every course shares
 *    the bennorris.com origin, so two courses both storing a key named
 *    "progress" would otherwise clobber each other.
 *
 * 3. Delays the artifact's own inline scripts until remote state has loaded.
 *    localStorage.getItem is synchronous and the network is not, so an artifact
 *    that reads its progress at init would otherwise always read stale local
 *    data. bin/publish-course retags inline scripts as type="text/course-
 *    deferred"; this file re-executes them in document order once hydrated.
 *
 * 4. Offers sign-in through a collapsible corner control, so the sync affordance
 *    costs a 36px dot rather than a permanent bar across the artifact.
 *
 * Fails open in every direction: no session, no network, or no supabase-js all
 * degrade to plain local-only progress rather than a broken page.
 */
(function () {
  'use strict';

  var SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  var SUPABASE_URL = 'https://haetugdidypkmgpmtyxj.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_FNtvYmVmouTVt0Cnh3cl3g_hbJBpwoN';
  var TABLE = 'course_state';
  var DEFERRED_TYPE = 'text/course-deferred';
  var FLUSH_DELAY_MS = 800;
  // supabase-js is fetched at runtime rather than via its own <script> tag: a
  // tag would stall the artifact behind an unreachable CDN (a blocking tag
  // holds up paint, and even a deferred one holds up DOMContentLoaded), which
  // defeats the point of failing open. With a timeout we lose sync but still
  // render.
  var CDN_TIMEOUT_MS = 4000;

  // Store-owned keys in the REAL localStorage. They deliberately do not use the
  // "cs:" prefix that namespaces mirrored course progress, so that wiping the
  // mirror (see adoptMirror) cannot take the session or the UI preference with
  // it, and so they are never mistaken for artifact state and synced upward.
  var AUTH_KEY = 'bn-course:auth'; // supabase-js session; shared by all courses
  var OWNER_KEY = 'bn-course:owner'; // user_id the local mirror belongs to
  var UI_KEY = 'bn-course:ui'; // 'open' | 'shut' — per-device panel preference

  var script = document.currentScript;
  var SLUG = (script && script.getAttribute('data-course-slug')) || 'unknown';
  var PREFIX = 'cs:' + SLUG + ':';

  // Real Storage methods, captured before we shadow the global. Everything the
  // store itself persists goes through these, never through the shim.
  var real = window.localStorage;
  var nativeGet = real.getItem.bind(real);
  var nativeSet = real.setItem.bind(real);
  var nativeRemove = real.removeItem.bind(real);

  var cache = Object.create(null); // logical key -> string value
  var dirty = Object.create(null); // logical key -> true | 'deleted'
  var client = null;
  var userId = null;
  var flushTimer = null;

  // ---------------------------------------------------------------------------
  // Local mirror
  // ---------------------------------------------------------------------------

  function loadLocalMirror() {
    for (var i = 0; i < real.length; i++) {
      var full = real.key(i);
      if (full && full.indexOf(PREFIX) === 0) {
        cache[full.slice(PREFIX.length)] = nativeGet(full);
      }
    }
  }

  function wipeLocalMirror() {
    // Every course's mirror, not just this one: the owner stamp is per device,
    // so a mismatch invalidates all of them at once.
    var doomed = [];
    for (var i = 0; i < real.length; i++) {
      var full = real.key(i);
      if (full && full.indexOf('cs:') === 0) doomed.push(full);
    }
    doomed.forEach(function (k) {
      try {
        nativeRemove(k);
      } catch (e) {}
    });
    cache = Object.create(null);
    dirty = Object.create(null);
  }

  function adoptMirror(uid) {
    // Decide whether the progress sitting in this browser belongs to the user
    // who just signed in.
    //
    // Unowned (nobody has signed in here yet) means it is anonymous progress
    // made before signing in, and hydrateFromCloud pushes it up. Owned by
    // somebody else means a second person is using this browser, and pushing it
    // up would silently graft one learner's progress onto another's account --
    // so it is discarded instead. It is not lost for its owner: it was synced
    // under their user_id and comes back when they sign in.
    var owner = nativeGet(OWNER_KEY);
    var foreign = !!owner && owner !== uid;
    if (foreign) wipeLocalMirror();
    try {
      nativeSet(OWNER_KEY, uid);
    } catch (e) {}
    return !foreign;
  }

  // ---------------------------------------------------------------------------
  // The localStorage stand-in handed to the artifact
  // ---------------------------------------------------------------------------

  var shim = {
    getItem: function (key) {
      var k = String(key);
      return k in cache ? cache[k] : null;
    },
    setItem: function (key, value) {
      var k = String(key);
      var v = String(value);
      cache[k] = v;
      try {
        nativeSet(PREFIX + k, v);
      } catch (e) {
        /* quota or private mode — cloud copy is still queued */
      }
      dirty[k] = true;
      scheduleFlush();
    },
    removeItem: function (key) {
      var k = String(key);
      delete cache[k];
      try {
        nativeRemove(PREFIX + k);
      } catch (e) {}
      dirty[k] = 'deleted';
      scheduleFlush();
    },
    clear: function () {
      Object.keys(cache).forEach(function (k) {
        shim.removeItem(k);
      });
    },
    key: function (n) {
      var keys = Object.keys(cache);
      return n >= 0 && n < keys.length ? keys[n] : null;
    }
  };

  Object.defineProperty(shim, 'length', {
    get: function () {
      return Object.keys(cache).length;
    }
  });

  function installShim() {
    try {
      Object.defineProperty(window, 'localStorage', {
        value: shim,
        configurable: true
      });
      return true;
    } catch (e) {
      // Older engines refuse to redefine the accessor. Fall back to patching
      // Storage.prototype, guarding on the receiver so sessionStorage keeps
      // its real behaviour.
      try {
        var proto = Storage.prototype;
        var origGet = proto.getItem;
        var origSet = proto.setItem;
        var origRemove = proto.removeItem;
        proto.getItem = function (k) {
          return this === real ? shim.getItem(k) : origGet.call(this, k);
        };
        proto.setItem = function (k, v) {
          return this === real ? shim.setItem(k, v) : origSet.call(this, k, v);
        };
        proto.removeItem = function (k) {
          return this === real ? shim.removeItem(k) : origRemove.call(this, k);
        };
        return true;
      } catch (e2) {
        return false;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Supabase
  // ---------------------------------------------------------------------------

  function loadSupabaseJs() {
    if (window.supabase && window.supabase.createClient) {
      return Promise.resolve(true);
    }
    return new Promise(function (resolve) {
      var settled = false;
      function done(ok) {
        if (!settled) {
          settled = true;
          resolve(ok);
        }
      }
      var tag = document.createElement('script');
      tag.src = SUPABASE_CDN;
      tag.async = true;
      tag.onload = function () {
        done(true);
      };
      tag.onerror = function () {
        done(false);
      };
      document.head.appendChild(tag);
      setTimeout(function () {
        done(false);
      }, CDN_TIMEOUT_MS);
    });
  }

  // supabase-js persists its session in globalThis.localStorage by default --
  // which, by the time the client is built, is the shim. That would file the
  // session under "cs:<slug>:sb-...-auth-token", giving every course a separate
  // login, and would queue the refresh token for upload into course_state as if
  // it were progress; hydrate would then hand another device's stale token back
  // and clobber the live session. Handing the client the real Storage keeps
  // credentials out of the synced namespace entirely, and one fixed key means
  // signing in on any course signs you in on all of them.
  var authStorage = {
    getItem: function (k) {
      try {
        return nativeGet(k);
      } catch (e) {
        return null;
      }
    },
    setItem: function (k, v) {
      try {
        nativeSet(k, v);
      } catch (e) {}
    },
    removeItem: function (k) {
      try {
        nativeRemove(k);
      } catch (e) {}
    }
  };

  function initClient() {
    if (!window.supabase || !window.supabase.createClient) return null;
    try {
      return window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
          storage: authStorage,
          storageKey: AUTH_KEY,
          persistSession: true,
          autoRefreshToken: true,
          // Sign-in is email + password, so there is never a token in the URL.
          // Leaving detection on would have supabase-js parse the hash and
          // rewrite history on every course page for nothing.
          detectSessionInUrl: false
        }
      });
    } catch (e) {
      return null;
    }
  }

  function hydrateFromCloud() {
    // Resolves once remote state (if any) has been merged into `cache`.
    if (!client) return Promise.resolve(false);

    return client.auth
      .getSession()
      .then(function (res) {
        var session = res && res.data && res.data.session;
        if (!session) return false;
        userId = session.user.id;
        ui.email = session.user.email || '';

        var keepLocal = adoptMirror(userId);

        return client
          .from(TABLE)
          .select('key,value')
          .eq('course_slug', SLUG)
          .then(function (r) {
            if (r.error) return false;
            var localOnly = Object.keys(cache);

            // Remote wins on conflict: it is the cross-device record, and we
            // keep no local timestamps to arbitrate with.
            (r.data || []).forEach(function (row) {
              cache[row.key] = row.value;
              try {
                nativeSet(PREFIX + row.key, row.value);
              } catch (e) {}
              var idx = localOnly.indexOf(row.key);
              if (idx !== -1) localOnly.splice(idx, 1);
            });

            // Progress made before signing in (or on another browser) is
            // pushed up rather than dropped -- unless adoptMirror judged it to
            // belong to a different account, in which case there is nothing
            // left to push.
            if (keepLocal) {
              localOnly.forEach(function (k) {
                dirty[k] = true;
              });
              if (localOnly.length) scheduleFlush();
            }
            return true;
          });
      })
      .catch(function () {
        return false;
      });
  }

  function scheduleFlush() {
    if (!client || !userId) return;
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, FLUSH_DELAY_MS);
  }

  function flush() {
    // Returns a promise so callers that must not race it -- the sign-in reload,
    // chiefly -- can wait for the write to land.
    flushTimer = null;
    if (!client || !userId) return Promise.resolve();

    var keys = Object.keys(dirty);
    if (!keys.length) return Promise.resolve();

    var upserts = [];
    var deletes = [];
    keys.forEach(function (k) {
      if (dirty[k] === 'deleted') {
        deletes.push(k);
      } else {
        upserts.push({
          user_id: userId,
          course_slug: SLUG,
          key: k,
          value: cache[k]
        });
      }
      delete dirty[k];
    });

    var jobs = [];

    if (upserts.length) {
      jobs.push(
        client
          .from(TABLE)
          .upsert(upserts, { onConflict: 'user_id,course_slug,key' })
          .then(function (r) {
            if (r.error) {
              // Re-arm so the next write retries this batch.
              upserts.forEach(function (row) {
                dirty[row.key] = true;
              });
            }
          })
      );
    }
    if (deletes.length) {
      jobs.push(
        client
          .from(TABLE)
          .delete()
          .eq('course_slug', SLUG)
          .in('key', deletes)
          .then(function (r) {
            if (r && r.error) {
              deletes.forEach(function (k) {
                dirty[k] = 'deleted';
              });
            }
          })
      );
    }

    return Promise.all(jobs).catch(function () {});
  }

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('pagehide', flush);

  // ---------------------------------------------------------------------------
  // Auth actions
  // ---------------------------------------------------------------------------

  function describeAuthError(err) {
    var msg = (err && err.message) || '';
    var name = (err && err.name) || '';
    if (/invalid login credentials/i.test(msg)) {
      return 'That email and password do not match.';
    }
    if (/email not confirmed/i.test(msg)) {
      return 'That account has not been confirmed yet.';
    }
    if (/rate|too many/i.test(msg)) {
      return 'Too many attempts. Try again in a minute.';
    }
    // A paused or missing project, an offline device and a blocked request all
    // surface as a failed fetch. Saying "cannot reach" beats echoing the raw
    // "Failed to fetch", which reads like a bug in the page.
    if (
      /AuthRetryableFetchError/.test(name) ||
      /fetch|network|load failed/i.test(msg)
    ) {
      return 'Cannot reach the sync server. Progress is still saved here.';
    }
    return msg || 'Sign-in failed.';
  }

  function signIn(email, password) {
    if (!client) {
      ui.error = 'Sync is unavailable on this page.';
      render();
      return;
    }
    ui.busy = true;
    ui.error = '';
    render();

    client.auth
      .signInWithPassword({ email: email, password: password })
      .then(function (r) {
        if (r.error) {
          ui.busy = false;
          ui.error = describeAuthError(r.error);
          render();
          return;
        }
        // Merge the cloud copy, push anything earned while signed out, then
        // reload. The artifact read its state at init and has been drawing from
        // it ever since; rewriting that state underneath a running artifact
        // would leave the page disagreeing with the store. A reload re-runs it
        // against the merged progress.
        return hydrateFromCloud()
          .then(flush)
          .then(function () {
            window.location.reload();
          });
      })
      .catch(function (e) {
        ui.busy = false;
        ui.error = describeAuthError(e);
        render();
      });
  }

  function signOut() {
    if (!client) return Promise.resolve();
    // The mirror is deliberately left in place: it is this user's own progress,
    // already synced, and keeping it means signing back in offline still shows
    // their work. adoptMirror is what stops it reaching anyone else's account.
    return client.auth.signOut().then(function () {
      window.location.reload();
    });
  }

  // ---------------------------------------------------------------------------
  // Deferred artifact scripts
  // ---------------------------------------------------------------------------

  var scriptsRan = false;

  function runDeferredScripts() {
    // Must happen exactly once, and must happen no matter what went wrong
    // upstream -- an artifact that never boots is worse than one without sync.
    if (scriptsRan) return;
    scriptsRan = true;

    var nodes = Array.prototype.slice.call(
      document.querySelectorAll('script[type="' + DEFERRED_TYPE + '"]')
    );

    nodes.forEach(function (old) {
      var fresh = document.createElement('script');
      for (var i = 0; i < old.attributes.length; i++) {
        var a = old.attributes[i];
        if (a.name === 'type') continue;
        fresh.setAttribute(a.name, a.value);
      }
      if (old.hasAttribute('data-course-module')) fresh.type = 'module';
      fresh.text = old.text;
      old.parentNode.replaceChild(fresh, old);
    });

    // The real DOMContentLoaded already fired, so listeners registered by the
    // scripts we just executed would never hear it. Re-dispatch synthetically;
    // code that instead checks document.readyState sees "complete" and runs
    // immediately, so both idioms are covered.
    try {
      document.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true }));
      window.dispatchEvent(new Event('load'));
    } catch (e) {}
  }

  // ---------------------------------------------------------------------------
  // The sync control
  // ---------------------------------------------------------------------------
  // Rendered into a shadow root so the artifact's own CSS cannot reach it and
  // it cannot reach the artifact's.
  //
  // Collapsed by default, to a dot whose colour carries the whole status: the
  // control is a background concern on a page whose real content is the course.
  // Expanded on click, and that choice is remembered per device.

  var ui = {
    state: 'local', // 'local' | 'synced' | 'offline'
    email: '',
    draftEmail: '',
    error: '',
    busy: false,
    open: false
  };

  function readOpen() {
    try {
      return nativeGet(UI_KEY) === 'open';
    } catch (e) {
      return false;
    }
  }

  function writeOpen(open) {
    try {
      nativeSet(UI_KEY, open ? 'open' : 'shut');
    } catch (e) {}
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[c];
    });
  }

  var CSS =
    ':host{position:fixed;right:calc(12px + env(safe-area-inset-right));' +
    'bottom:calc(12px + env(safe-area-inset-bottom));z-index:2147483647;' +
    'font:13px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;' +
    'color-scheme:dark}' +
    '*{box-sizing:border-box}' +
    '.dot{width:36px;height:36px;border-radius:50%;border:0;cursor:pointer;' +
    'display:grid;place-items:center;background:#1f2430;opacity:.5;' +
    'transition:opacity .15s ease,transform .15s ease;' +
    'box-shadow:0 2px 10px rgba(0,0,0,.25)}' +
    '.dot:hover,.dot:focus-visible{opacity:1;transform:scale(1.06)}' +
    '.dot:focus-visible{outline:2px solid #4c6ef5;outline-offset:2px}' +
    '.led{width:9px;height:9px;border-radius:50%;display:inline-block;' +
    'flex:0 0 auto}' +
    '.led[data-s="synced"]{background:#37b24d}' +
    '.led[data-s="local"]{background:#868e96}' +
    '.led[data-s="offline"]{background:#f08c00}' +
    '.panel{width:264px;background:#1f2430;color:#e6e8ee;border-radius:12px;' +
    'padding:12px;box-shadow:0 6px 24px rgba(0,0,0,.3)}' +
    '.head{display:flex;gap:8px;align-items:center}' +
    '.head .txt{flex:1 1 auto;min-width:0;overflow:hidden;' +
    'text-overflow:ellipsis;white-space:nowrap}' +
    '.shut{flex:0 0 auto;border:0;background:transparent;color:#e6e8ee;' +
    'opacity:.6;cursor:pointer;font-size:16px;line-height:1;padding:2px 4px;' +
    'border-radius:6px}' +
    '.shut:hover{opacity:1}' +
    'form{display:grid;gap:6px;margin:10px 0 0}' +
    'input{font:inherit;border:1px solid #39404f;border-radius:8px;' +
    'padding:7px 9px;background:#151922;color:#e6e8ee;width:100%}' +
    'input:focus{outline:2px solid #4c6ef5;outline-offset:-1px;' +
    'border-color:transparent}' +
    'button.go{font:inherit;cursor:pointer;border:0;border-radius:8px;' +
    'padding:7px 10px;background:#4c6ef5;color:#fff;font-weight:600}' +
    'button.go[disabled]{opacity:.6;cursor:default}' +
    'button.link{font:inherit;cursor:pointer;border:0;background:transparent;' +
    'color:#9aa4b8;text-decoration:underline;padding:0;margin-top:8px;' +
    'text-align:left}' +
    'button.link:hover{color:#e6e8ee}' +
    '.err{color:#ffa8a8;margin-top:8px}' +
    '.muted{opacity:.75}' +
    '@media (prefers-reduced-motion:reduce){.dot{transition:none}}';

  function labelFor() {
    if (ui.state === 'synced') return 'Synced &middot; ' + esc(ui.email);
    if (ui.state === 'offline') return 'Sync unavailable';
    return 'Saved on this device only';
  }

  function render() {
    var host = document.getElementById('course-store-badge');
    if (!host) {
      host = document.createElement('div');
      host.id = 'course-store-badge';
      document.body.appendChild(host);
    }
    var root = host.shadowRoot || host.attachShadow({ mode: 'open' });

    if (!ui.open) {
      root.innerHTML =
        '<style>' +
        CSS +
        '</style>' +
        '<button class="dot" id="open" aria-expanded="false" title="' +
        labelFor().replace(/&middot;/g, '-') +
        '" aria-label="Progress sync: ' +
        labelFor().replace(/&middot;/g, '-') +
        '">' +
        '<span class="led" data-s="' +
        ui.state +
        '"></span></button>';
      root.getElementById('open').addEventListener('click', function () {
        ui.open = true;
        writeOpen(true);
        render();
      });
      return;
    }

    var body;
    if (ui.state === 'synced') {
      body = '<button class="link" id="out">Sign out</button>';
    } else if (ui.state === 'offline') {
      body =
        '<div class="muted" style="margin-top:8px">Your progress is being ' +
        'kept in this browser.</div>';
    } else {
      body =
        '<form id="f">' +
        '<input id="e" type="email" required autocomplete="username" ' +
        'aria-label="Email" placeholder="you@example.com" value="' +
        esc(ui.draftEmail) +
        '" />' +
        '<input id="p" type="password" required ' +
        'autocomplete="current-password" aria-label="Password" ' +
        'placeholder="Password" />' +
        '<button class="go" type="submit"' +
        (ui.busy ? ' disabled' : '') +
        '>' +
        (ui.busy ? 'Signing in&hellip;' : 'Sign in to sync') +
        '</button>' +
        '</form>';
    }

    root.innerHTML =
      '<style>' +
      CSS +
      '</style>' +
      '<div class="panel" role="group" aria-label="Progress sync">' +
      '<div class="head"><span class="led" data-s="' +
      ui.state +
      '"></span>' +
      '<span class="txt muted">' +
      labelFor() +
      '</span>' +
      '<button class="shut" id="shut" aria-label="Collapse">&times;</button>' +
      '</div>' +
      body +
      (ui.error ? '<div class="err" role="alert">' + esc(ui.error) + '</div>' : '') +
      '</div>';

    root.getElementById('shut').addEventListener('click', function () {
      ui.open = false;
      ui.error = '';
      writeOpen(false);
      render();
    });

    var out = root.getElementById('out');
    if (out) out.addEventListener('click', signOut);

    var form = root.getElementById('f');
    if (form) {
      var emailInput = root.getElementById('e');
      // Survives the re-render that a failed attempt triggers.
      emailInput.addEventListener('input', function () {
        ui.draftEmail = emailInput.value;
      });
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        if (ui.busy) return;
        ui.draftEmail = emailInput.value;
        signIn(emailInput.value, root.getElementById('p').value);
      });
      if (ui.error) emailInput.focus();
    }
  }

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------

  loadLocalMirror();
  installShim();

  // Some artifacts are generated against the Claude Artifacts runtime storage
  // API and prefer window.storage over localStorage when it exists (e.g. the
  // psych-evals course). Providing it means those artifacts use their intended
  // seam rather than the localStorage fallback. Contract matches what they
  // expect: async, resolves to {key, value}, rejects when the key is absent.
  window.storage = {
    get: function (key) {
      var k = String(key);
      if (!(k in cache)) return Promise.reject(new Error('not found'));
      return Promise.resolve({ key: k, value: cache[k] });
    },
    set: function (key, value) {
      var k = String(key);
      var v = String(value);
      shim.setItem(k, v);
      return Promise.resolve({ key: k, value: v });
    },
    remove: function (key) {
      shim.removeItem(String(key));
      return Promise.resolve({ key: String(key) });
    }
  };

  window.CourseStore = {
    slug: SLUG,
    get: function (k) {
      return shim.getItem(k);
    },
    set: function (k, v) {
      return shim.setItem(k, v);
    },
    remove: function (k) {
      return shim.removeItem(k);
    },
    flush: flush,
    signIn: signIn,
    signOut: signOut
  };

  function boot() {
    ui.open = readOpen();

    // Hard backstop: whatever happens to the CDN, the client, or the network,
    // the artifact runs.
    var watchdog = setTimeout(runDeferredScripts, CDN_TIMEOUT_MS + 3000);

    loadSupabaseJs()
      .then(function () {
        client = initClient();
        return hydrateFromCloud();
      })
      .catch(function () {
        return false;
      })
      .then(function (signedIn) {
        clearTimeout(watchdog);
        runDeferredScripts();
        // No client at all means supabase-js never arrived, so there is nothing
        // a sign-in form could do. Say so rather than offering a dead form --
        // which is exactly how the old magic-link panel failed.
        ui.state = signedIn ? 'synced' : client ? 'local' : 'offline';
        render();
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
