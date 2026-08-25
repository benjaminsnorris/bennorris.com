/* Lifted verbatim from the seeds course by src/extract_upstream.py.
   Do not edit here - edit the course and rebuild. */
var GLYPH = { k:'\u265A', q:'\u265B', r:'\u265C', b:'\u265D', n:'\u265E', p:'\u265F' };
function boardHTML(fen, o){
  o = o || {};
  var pips = o.pips || {}, counts = o.counts || {}, sel = o.sel || [],
      flip = !!o.flip, ring = o.ring;
  var ranks = fen.split(' ')[0].split('/'), grid = [], r, i, ch, n, f;
  for(r = 0; r < 8; r++){
    var row = [];
    for(i = 0; i < ranks[r].length; i++){
      ch = ranks[r].charAt(i); n = parseInt(ch, 10);
      if(!isNaN(n)){ while(n-- > 0) row.push(''); } else row.push(ch);
    }
    grid.push(row);
  }
  var html = '';
  for(var vr = 0; vr < 8; vr++){
    for(var vf = 0; vf < 8; vf++){
      r = flip ? 7 - vr : vr;
      f = flip ? 7 - vf : vf;
      var nm = 'abcdefgh'.charAt(f) + (8 - r);
      var cls = 'sq ' + (((r + f) % 2) ? 'd' : 'l');
      if(pips[nm]) cls += ' pip' + (pips[nm] === 'got' ? '' : ' pip-' + pips[nm]);
      if(sel.indexOf(nm) >= 0) cls += ' sel';
      if(ring === nm) cls += ' ring';
      var pc = grid[r][f], inner = '';
      if(pc){
        var w = pc === pc.toUpperCase();
        inner = '<span class="pc ' + (w ? 'w' : 'b') + '" data-t="' + pc.toLowerCase() + '">' +
                (GLYPH[pc.toLowerCase()] || '') + '\uFE0E</span>';
      }
      if(counts[nm]) inner += '<span class="n">' + counts[nm] + '</span>';
      html += (o.tappable
        ? '<button type="button" class="' + cls + '" data-sq="' + nm + '">' + inner + '</button>'
        : '<div class="' + cls + '" data-sq="' + nm + '">' + inner + '</div>');
    }
  }
  return html;
}

/* SVG line overlay for the board. Geometry mirrors boardHTML exactly: row 0 is
   rank 8, and flip reverses both axes. src/geometry.py holds an independent
   implementation of the same arithmetic and verify/test_overlay.mjs asserts the
   two agree, so a flip bug cannot ship quietly. */
function sqCentre(nm, flip){
  var f = 'abcdefgh'.indexOf(nm.charAt(0)), r = 8 - parseInt(nm.charAt(1), 10);
  var vr = flip ? 7 - r : r, vf = flip ? 7 - f : f;
  return [vf + 0.5, vr + 0.5];
}
/* lines: [{from, to, kind, mark}]  kind: pin|skewer|xray|battery
   `mark` names the square in the middle that the motif is about - the pinned
   piece, the front of a skewer - and gets a ring so the line is not the only
   thing saying which square matters. */
function overlaySVG(lines, flip){
  if(!lines || !lines.length) return '';
  var body = '';
  lines.forEach(function(L){
    var a = sqCentre(L.from, flip), b = sqCentre(L.to, flip);
    var co = ' x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '"';
    body += '<line class="halo"' + co + '/>';
    body += '<line class="ln ln-' + L.kind + '"' + co + '/>';
    if(L.mark){
      var m = sqCentre(L.mark, flip);
      body += '<circle class="dot dot-' + L.kind + '" cx="' + m[0] + '" cy="' + m[1] + '" r="0.3"/>';
    }
  });
  return '<svg class="ovl" viewBox="0 0 8 8" aria-hidden="true">' + body + '</svg>';
}

/* Entry rendering. One implementation, three surfaces: the per-term page, the
   two read-through pages, and the search index. `opts.readthrough` turns on the
   tier 2 extras (thread, extra blocks); `opts.compact` shortens the see-it
   banner for the reference surface. */
function esc(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
var TAUGHT_LABEL = {
  'board-vision:unit-1': 'board vision unit 1 (naming squares)',
  'board-vision:unit-2': 'board vision unit 2 (attack maps)',
  'board-vision:unit-3': 'board vision unit 3 (counting attackers)',
  'board-vision:unit-4': 'board vision unit 4 (loose pieces)',
  'board-vision:unit-5': 'board vision unit 5 (the final check)',
  'seeds:block-2': 'seeds block 2 (six seeds)',
  'seeds:block-3': 'seeds block 3 (all twelve)',
  'seeds:block-5': 'seeds block 5 (convergence)'
};
var TAUGHT_HREF = {
  'board-vision:unit-1': '/courses/board-vision-squares/',
  'board-vision:unit-2': '/courses/board-vision-attacks/',
  'board-vision:unit-3': '/courses/board-vision-counting/',
  'board-vision:unit-4': '/courses/board-vision-loose/',
  'board-vision:unit-5': '/courses/board-vision-check/',
  'seeds:block-2': '/courses/chess-seeds/',
  'seeds:block-3': '/courses/chess-seeds/',
  'seeds:block-5': '/courses/chess-seeds/'
};

/* Provenance chips, using the same classes and words the courses use, so a chip
   means the same thing on both sides of the sequence. A glossary is curation
   rather than measurement, and these are what stand in for the verification the
   courses get. */
var CHIP = {
  'sourced':        ['src',       'Sourced'],
  'inference':      ['infer',     'Inference'],
  'contested':      ['contested', 'Contested'],
  'single-study':   ['single',    'Single study'],
  'vendor-framing': ['vendor',    'Vendor framing']
};
function chips(list){
  if(!list || !list.length) return '';
  return '<p class="chips">' + list.map(function(c){
    var v = CHIP[c] || ['infer', c];
    return '<span class="chip ' + v[0] + '">' + esc(v[1]) + '</span>';
  }).join(' ') + '</p>';
}

function seeitBanner(e, compact){
  if(e.kind !== 'see-it') return '';
  var where = (e.taught || []).map(function(t){
    return '<a href="' + (TAUGHT_HREF[t] || '/courses/') + '">' + esc(TAUGHT_LABEL[t] || t) + '</a>';
  }).join(' and ');
  /* No article in front of the term: "a open file" and "a x-ray" are both
     waiting to happen, and an a/an rule would be a second thing to get wrong. */
  var body = where
    ? 'You have to be able to <em>see</em> this, and knowing the phrase is not the same ' +
      'thing. The sequence teaches it in ' + where + '. Read the definition, then go and ' +
      'drill it - a library of shapes handed over early produces pattern-matching, which ' +
      'is the habit the sequence exists to break.'
    /* Motifs: nothing in the sequence drills these, and that is deliberate rather
       than a gap. Saying so is more honest than pointing at a drill that does not
       exist. */
    : 'You have to be able to <em>see</em> this, and knowing the name is not the same ' +
      'thing. Nothing in the sequence drills it, on purpose: the courses withhold the ' +
      'names until after the final gate, because a library of shapes handed over early ' +
      'produces pattern-matching - which is the habit the sequence exists to break. ' +
      'Read it for the vocabulary, not as a shortcut.';
  return '<div class="seeit' + (compact ? ' compact' : '') + '">' +
    '<span class="lbl">Knowing this word is not the skill</span>' +
    '<p>' + body + '</p></div>';
}

function boardCell(b){
  var fen = b.render_fen || b.fen;
  /* show_fen prints the notation for the position actually drawn - render_fen,
     not the stored fen, so a board with `moves` shows the string for the picture
     rather than for the position two moves earlier. */
  /* `show_fen` is the flag that says this board's notation is part of the point,
     so it is also the right gate for a link into the editor: a link to a string
     the page has decided not to show would be clutter for the same reason the
     string itself would be. */
  var notation = b.show_fen
    ? '<p class="fenline"><span class="lbl">FEN</span>' + esc(fen) + '</p>' +
      '<a class="tofen" href="/glossary/board-editor/?fen=' + encodeURIComponent(fen) +
      '">Open in the board editor</a>' : '';
  return '<div class="boardcell">' +
    '<div class="board">' + boardHTML(fen, {flip: !!b.flip, sel: b.highlight_squares || []}) +
      overlaySVG(b.lines || [], !!b.flip) + '</div>' +
    notation +
    '<div class="boardcap">' + esc(b.caption) +
      (b.awkward ? '<span class="awk">awkward case</span>' : '') +
    '<div class="prov">' + esc(b.corpus) + ' &middot; ' + esc(b.ref) +
      (b.moves && b.moves.length ? ' &middot; after ' + esc(b.moves.join(' ')) : '') +
    '</div></div></div>';
}

function renderEntry(e, opts){
  opts = opts || {};
  var h = '<article class="entry" id="' + esc(e.slug) + '">';
  if(!opts.single) h += '<h2>' + esc(e.term) + '</h2>';
  var bits = ['tier ' + e.tier, e.kind];
  if((e.taught || []).length) bits.push('taught');
  else bits.push('untaught');
  h += '<p class="meta">' + bits.map(esc).join('<span class="sep">&middot;</span>') + '</p>';
  if(e.also && e.also.length) h += '<p class="also">also: ' + e.also.map(esc).join(', ') + '</p>';
  h += chips(e.chips);
  h += seeitBanner(e, !!opts.compact);
  h += '<p class="def">' + esc(e.definition) + '</p>';
  h += renderAnatomy(e);
  (e.precision || []).forEach(function(p){
    h += '<div class="precision"><h3>Against ' + esc(p.against) + '</h3><p>' +
      esc(p.text) + '</p></div>';
  });
  if(e.origin){
    h += '<div class="origin"><h3>Origin</h3>' + chips([e.origin.chip]) +
      '<p>' + esc(e.origin.text) + '</p>' +
      '<p class="prov">' + esc(e.origin.source) + '</p></div>';
  }
  var n = (e.boards || []).length;
  if(n){
    h += '<div class="boardrow ' + (n === 1 ? 'one' : n === 2 ? 'two' : 'three') + '">' +
      (e.boards || []).map(boardCell).join('') + '</div>';
  } else if(e.no_board){
    h += '<p class="noboard"><span class="lbl">No diagram</span>' + esc(e.no_board) + '</p>';
  }
  h += renderDrill(e);
  h += renderReading(e);
  return h + '</article>';
}

/* A notation breakdown: the string, then one row per field. The values are
   validated at build time to reassemble the sample exactly, so the table cannot
   disagree with the FEN above it. */
function renderAnatomy(e){
  if(!e.anatomy) return '';
  var rows = e.anatomy.parts.map(function(p){
    return '<tr><th>' + esc(p.field) + '</th>' +
      '<td class="v">' + esc(p.value) + '</td>' +
      '<td>' + esc(p.meaning) + '</td></tr>';
  }).join('');
  return '<div class="anatomy">' +
    '<p class="sample">' + esc(e.anatomy.sample) + '</p>' +
    '<div class="scroll"><table><tbody>' + rows + '</tbody></table></div></div>';
}

function renderReading(e){
  var also = (e.links_resolved || []).map(function(l){
    return '<a href="' + l.href + '">' + esc(l.label) + '</a>';
  });
  var out = (e.reading || []).map(function(r){
    return '<a href="' + r.url + '" rel="noopener">' + esc(r.title) + '</a>';
  });
  if(!also.length && !out.length) return '';
  var h = '<div class="seealso">';
  if(also.length) h += '<p><span class="lbl">See also</span>' + also.join(' &middot; ') + '</p>';
  if(out.length) h += '<p><span class="lbl">Elsewhere</span>' + out.join(' &middot; ') + '</p>';
  return h + '</div>';
}

function renderDrill(e){
  var d = e.drill || {};
  if(d.mode === 'computed'){
    /* A real drill: ten positions, answers generated by the predicate at build
       time, revealed one at a time. No gate and no stored progress - this is
       practice, not assessment. */
    return '<div class="drill" id="drill">' +
      '<h3>Practice</h3><p>' + esc(d.note) + '</p>' +
      '<div id="drillbody"></div>' +
      '<p class="prov">answer key generated by predicate ' + esc(d.predicate) +
      ' &middot; base rate ' + d.base_rate_pct + '% over ' + d.base_rate_n + ' ' +
      esc(d.corpus === 'drill' ? 'positions from the drill corpus'
                              : 'certified positions') + '</p></div>';
  }
  /* Hand-picked and none render as prose in a plainly different container, so
     they cannot be mistaken for the drill above. */
  var label = d.mode === 'hand-picked' ? 'Examples, not a drill' : 'No practice';
  return '<div class="nodrill"><h3>' + esc(label) + '</h3><p>' + esc(d.note) + '</p>' +
    '<p class="prov">' + esc(d.mode) + ' &middot; ' + esc(d.why) + '</p></div>';
}

/* ---------- the drill mechanic ---------- */
function wireDrill(e){
  var d = e.drill || {};
  if(d.mode !== 'computed' || !(d.items || []).length) return;
  var host = document.getElementById('drillbody');
  if(!host) return;
  var i = 0, right = 0, answered = false;

  function question(){
    var it = d.items[i];
    host.innerHTML =
      '<p class="dq"><span class="dn">' + (i + 1) + ' of ' + d.items.length + '</span>' +
        esc(d.question) + '</p>' +
      '<div class="board">' + boardHTML(it.fen, {flip: !!it.flip}) + '</div>' +
      '<div class="dbtns">' +
        '<button type="button" class="btn" data-yes="1">Yes</button>' +
        '<button type="button" class="btn" data-yes="0">No</button>' +
      '</div><div class="dverdict" id="dv"></div>';
    answered = false;
    [].forEach.call(host.querySelectorAll('[data-yes]'), function(b){
      b.addEventListener('click', function(){ answer(b.getAttribute('data-yes') === '1'); });
    });
  }

  function answer(said){
    if(answered) return;
    answered = true;
    var it = d.items[i], ok = (said === it.answer);
    if(ok) right++;
    document.getElementById('dv').innerHTML =
      '<p class="' + (ok ? 'good' : 'bad') + '">' + (ok ? 'Right' : 'Not this one') +
      ' &mdash; the answer is <strong>' + (it.answer ? 'yes' : 'no') + '</strong>.</p>' +
      '<button type="button" class="btn" id="dnext">' +
      (i + 1 < d.items.length ? 'Next position' : 'See how it went') + '</button>';
    document.getElementById('dnext').addEventListener('click', function(){
      i++;
      if(i < d.items.length) question(); else summary();
    });
  }

  function summary(){
    /* The number worth beating is what always giving the commoner answer would
       have scored on *this* set, not on the corpus - so it is counted from the
       items rather than from the base rate. The corpus rate is given separately,
       as context for how representative the set was. */
    var yes = d.items.filter(function(x){ return x.answer; }).length;
    var lazy = Math.max(yes, d.items.length - yes);
    host.innerHTML = '<p class="dsum"><strong>' + right + ' of ' + d.items.length +
      '</strong> right.</p><p>Always answering &ldquo;' + (yes >= d.items.length - yes ? 'yes' : 'no') +
      '&rdquo; would have scored ' + lazy + ' of ' + d.items.length +
      ', so that is the number worth beating. Across all ' + d.base_rate_n +
      (d.corpus === 'drill' ? ' positions in the drill corpus'
                            : ' positions in the certified corpus') +
      ' the answer is yes ' + d.base_rate_pct + '% of the time.</p>' +
      '<button type="button" class="btn" id="dagain">Again</button>';
    document.getElementById('dagain').addEventListener('click', function(){
      i = 0; right = 0; question();
    });
  }

  question();
}

/* ---------- tier framing, path navigation, and the read marker ----------

   One page per term. The tier a reader is on comes from the URL (?in=core), so
   the same document serves the reference visitor and both guided paths. Only the
   neighbours travel with the page, not the tier list.

   `thread` and `extra` are the course-specific framing. They render as a labelled
   section rather than mixed into the reference content, so a direct visitor can
   see where the definition ends and the course context begins. To hide them
   entirely from direct visits instead, gate this on `path` being set - that is
   the one-line switch. */
function renderFraming(e, opts){
  if(!e.thread && !(e.extra || []).length) return '';
  var h = '<section class="framing"' + (opts.path ? ' data-path="' + esc(opts.path) + '"' : '') + '>';
  h += '<h3>' + esc(e.home ? e.home.framing : 'In context') + '</h3>';
  if(e.thread) h += '<p class="thread">' + esc(e.thread) + '</p>';
  (e.extra || []).forEach(function(x){
    h += '<div class="extra"><h4>' + esc(x.heading) + '</h4><p>' + esc(x.body) + '</p></div>';
  });
  return h + '</section>';
}

function renderPathNav(e, path){
  var p = (e.paths || {})[path];
  if(!p){
    /* No path in the URL: not on a sequence, so offer the way in rather than
       pretending there is a previous and next. */
    var home = e.home;
    if(!home) return '';
    return '<nav class="pathnav offer"><p>This term is part of ' +
      '<a href="/glossary/' + esc(home.slug) + '/">' + esc(home.title.toLowerCase()) +
      '</a>, which is meant to be read in order.</p></nav>';
  }
  var link = function(side, item){
    if(!item) return '<span class="edge"></span>';
    return '<a class="' + side + '" href="/glossary/' + esc(item.slug) + '/?in=' + esc(path) + '">' +
      '<span class="dir">' + (side === 'prev' ? 'Previous' : 'Next') + '</span>' +
      esc(item.term) + '</a>';
  };
  return '<nav class="pathnav"><p class="where">' + esc(p.title) + ' &middot; ' +
    p.n + ' of ' + p.of + '</p>' + link('prev', p.prev) + link('next', p.next) + '</nav>';
}

/* ---------- read tracker ----------
   Per-viewer, in this browser only. The glossary is not a course, so this is a
   convenience rather than progress worth syncing; every access is guarded because
   storage throws outright in some contexts. */
var STORE = 'bsn.glossary.v1';
function readState(){
  try { return JSON.parse(localStorage.getItem(STORE) || '{}').read || {}; }
  catch(err){ return {}; }
}
function setRead(slug, on){
  try {
    var all = JSON.parse(localStorage.getItem(STORE) || '{}');
    all.read = all.read || {};
    if(on) all.read[slug] = 1; else delete all.read[slug];
    localStorage.setItem(STORE, JSON.stringify(all));
    return true;
  } catch(err){ return false; }
}
function renderReadMark(e){
  return '<div class="readmark"><button type="button" id="readbtn" class="btn"></button>' +
    '<span class="note" id="readnote"></span></div>';
}
function wireReadMark(slug){
  var btn = document.getElementById('readbtn'), note = document.getElementById('readnote');
  if(!btn) return;
  function draw(){
    var done = !!readState()[slug];
    btn.textContent = done ? 'Read ✓' : 'I have read this';
    btn.className = 'btn' + (done ? ' done' : '');
    note.textContent = done ? 'Marked as read. Click again to clear.'
                            : 'Marks it on the tier index. This browser only.';
  }
  btn.addEventListener('click', function(){
    if(!setRead(slug, !readState()[slug])){
      note.textContent = 'This browser is not storing site data, so it cannot be marked.';
      return;
    }
    draw();
  });
  draw();
}

/* Page boot. Each page carries only the data it needs and renders it here. */
function payload(){ return JSON.parse(document.getElementById('data').textContent); }
function param(name){
  var m = new RegExp('[?&]' + name + '=([^&]+)').exec(window.location.search);
  return m ? decodeURIComponent(m[1]) : null;
}

/* A term page. One URL per term; the tier path comes from ?in=. */
function renderOne(){
  var e = payload(), path = param('in');
  document.getElementById('out').innerHTML =
    renderEntry(e, {compact: true, single: true}) +
    renderFraming(e, {path: path}) +
    renderPathNav(e, path) +
    renderReadMark(e);
  wireDrill(e);
  wireReadMark(e.slug);
}

/* A tier index: the reasoning, then the terms, with what has been read. */
function renderTier(){
  var data = payload(), read = readState();
  var done = data.rows.filter(function(r){ return read[r.slug]; }).length;
  var h = '<div class="why">' + data.tier.why.map(function(p){
    return '<p>' + esc(p) + '</p>';
  }).join('') + '</div>';
  h += '<p class="progress"><strong>' + done + ' of ' + data.rows.length +
    '</strong> marked as read' +
    (done ? ' &middot; <button type="button" class="linkish" id="clear">clear</button>' : '') +
    '</p>';

  function row(r){
    return '<li' + (read[r.slug] ? ' class="read"' : '') + '>' +
      '<a href="/glossary/' + esc(r.slug) + '/?in=' + esc(data.tier.slug) + '">' +
        esc(r.term) + '</a>' +
      '<span class="k">' + esc(r.kind) + '</span>' +
      (read[r.slug] ? '<span class="tick" aria-label="read">✓</span>' : '') +
      '<span class="d">' + esc(r.blurb) + '</span></li>';
  }

  if(data.tier.grouped){
    data.groups.forEach(function(key){
      var g = data.groupmeta[key];
      var rows = data.rows.filter(function(r){ return r.group === key; });
      h += '<section class="grp"><h2>' + esc(g.title) + '</h2>' +
        '<p class="gi">' + esc(g.intro) + '</p><ul class="rows">' +
        rows.map(row).join('') + '</ul></section>';
    });
  } else {
    h += '<ul class="rows">' + data.rows.map(row).join('') + '</ul>';
  }
  document.getElementById('out').innerHTML = h;

  var clear = document.getElementById('clear');
  if(clear) clear.addEventListener('click', function(){
    data.rows.forEach(function(r){ setRead(r.slug, false); });
    renderTier();
  });
}

/* The base page: search across everything, including the precision notes.

   Grouped by category rather than one flat list, because the reader who needs a
   glossary most is the one who cannot name what they are looking for. A search
   filters within the groups and drops the ones it empties, so the headings never
   sit above nothing. */
function renderIndex(){
  var data = payload(), out = document.getElementById('out'), q = document.getElementById('q');
  function row(r){
    return '<li><a href="/glossary/' + r.slug + '/">' + esc(r.term) + '</a>' +
      '<span class="k">' + esc(r.kind) + '</span>' +
      '<span class="d">' + esc(r.definition) + '</span></li>';
  }
  function draw(){
    var needle = (q.value || '').trim().toLowerCase();
    var hits = data.rows.filter(function(r){ return !needle || r.h.indexOf(needle) >= 0; });
    var h = '<p class="count">' + hits.length + ' of ' + data.rows.length + '</p>';
    data.groups.forEach(function(g){
      var mine = hits.filter(function(r){ return r.group === g.key; });
      if(!mine.length) return;
      h += '<section class="grp"><h2>' + esc(g.title) + '</h2>' +
        (needle ? '' : '<p class="gi">' + esc(g.intro) + '</p>') +
        '<ul class="rows">' + mine.map(row).join('') + '</ul></section>';
    });
    out.innerHTML = h;
  }
  q.addEventListener('input', draw);
  draw();
}
