/*
 * course-store.js — cloud-backed progress for self-contained course artifacts.
 *
 * Loaded as a blocking classic script in <head>, after the supabase-js UMD
 * bundle and before anything the artifact itself does:
 *
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *   <script src="/assets/js/course-store.js" data-course-slug="my-course"></script>
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

  var script = document.currentScript;
  var SLUG = (script && script.getAttribute('data-course-slug')) || 'unknown';
  var PREFIX = 'cs:' + SLUG + ':';

  // Real Storage methods, captured before we shadow the global.
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

  function initClient() {
    if (!window.supabase || !window.supabase.createClient) return null;
    try {
      return window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    } catch (e) {
      return null;
    }
  }

  function hydrateFromCloud() {
    // Resolves once remote state (if any) has been merged into `cache`.
    if (!client) return Promise.resolve(false);

    return client.auth
      .getSession() // also completes the magic-link URL exchange
      .then(function (res) {
        var session = res && res.data && res.data.session;
        if (!session) return false;
        userId = session.user.id;

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
            // pushed up rather than dropped.
            localOnly.forEach(function (k) {
              dirty[k] = true;
            });
            if (localOnly.length) scheduleFlush();
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
    flushTimer = null;
    if (!client || !userId) return;

    var keys = Object.keys(dirty);
    if (!keys.length) return;

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

    if (upserts.length) {
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
        });
    }
    if (deletes.length) {
      client
        .from(TABLE)
        .delete()
        .eq('course_slug', SLUG)
        .in('key', deletes);
    }
  }

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('pagehide', flush);

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
  // "Sync off" badge
  // ---------------------------------------------------------------------------
  // Rendered into a shadow root so the artifact's own CSS cannot reach it and
  // it cannot reach the artifact's.

  function renderBadge(state, email) {
    var host = document.getElementById('course-store-badge');
    if (!host) {
      host = document.createElement('div');
      host.id = 'course-store-badge';
      document.body.appendChild(host);
    }
    var root = host.shadowRoot || host.attachShadow({ mode: 'open' });

    var label =
      state === 'synced'
        ? 'Synced &middot; ' + email
        : state === 'sent'
          ? 'Check your email for a sign-in link'
          : state === 'denied'
            ? 'That email is not on the invite list'
            : 'Progress saved on this device only';

    root.innerHTML =
      '<style>' +
      ':host{position:fixed;right:16px;bottom:16px;z-index:2147483647;' +
      'font:13px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}' +
      '.box{display:flex;gap:8px;align-items:center;background:#1f2430;' +
      'color:#e6e8ee;padding:8px 12px;border-radius:999px;' +
      'box-shadow:0 2px 10px rgba(0,0,0,.25)}' +
      'button{font:inherit;cursor:pointer;border:0;border-radius:999px;' +
      'padding:4px 10px;background:#4c6ef5;color:#fff}' +
      'input{font:inherit;border:0;border-radius:999px;padding:4px 10px;' +
      'width:180px}' +
      '.muted{opacity:.75}' +
      '</style>' +
      '<div class="box"><span class="muted">' +
      label +
      '</span>' +
      (state === 'synced' || state === 'sent'
        ? ''
        : '<form id="f"><input id="e" type="email" required ' +
          'placeholder="you@example.com" /><button>Sync</button></form>') +
      '</div>';

    var form = root.getElementById && root.getElementById('f');
    if (form) {
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var email = root.getElementById('e').value;
        if (!client) return;
        client.auth
          .signInWithOtp({
            email: email,
            options: {
              // Public signup is disabled on the project; cohort members are
              // invited from the Supabase dashboard. Being explicit turns a
              // confusing signup error into a clear "not invited".
              shouldCreateUser: false,
              emailRedirectTo: window.location.href
            }
          })
          .then(function (r) {
            renderBadge(r.error ? 'denied' : 'sent');
          });
      });
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
    signOut: function () {
      return client ? client.auth.signOut() : Promise.resolve();
    }
  };

  function boot() {
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
        if (signedIn && client) {
          client.auth.getUser().then(function (r) {
            var u = r && r.data && r.data.user;
            renderBadge('synced', u ? u.email : '');
          });
        } else {
          renderBadge('local');
        }
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
