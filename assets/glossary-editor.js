/* ---------- the board editor ----------

   One field, both directions. The FEN box is the input *and* the output: type in
   it and the board redraws, move a piece and it rewrites itself. There is no Load
   button on purpose - a button would imply the string and the picture can
   disagree, and the whole value of the page is that they cannot.

   Built here rather than lifted: extract_upstream.py lifts the design tokens and
   boardHTML from seeds, and an editor is a new component, so building it locally
   creates no palette drift and keeps seeds' byte-identical rebuild intact. Same
   reasoning as the overlay.

   What is fatal and what is a note follows from one fact: only the first of the
   six fields says where the pieces are. So a problem in field one is refused -
   there is nothing to draw - and a problem in any of the other five is reported
   and read anyway. That is also why pasting a bare placement string works, which
   is the commonest thing anyone actually has in hand.

   Tap to place, and the choice latches: pick the white pawn once and every tap
   after it puts a pawn down. Lichess's editor is built this way (its `selected`
   is 'pointer' | 'trash' | a piece) and it is the difference between placing
   eight pawns and walking back to the tray eight times. Drag is not implemented
   at all - the courses' boards are tapped, so tapping is the gesture this
   sequence already taught, and it is the one that survives a phone. */

var ED_START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
var ED_FILES = 'abcdefgh';
var ED_TRAY = ['k', 'q', 'r', 'b', 'n', 'p'];
var ED_WORD = { k:'king', q:'queen', r:'rook', b:'bishop', n:'knight', p:'pawn' };
var ED_RIGHTS = ['K', 'Q', 'k', 'q'];
/* what each castling right needs on the board: [king square, rook square] */
var ED_HOME = { K:['e1','h1'], Q:['e1','a1'], k:['e8','h8'], q:['e8','a8'] };
var ED_RIGHT_WORD = { K:'White kingside', Q:'White queenside',
                      k:'Black kingside', q:'Black queenside' };

function edSquare(file, row){ return ED_FILES.charAt(file) + (8 - row); }
function edWhite(pc){ return pc === pc.toUpperCase(); }
function edWords(pc){
  return (edWhite(pc) ? 'white ' : 'black ') + ED_WORD[pc.toLowerCase()];
}
function edQuote(s){ return '"' + s + '"'; }
function edUniq(s){
  var out = [], i;
  for(i = 0; i < s.length; i++) if(out.indexOf(s.charAt(i)) < 0) out.push(s.charAt(i));
  return out;
}
function edList(items){
  if(items.length < 2) return items[0] || '';
  return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
}
function edPlural(n, one, many){ return n === 1 ? one : many; }

/* ---------- reading ---------- */

/* Field one -> {square: piece}, or null with the reason in out.errors. */
function edReadPlacement(placement, out){
  var ranks = placement.split('/'), pos = {}, row, i;
  if(ranks.length !== 8){
    out.errors.push('Field one has ' + ranks.length + ' ' +
      edPlural(ranks.length, 'rank', 'ranks') + ', and a placement has eight, ' +
      'separated by slashes.');
    return null;
  }
  for(row = 0; row < 8; row++){
    var text = ranks[row], rank = 8 - row;
    var bad = text.replace(/[1-8kqrbnpKQRBNP]/g, '');
    if(bad){
      out.errors.push('Rank ' + rank + ' uses ' + edList(edUniq(bad).map(edQuote)) +
        ', which FEN does not: pieces are K Q R B N P for White and k q r b n p ' +
        'for Black, and a digit 1 to 8 is that many empty squares in a row.');
      continue;
    }
    var n = 0;
    for(i = 0; i < text.length; i++){
      var ch = text.charAt(i);
      if(ch >= '1' && ch <= '8'){ n += +ch; continue; }
      if(n < 8) pos[edSquare(n, row)] = ch;
      n += 1;
    }
    if(n !== 8){
      out.errors.push('Rank ' + rank + ' adds up to ' + n + ' ' +
        edPlural(n, 'square', 'squares') + ', and every rank must add up to exactly eight.');
      continue;
    }
    /* Two digits in a row is unambiguous but not canonical, so it is read and
       said rather than refused. python-chess refuses it; being stricter than the
       thing you are teaching is not a service. */
    if(/[1-8][1-8]/.test(text))
      out.notes.push('Rank ' + rank + ' writes two digits in a row (' + text +
        '). That is unambiguous, so it is read - but the canonical form adds them ' +
        'up into a single digit.');
  }
  return out.errors.length ? null : pos;
}

function edReadCastling(field, st, out){
  if(field === '-') return;
  var i, ch, dropped = '';
  for(i = 0; i < field.length; i++){
    ch = field.charAt(i);
    if(ED_RIGHTS.indexOf(ch) >= 0) st.castle[ch] = true;
    else dropped += ch;
  }
  if(!dropped) return;
  var which = edList(edUniq(dropped).map(edQuote));
  if(/^[A-Ha-h]+$/.test(dropped))
    out.notes.push('Field three says "' + field + '". Naming the rook\'s file instead ' +
      'of a side is the Shredder convention, which exists for Chess960 castling; this ' +
      'page reads K Q k q only, so ' + which + ' ' +
      edPlural(edUniq(dropped).length, 'was', 'were') + ' dropped.');
  else
    out.notes.push('Field three says "' + field + '", and castling rights are some of ' +
      'K Q k q, or - for none, so ' + which + ' ' +
      edPlural(edUniq(dropped).length, 'was', 'were') + ' ignored.');
}

/* A FEN, or as much of one as there is, into editor state. */
function edParse(text){
  var out = { errors: [], notes: [], state: null };
  var s = String(text === null || text === undefined ? '' : text).replace(/\s+/g, ' ').trim();
  if(!s){
    out.errors.push('Nothing to read. Paste a FEN, or place pieces on the board and ' +
      'read one back.');
    return out;
  }
  var fields = s.split(' ');
  var pos = edReadPlacement(fields[0], out);
  if(!pos) return out;
  var st = { pos: pos, turn: 'w', castle: { K:false, Q:false, k:false, q:false },
             ep: '-', half: '0', full: '1' };

  if(fields.length < 6)
    out.notes.push('This is ' + (fields.length === 1 ? 'the placement field on its own'
      : fields.length + ' of the six fields') + '. Where the pieces are is all of field ' +
      'one, so the board draws; the rest read as White to move, no castling rights, no ' +
      'en passant square, and the counters at 0 and 1.');
  if(fields.length > 6)
    out.notes.push('More than six fields. Everything after the sixth is ignored.');

  if(fields[1] !== undefined){
    if(fields[1] === 'w' || fields[1] === 'b') st.turn = fields[1];
    else out.notes.push('Field two says "' + fields[1] + '", and side to move is w or b. ' +
      'Read as White to move.');
  }
  if(fields[2] !== undefined) edReadCastling(fields[2], st, out);
  if(fields[3] !== undefined){
    if(fields[3] === '-' || /^[a-h][1-8]$/.test(fields[3])) st.ep = fields[3];
    else out.notes.push('Field four says "' + fields[3] + '", and an en passant square is ' +
      'a square name or - for none. Read as -.');
  }
  [['half', 'halfmove clock'], ['full', 'fullmove number']].forEach(function(pair, i){
    var v = fields[4 + i];
    if(v === undefined) return;
    if(/^\d+$/.test(v)) st[pair[0]] = String(+v);
    else out.notes.push('Field ' + (5 + i) + ' says "' + v + '", and the ' + pair[1] +
      ' is a whole number. Read as ' + st[pair[0]] + '.');
  });
  out.state = st;
  return out;
}

/* ---------- writing ---------- */

function edPlacement(pos){
  var ranks = [], row, f, run, line, pc;
  for(row = 0; row < 8; row++){
    line = ''; run = 0;
    for(f = 0; f < 8; f++){
      pc = pos[edSquare(f, row)];
      if(!pc){ run += 1; continue; }
      if(run){ line += run; run = 0; }
      line += pc;
    }
    if(run) line += run;
    ranks.push(line);
  }
  return ranks.join('/');
}

function edCastleField(castle){
  var out = ED_RIGHTS.filter(function(r){ return castle[r]; }).join('');
  return out || '-';
}

function edFen(st){
  return edPlacement(st.pos) + ' ' + st.turn + ' ' + edCastleField(st.castle) + ' ' +
    st.ep + ' ' + st.half + ' ' + st.full;
}

/* ---------- what the position itself says ----------

   These are recomputed after every edit, because the board can be made to say
   any of them at any time. String notes cannot survive an edit - after one, the
   string is ours and canonical by construction. */

function edRightAvailable(pos, right){
  var home = ED_HOME[right];
  var king = edWhite(right) ? 'K' : 'k', rook = edWhite(right) ? 'R' : 'r';
  return pos[home[0]] === king && pos[home[1]] === rook;
}

/* The pawn whose double push an en passant square implies, and where it stands. */
function edEpPawn(ep){
  if(!/^[a-h][36]$/.test(ep)) return null;
  var file = ep.charAt(0), rank = +ep.charAt(1);
  return { square: file + (rank === 3 ? 4 : 5), piece: rank === 3 ? 'P' : 'p',
           mover: rank === 3 ? 'w' : 'b', taker: rank === 3 ? 'p' : 'P',
           beside: rank === 3 ? 4 : 5 };
}

function edEpNotes(st){
  if(st.ep === '-') return [];
  var notes = [], want = edEpPawn(st.ep);
  if(!want) return ['Field four says ' + st.ep + ', and an en passant square is always on ' +
    'rank 3 or rank 6 - it is the square a pawn skipped over on its first move.'];
  if(st.pos[want.square] !== want.piece)
    notes.push('Field four names ' + st.ep + ', which says a ' +
      (want.mover === 'w' ? 'white' : 'black') + ' pawn has just come to ' + want.square +
      ' - and there is no such pawn there.');
  if((want.mover === 'w') === (st.turn === 'w'))
    notes.push('Field four names ' + st.ep + ', a square only ' +
      (want.mover === 'w' ? 'Black' : 'White') + ' could capture on, but field two says ' +
      (st.turn === 'w' ? 'White' : 'Black') + ' to move.');
  if(notes.length) return notes;

  var f = ED_FILES.indexOf(st.ep.charAt(0)), beside = [];
  if(f > 0) beside.push(ED_FILES.charAt(f - 1) + want.beside);
  if(f < 7) beside.push(ED_FILES.charAt(f + 1) + want.beside);
  var can = beside.filter(function(sq){ return st.pos[sq] === want.taker; });
  if(!can.length)
    notes.push('No en passant capture is actually available on ' + st.ep + ': there is no ' +
      (want.taker === 'P' ? 'white' : 'black') + ' pawn on ' + edList(beside) +
      ' to make it. The original specification records the skipped square anyway and the ' +
      'later revision writes - instead, so both strings are in the wild. Kept as given.');
  return notes;
}

function edPosNotes(st){
  var notes = [], counts = {}, squares = Object.keys(st.pos), i, pc;
  var side = { w: 0, b: 0 };
  for(i = 0; i < squares.length; i++){
    pc = st.pos[squares[i]];
    counts[pc] = (counts[pc] || 0) + 1;
    side[edWhite(pc) ? 'w' : 'b'] += 1;
  }
  var n = function(c){ return counts[c] || 0; };

  /* An empty board is a legitimate place to start building from, so it is not
     told off for having no kings. */
  if(squares.length) [['K', 'White'], ['k', 'Black']].forEach(function(pair){
    if(!n(pair[0]))
      notes.push('There is no ' + pair[1].toLowerCase() + ' king on the board.');
    else if(n(pair[0]) > 1)
      notes.push(n(pair[0]) + ' ' + pair[1].toLowerCase() + ' kings; a position has ' +
        'exactly one of each.');
  });

  var stranded = squares.filter(function(sq){
    var p = st.pos[sq];
    return (p === 'P' || p === 'p') && (sq.charAt(1) === '1' || sq.charAt(1) === '8');
  }).sort();
  if(stranded.length)
    notes.push('A pawn can never stand on rank 1 or rank 8, and there ' +
      (stranded.length > 1 ? 'are pawns on ' : 'is a pawn on ') + edList(stranded) +
      '. On rank 8 it would already have promoted.');

  [['P', 'White'], ['p', 'Black']].forEach(function(pair){
    if(n(pair[0]) > 8)
      notes.push(pair[1] + ' has ' + n(pair[0]) + ' pawns, and eight is the most any side ' +
        'can have.');
  });
  [['w', 'White'], ['b', 'Black']].forEach(function(pair){
    if(side[pair[0]] > 16)
      notes.push(pair[1] + ' has ' + side[pair[0]] + ' pieces, and sixteen is the most any ' +
        'side can have.');
  });

  ED_RIGHTS.forEach(function(r){
    if(!st.castle[r] || edRightAvailable(st.pos, r)) return;
    var home = ED_HOME[r], colour = edWhite(r) ? 'white' : 'black';
    notes.push('Castling keeps ' + r + ' - ' + ED_RIGHT_WORD[r] + ' - which needs a ' +
      colour + ' king on ' + home[0] + ' and a ' + colour + ' rook on ' + home[1] +
      '. The field records rights rather than availability, but neither piece is there ' +
      'to have a right.');
  });

  return notes.concat(edEpNotes(st));
}

/* ---------- what each side is hitting ----------

   Attack here means control: a square a piece could capture on if an enemy
   stood there. So a defended friendly piece counts - "who is hitting e5" and
   "who could take on e5" are different questions, and the first is the one that
   explains a position. A pawn's push squares are not attacks; its two diagonals
   are, whether or not anything is on them. A slider stops on the first piece it
   meets: that square is attacked, the ones behind it are not, and no x-ray is
   claimed here because an x-ray is a different idea with its own entry.

   Legality is not consulted, for the same reason the rest of the page does not
   consult it: a pinned knight still attacks what it attacks, and this editor
   draws what it is told to. */

var ED_LEAP = {
  n: [[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]],
  k: [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]]
};
var ED_ROOKDIR = [[1,0],[-1,0],[0,1],[0,-1]];
var ED_BISHDIR = [[1,1],[1,-1],[-1,1],[-1,-1]];
var ED_SLIDE = { r: ED_ROOKDIR, b: ED_BISHDIR, q: ED_ROOKDIR.concat(ED_BISHDIR) };

/* {square: {w: n, b: n}} for every square either side hits. Squares nobody hits
   are absent rather than zero, so a caller can ask `if(counts[sq])`. */
function edAttackCounts(pos){
  var out = {}, sq;

  /* Counts one square for one side, and answers the only question a ray has:
     stop here? Off the board and occupied both stop it; only the second counts. */
  function hit(f, r, side){
    if(f < 0 || f > 7 || r < 0 || r > 7) return true;
    var nm = ED_FILES.charAt(f) + (r + 1);
    var cell = out[nm] || (out[nm] = { w: 0, b: 0 });
    cell[side] += 1;
    return !!pos[nm];
  }

  for(sq in pos){
    if(!Object.prototype.hasOwnProperty.call(pos, sq)) continue;
    var pc = pos[sq], side = edWhite(pc) ? 'w' : 'b', t = pc.toLowerCase();
    var f = ED_FILES.indexOf(sq.charAt(0)), r = +sq.charAt(1) - 1;
    if(f < 0 || !(r >= 0 && r <= 7)) continue;
    if(t === 'p'){
      var dr = side === 'w' ? 1 : -1;
      hit(f - 1, r + dr, side);
      hit(f + 1, r + dr, side);
    } else if(ED_LEAP[t]){
      edEachStep(ED_LEAP[t], f, r, side, hit, false);
    } else if(ED_SLIDE[t]){
      edEachStep(ED_SLIDE[t], f, r, side, hit, true);
    }
  }
  return out;
}

/* Pulled out of edAttackCounts so the loop body is not a closure built inside a
   loop: one step for a leaper, and steps until something stops it for a slider. */
function edEachStep(dirs, f, r, side, hit, slide){
  var i, step, d;
  for(i = 0; i < dirs.length; i++){
    d = dirs[i];
    step = 1;
    while(!hit(f + d[0] * step, r + d[1] * step, side) && slide) step += 1;
  }
}

/* The heat scale, and the one place in this project that names colours instead
   of using tokens. The token palette is categorical - good, miss, fact, infer -
   and an attacker count is quantitative: there is no token that means "three".
   Red is Black's and blue is White's, and the two endpoints are picked so that
   an even mix lands on a readable purple rather than on mud.
   The scale does not change with the theme. It replaces the square rather than
   tinting it, so tying it to --sq-l and --sq-d would make the same position read
   as two different heat maps depending on the reader's system setting. The dark
   squares keep a slightly deeper version of the same colour, which is enough to
   leave the checker visible under the paint - and finding b7 by eye is how
   anyone reads a board. */
var ED_HEAT_B = [198, 40, 45];      /* Black's attacks: red */
var ED_HEAT_W = [38, 78, 190];      /* White's attacks: blue */
var ED_HEAT_TOP = 5;                /* the count at which the ramp bottoms out */

function edHeat(w, b, dark){
  var n = w + b;
  if(!n) return '';
  var share = b / n;                                  /* 1 all Black, 0 all White */
  var deep = Math.min(1, (n - 1) / (ED_HEAT_TOP - 1));
  var lift = 0.55 - 0.80 * deep;      /* one attacker pale, five and up deep */
  var out = [], i, c;
  for(i = 0; i < 3; i++){
    c = ED_HEAT_B[i] * share + ED_HEAT_W[i] * (1 - share);
    c = lift >= 0 ? c + (255 - c) * lift : c * (1 + lift);
    if(dark) c *= 0.86;
    out.push(Math.round(Math.max(0, Math.min(255, c))));
  }
  return 'rgb(' + out.join(', ') + ')';
}

/* What the badges say, in words, for the label a screen reader reads. The two
   badges are the whole point of the badges - a heat map that is only a colour is
   a heat map two readers in a hundred cannot use - and an aria-label is the same
   promise kept for a reader who is not looking at it at all. */
function edAttackWords(c){
  var parts = [];
  if(c && c.w) parts.push(c.w + ' white');
  if(c && c.b) parts.push(c.b + ' black');
  if(!parts.length) return 'attacked by nothing';
  return 'attacked by ' + edList(parts);
}

/* ---------- the page ---------- */

function edTray(colour){
  var cells = ED_TRAY.map(function(t){
    var pc = colour === 'w' ? t.toUpperCase() : t;
    return '<button type="button" class="tcell" data-tool="' + pc + '" aria-pressed="false" ' +
      'aria-label="Place a ' + edWords(pc) + '" title="' + edWords(pc) + '">' +
      '<span class="pc ' + colour + '" data-t="' + t + '">' + GLYPH[t] + '\uFE0E</span>' +
      '</button>';
  }).join('');
  return '<div class="tray" data-colour="' + colour + '">' + cells + '</div>';
}

function edFieldControls(){
  var castle = ED_RIGHTS.map(function(r){
    return '<label class="edcheck"><input type="checkbox" data-right="' + r + '">' +
      '<span>' + ED_RIGHT_WORD[r] + '</span></label>';
  }).join('');
  return '<div class="edfields">' +
    '<div class="edfield"><span class="lbl">Side to move</span>' +
      '<div class="row edturn">' +
      '<button type="button" class="btn ghost flag" data-turn="w" aria-pressed="true">White</button>' +
      '<button type="button" class="btn ghost flag" data-turn="b" aria-pressed="false">Black</button>' +
      '</div></div>' +
    '<div class="edfield"><span class="lbl">Castling</span>' +
      '<div class="edcastle">' + castle + '</div></div>' +
    '<div class="edfield"><span class="lbl">En passant</span>' +
      '<select id="edep" class="edsel" aria-label="En passant square"></select>' +
      '<span class="edhint" id="edephint"></span></div>' +
    '</div>';
}

/* The attack view. A view, like Flip: it changes nothing about the position, so
   it writes nothing into the FEN and nothing into the address bar.
   Occupied squares only by default, because that is the question anyone actually
   arrives with - what is hitting my pieces, and what am I hitting - and painting
   all sixty-four at once turns the answer into wallpaper. The whole board is one
   checkbox away for the times the question is about the empty squares: where a
   king may not step, which squares a knight can never be dislodged from. */
function edHeatControls(){
  return '<div class="edheat">' +
    '<span class="lbl">Attack view</span>' +
    '<div class="row edheatrow">' +
      '<button type="button" class="btn ghost flag" id="edatk" aria-pressed="false">' +
        'Show attacks</button>' +
      '<label class="edcheck" id="edscope" hidden>' +
        '<input type="checkbox" id="edall">' +
        '<span>Every square, not just the occupied ones</span></label>' +
    '</div>' +
    '<div class="edkey" id="edkey" hidden></div>' +
    '</div>';
}

function renderEditorShell(data){
  var presets = (data.presets || []).map(function(p, i){
    return '<button type="button" class="edload" data-preset="' + i + '">' +
      esc(p.label) + '</button>';
  }).join('');
  var cite = (data.presets || []).filter(function(p){ return p.ref; }).map(function(p){
    return esc(p.label) + ': ' + esc(p.corpus) + ' &middot; ' + esc(p.ref);
  }).join(' &middot; ');

  return '<div class="editor">' +
    '<div class="fenio">' +
      '<label class="lbl" for="fenbox">FEN &mdash; paste one in, or read one back</label>' +
      '<textarea id="fenbox" class="packet fen-in" rows="2" spellcheck="false" ' +
        'autocapitalize="off" autocorrect="off" autocomplete="off" ' +
        'aria-describedby="fenwhy"></textarea>' +
      '<div class="row fenacts">' +
        '<button type="button" class="btn ghost" id="edcopy">Copy FEN</button>' +
        '<span class="picked" id="edcopied" aria-live="polite"></span></div>' +
      '<div class="fenwhy" id="fenwhy" aria-live="polite"></div>' +
    '</div>' +

    '<div class="edboard">' +
      '<p class="edhow">Tap a piece in a tray, then tap squares - it stays selected, ' +
      'so eight pawns are eight taps, and tapping it again puts it down. <em>Move</em> ' +
      'carries a piece from one square to another and <em>Erase</em> takes it off. ' +
      'Nothing here has to be legal.</p>' +
      '<p class="viewlbl" id="edview"></p>' +
      edTray('b') +
      '<div class="board tappable" id="edb" role="group" aria-label="Editable board"></div>' +
      edTray('w') +
      '<p class="picked" id="edsay" aria-live="polite"></p>' +
    '</div>' +

    '<div class="row edtools">' +
      '<button type="button" class="btn ghost flag" id="edmove" aria-pressed="true">Move</button>' +
      '<button type="button" class="btn ghost flag" id="ederase" aria-pressed="false">Erase</button>' +
      '<button type="button" class="btn ghost" id="edflip">Flip</button>' +
    '</div>' +

    edHeatControls() +

    /* Not the same kind of thing as Move, Erase and Flip, and until now it looked
       like it: four more ghost buttons in a row directly under three. Those three
       say what the editor is doing and stay lit while it does it; these four throw
       the position away and load another. So they are labelled as what they are
       and drawn as a different family - filled pills rather than outlined
       controls - and they sit under a heading instead of floating loose. */
    '<div class="edpresets"><span class="lbl">Load a position</span>' +
      '<div class="row edresets">' + presets + '</div></div>' +

    edFieldControls() +

    (cite ? '<p class="prov">' + cite + '</p>' : '') +
    '<p class="prov ednot">Not checked: legality. Nothing here asks whether a position could ' +
    'have arisen from the starting position, or whether the side not to move is standing in ' +
    'check. The editor draws what it is told to.</p>' +
    '</div>';
}

/* The counters have no control of their own. They are the two fields that are
   not part of a position - the same reasoning the FEN entry gives for dropping
   them when two boards are compared - so they ride along from whatever was
   pasted rather than getting a widget that implies they matter. */
function wireEditor(data){
  var box = document.getElementById('fenbox'), host = document.getElementById('edb');
  if(!box || !host) return;

  var st = { pos: {}, turn: 'w', castle: { K:false, Q:false, k:false, q:false },
             ep: '-', half: '0', full: '1' };
  var tool = 'move', pick = null, flip = false, flash = '';
  var heat = false, heatAll = false;
  var strNotes = [], errors = [];

  function say(text){
    document.getElementById('edsay').textContent = text;
  }

  function epOptions(){
    var out = [], f, file;
    var pusher = st.turn === 'w' ? 'p' : 'P', taker = st.turn === 'w' ? 'P' : 'p';
    var rank = st.turn === 'w' ? 6 : 3, pawnRank = st.turn === 'w' ? 5 : 4;
    var fromRank = st.turn === 'w' ? 7 : 2;
    for(f = 0; f < 8; f++){
      file = ED_FILES.charAt(f);
      if(st.pos[file + pawnRank] !== pusher) continue;
      if(st.pos[file + rank] || st.pos[file + fromRank]) continue;
      var beside = [];
      if(f > 0) beside.push(ED_FILES.charAt(f - 1) + pawnRank);
      if(f < 7) beside.push(ED_FILES.charAt(f + 1) + pawnRank);
      if(!beside.filter(function(sq){ return st.pos[sq] === taker; }).length) continue;
      out.push(file + rank);
    }
    return out;
  }

  function label(){
    /* boardHTML is lifted verbatim and cannot grow an aria-label, so the labels
       are put on afterwards. A board of 64 unlabelled buttons is not a board. */
    var cells = host.querySelectorAll('[data-sq]'), i, sq, pc;
    for(i = 0; i < cells.length; i++){
      sq = cells[i].getAttribute('data-sq');
      pc = st.pos[sq];
      cells[i].setAttribute('aria-label', sq + ', ' + (pc ? edWords(pc) : 'empty'));
      if(pick === sq) cells[i].setAttribute('aria-pressed', 'true');
    }
  }

  /* Painted on after boardHTML has drawn, for the reason the labels are: the
     renderer is lifted verbatim from the course and cannot grow a new option.

     Two badges rather than one, in opposite corners, and which corner is which
     follows the board rather than the colours: the count for whoever is playing
     from the top sits at the top. Flip the board and the badges swap with it,
     because a reader who flipped the board did it to think from the other side.

     The badges are not decoration on top of the colour - they are the reading.
     Purple at two attackers and purple at five are the same hue at different
     depths, which is a comparison and not a count, and a shade of red is nothing
     at all to a reader who cannot separate it from a shade of blue. */
  function paintHeat(){
    if(!heat) return;
    var counts = edAttackCounts(st.pos);
    var corner = [[flip ? 'w' : 'b', 'top'], [flip ? 'b' : 'w', 'bot']];
    var cells = host.querySelectorAll('[data-sq]'), i, j, sq, cell, c, wash, badge;
    for(i = 0; i < cells.length; i++){
      cell = cells[i];
      sq = cell.getAttribute('data-sq');
      if(!heatAll && !st.pos[sq]) continue;
      c = counts[sq] || { w: 0, b: 0 };
      cell.setAttribute('aria-label',
        cell.getAttribute('aria-label') + ', ' + edAttackWords(c));
      if(!(c.w + c.b)) continue;
      wash = document.createElement('span');
      wash.className = 'heat';
      wash.style.background = edHeat(c.w, c.b, cell.classList.contains('d'));
      cell.insertBefore(wash, cell.firstChild);
      for(j = 0; j < corner.length; j++){
        if(!c[corner[j][0]]) continue;
        badge = document.createElement('span');
        badge.className = 'atk ' + corner[j][1] + ' ' + corner[j][0];
        badge.textContent = c[corner[j][0]];
        cell.appendChild(badge);
      }
    }
  }

  /* The key is filled from edHeat rather than from a stylesheet, so the swatch a
     reader matches against cannot drift from the square it is explaining. */
  function fillKey(){
    var key = document.getElementById('edkey');
    var swatches = [[2, 0, 'White attacks'], [0, 2, 'Black attacks'], [1, 1, 'Both']];
    key.innerHTML = swatches.map(function(s){
      return '<span class="kk"><i style="background:' + edHeat(s[0], s[1], false) +
        '"></i>' + s[2] + '</span>';
    }).join('') +
      '<span class="kk">Deeper is more attackers &mdash; and the badges are the count: ' +
      '<b class="atk w">2</b> White, <b class="atk b">1</b> Black.</span>';
  }

  function showWhy(){
    var notes = strNotes.concat(edPosNotes(st)), h = '';
    if(errors.length)
      h += '<div class="verdict no"><b>Not a FEN yet</b><ul>' +
        errors.map(function(e){ return '<li>' + esc(e) + '</li>'; }).join('') +
        '</ul><span class="ans">The board below is the last string that parsed.</span></div>';
    if(notes.length)
      h += '<div class="ednotes"><span class="lbl">' + notes.length + ' ' +
        edPlural(notes.length, 'note', 'notes') + ', read anyway</span><ul>' +
        notes.map(function(t){ return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>';
    document.getElementById('fenwhy').innerHTML = h;
  }

  function syncControls(){
    var i, el;
    var turns = document.querySelectorAll('[data-turn]');
    for(i = 0; i < turns.length; i++)
      turns[i].setAttribute('aria-pressed',
        turns[i].getAttribute('data-turn') === st.turn ? 'true' : 'false');

    var boxes = document.querySelectorAll('[data-right]');
    for(i = 0; i < boxes.length; i++){
      var r = boxes[i].getAttribute('data-right');
      var can = edRightAvailable(st.pos, r);
      boxes[i].checked = !!st.castle[r];
      boxes[i].disabled = !can && !st.castle[r];
    }

    var sel = document.getElementById('edep'), opts = epOptions();
    if(st.ep !== '-' && opts.indexOf(st.ep) < 0) opts = opts.concat([st.ep]);
    sel.innerHTML = ['-'].concat(opts).map(function(v){
      return '<option value="' + v + '"' + (v === st.ep ? ' selected' : '') + '>' +
        (v === '-' ? 'none' : v) + '</option>';
    }).join('');
    el = document.getElementById('edephint');
    el.textContent = opts.length
      ? 'Offered where a capture is actually available.'
      : 'No double pawn push to capture past.';

    document.getElementById('edmove').setAttribute('aria-pressed', tool === 'move' ? 'true' : 'false');
    document.getElementById('ederase').setAttribute('aria-pressed', tool === 'erase' ? 'true' : 'false');
    document.getElementById('edatk').setAttribute('aria-pressed', heat ? 'true' : 'false');
    /* The scope checkbox and the key are the overlay's own furniture: with the
       overlay off they explain a board that is not there. */
    document.getElementById('edscope').hidden = !heat;
    document.getElementById('edkey').hidden = !heat;
    document.getElementById('edall').checked = heatAll;
    var cells = document.querySelectorAll('[data-tool]');
    for(i = 0; i < cells.length; i++)
      cells[i].setAttribute('aria-pressed',
        cells[i].getAttribute('data-tool') === tool ? 'true' : 'false');
  }

  function setUrl(fen){
    /* The address bar always holds the position, so a board is a link. A browser
       that refuses to rewrite it loses nothing else on the page. */
    try {
      history.replaceState(null, '', location.pathname + '?fen=' + encodeURIComponent(fen));
    } catch(err){ /* not fatal, and nothing to say about it */ }
  }

  function draw(keepText){
    var fen = edFen(st);
    document.getElementById('edcopied').textContent = '';
    if(!keepText) box.value = fen;
    host.innerHTML = boardHTML(fen, { flip: flip, tappable: true, sel: pick ? [pick] : [] });
    label();
    paintHeat();
    var view = document.getElementById('edview');
    view.className = 'viewlbl' + (flip ? ' flip' : '');
    view.textContent = flip ? 'Black at the bottom' : 'White at the bottom';
    say((tool === 'move'
      ? (pick ? 'Moving the ' + edWords(st.pos[pick]) + ' on ' + pick + ' - tap where it goes.'
              : 'Tap a piece, then tap where it goes.')
      : tool === 'erase'
        ? 'Erasing - tap a piece to take it off.'
        : 'Placing ' + edWords(tool) + ' - tap squares. It stays selected.') +
      (flash ? ' ' + flash : ''));
    flash = '';
    showWhy();
    syncControls();
    setUrl(fen);
  }

  /* The board changed, so the string is ours: string-level notes cannot apply to
     a string this page just wrote. Rights and the en passant square are pruned
     here and only here - pasted input keeps whatever it said, and gets a note. */
  function edited(){
    strNotes = []; errors = [];
    ED_RIGHTS.forEach(function(r){
      if(st.castle[r] && !edRightAvailable(st.pos, r)) st.castle[r] = false;
    });
    var want = edEpPawn(st.ep);
    if(st.ep !== '-' && (!want || st.pos[want.square] !== want.piece)) st.ep = '-';
    draw(false);
  }

  function load(text, keepText){
    var parsed = edParse(text);
    errors = parsed.errors;
    strNotes = parsed.notes;
    if(parsed.state){ st = parsed.state; pick = null; }
    draw(keepText);
  }

  function onSquare(sq){
    if(tool === 'erase'){
      if(st.pos[sq]) delete st.pos[sq];
      else flash = 'Nothing on ' + sq + '.';
      pick = null;
      edited();
      return;
    }
    if(tool === 'move'){
      if(pick === sq){ pick = null; draw(false); return; }
      if(pick){
        st.pos[sq] = st.pos[pick];
        delete st.pos[pick];
        pick = null;
        edited();
        return;
      }
      if(st.pos[sq]) pick = sq;
      else flash = 'Nothing on ' + sq + ' to move.';
      draw(false);
      return;
    }
    if(st.pos[sq] === tool) return;   /* already that piece: nothing to do */
    st.pos[sq] = tool;
    pick = null;
    edited();
  }

  host.addEventListener('click', function(ev){
    var cell = ev.target.closest ? ev.target.closest('[data-sq]') : null;
    if(cell) onSquare(cell.getAttribute('data-sq'));
  });

  /* Tapping the latched tool again releases it, and released means Move: the tool
     that latches is the one that changes the board on a single tap, so there has
     to be a way to put it down that is not "pick a different one". Move is the
     resting state rather than a fourth thing to be in, which is why tapping Move
     while it is already on does nothing. */
  function latch(next){
    tool = (tool === next) ? 'move' : next;
    pick = null;
    draw(false);
  }

  var trayCells = document.querySelectorAll('[data-tool]');
  [].forEach.call(trayCells, function(cell){
    cell.addEventListener('click', function(){ latch(cell.getAttribute('data-tool')); });
  });

  document.getElementById('edmove').addEventListener('click', function(){
    tool = 'move'; pick = null; draw(false);
  });
  document.getElementById('ederase').addEventListener('click', function(){
    latch('erase');
  });
  document.getElementById('edflip').addEventListener('click', function(){
    flip = !flip; draw(false);
  });
  document.getElementById('edatk').addEventListener('click', function(){
    heat = !heat; draw(false);
  });
  document.getElementById('edall').addEventListener('change', function(ev){
    heatAll = !!ev.target.checked; draw(false);
  });

  [].forEach.call(document.querySelectorAll('[data-preset]'), function(btn){
    btn.addEventListener('click', function(){
      var preset = data.presets[+btn.getAttribute('data-preset')];
      tool = tool === 'erase' ? 'move' : tool;
      load(preset.fen, false);
    });
  });

  [].forEach.call(document.querySelectorAll('[data-turn]'), function(btn){
    btn.addEventListener('click', function(){
      st.turn = btn.getAttribute('data-turn');
      draw(false);
    });
  });
  [].forEach.call(document.querySelectorAll('[data-right]'), function(input){
    input.addEventListener('change', function(){
      st.castle[input.getAttribute('data-right')] = !!input.checked;
      draw(false);
    });
  });
  document.getElementById('edep').addEventListener('change', function(ev){
    st.ep = ev.target.value;
    draw(false);
  });

  box.addEventListener('input', function(){ load(box.value, true); });
  /* While the box has focus it holds exactly what was typed - rewriting it under
     a caret is unusable. On the way out it is normalised, so what Copy gives and
     what the box shows cannot drift: paste a bare placement, tap away, and the
     other five fields appear as the note said they would. */
  box.addEventListener('blur', function(){ if(!errors.length) draw(false); });

  document.getElementById('edcopy').addEventListener('click', function(){
    var note = document.getElementById('edcopied'), fen = edFen(st);
    function fallback(){
      try { box.focus(); box.select(); } catch(err){ /* nothing else to try */ }
      note.textContent = 'Selected it instead - copy from the box.';
    }
    try {
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(fen).then(function(){
          note.textContent = 'Copied.';
        }, fallback);
        return;
      }
    } catch(err){ /* fall through */ }
    fallback();
  });

  fillKey();
  load(edStartingText(), false);
}

/* Page boot, here rather than in _boot.js: this file is the only one loaded by
   the page that calls it, and a boot for a surface the shared bundle cannot
   render does not belong in the shared bundle. */
function renderEditor(){
  var data = payload();
  document.getElementById('out').innerHTML = renderEditorShell(data);
  wireEditor(data);
}

/* ?fen= is how every board on the site links here, so it is read on load. An
   underscore reads as a space: it makes a hand-written link legible, and no FEN
   contains one. */
function edStartingText(){
  var given = param('fen');
  if(!given) return ED_START;
  return given.replace(/_/g, ' ');
}
