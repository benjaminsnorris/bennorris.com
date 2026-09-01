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

/* {square: {w: n, b: n, from: [...]}} for every square either side hits. Squares
   nobody hits are absent rather than zero, so a caller can ask `if(counts[sq])`.

   `from` names the pieces behind the number - {sq, piece, side, ray} - because
   Inspect has to point at them, and a second function that worked out "which
   pieces" separately from "how many" is two answers that can disagree.

   `ray` is true for the sliders. Every attacker gets a line - an earlier version
   drew them for the sliders only, on the theory that a straight line from a
   knight is a lie about how it moves, and that was wrong twice over: it left the
   answer full of holes, and it was not even consistent, because a bishop one
   square away drew a stub of a line for the same geometry a pawn one square away
   drew nothing for. The line is a pointer, not a path.

   `ray` picks the kind of line, and it is the whole test. A solid line is the
   attack: the piece really does bear along that diagonal or that file, and the
   drawing is telling the truth about its geometry. A dotted one is a pointer and
   says so, because a knight does not travel the line drawn from it, and neither
   does a pawn or a king - those three attack particular squares rather than
   along anything.

   A version in between tested "could something come and stand in the way",
   which made a bishop draw dotted when it happened to be touching the square it
   attacked. That reads as a claim that the bishop is not a line attacker, which
   is false, and it is the thing a reader notices first. Whether an attack can be
   blocked is worth knowing, but the picture already shows it: a solid line with
   room in it has room in it. */
function edAttackCounts(pos){
  var out = {}, sq, source;

  /* Counts one square for one side, and answers the only question a ray has:
     stop here? Off the board and occupied both stop it; only the second counts. */
  function hit(f, r, side){
    if(f < 0 || f > 7 || r < 0 || r > 7) return true;
    var nm = ED_FILES.charAt(f) + (r + 1);
    var cell = out[nm] || (out[nm] = { w: 0, b: 0, from: [] });
    cell[side] += 1;
    cell.from.push(source);
    return !!pos[nm];
  }

  for(sq in pos){
    if(!Object.prototype.hasOwnProperty.call(pos, sq)) continue;
    var pc = pos[sq], side = edWhite(pc) ? 'w' : 'b', t = pc.toLowerCase();
    var f = ED_FILES.indexOf(sq.charAt(0)), r = +sq.charAt(1) - 1;
    if(f < 0 || !(r >= 0 && r <= 7)) continue;
    source = { sq: sq, piece: pc, side: side, ray: !!ED_SLIDE[t] };
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

/* The attackers of one square, in board order, with the hidden side dropped.
   Board order rather than discovery order so the sentence Inspect speaks reads
   the same way twice. */
function edAttackersOf(counts, target, sides){
  var cell = counts[target];
  if(!cell) return [];
  return cell.from.filter(function(a){ return sides[a.side]; })
    .sort(function(a, b){ return a.sq < b.sq ? -1 : a.sq > b.sq ? 1 : 0; });
}

/* Where a square sits on the drawn board, in cells from the top-left corner.
   The one place that knows about flip, so the rings, the rays and the SVG all
   agree about where a square is. */
function edCellXY(nm, flip){
  var f = ED_FILES.indexOf(nm.charAt(0)), r = 8 - +nm.charAt(1);
  return { x: flip ? 7 - f : f, y: flip ? 7 - r : r };
}

/* The saturated end of each side's ramp, for a ring or a line - the wash's pale
   tints would vanish against the board at one pixel wide. */
function edSideColour(side){
  var c = side === 'w' ? ED_HEAT_W : ED_HEAT_B;
  return 'rgb(' + c.join(', ') + ')';
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
   promise kept for a reader who is not looking at it at all.

   It takes the side filter rather than just the counts, because "attacked by
   nothing" is a lie about a square a hidden side is standing on. With only one
   side shown, an empty square is empty of that side. */
function edAttackWords(c, showW, showB){
  var parts = [];
  if(showW && c.w) parts.push(c.w + ' white');
  if(showB && c.b) parts.push(c.b + ' black');
  if(parts.length) return 'attacked by ' + edList(parts);
  if(showW && showB) return 'attacked by nothing';
  return 'attacked by no ' + (showW ? 'white' : 'black') + ' piece';
}

/* ---------- taking the board away with you ----------

   SVG first and PNG out of the SVG, because there is only one drawing either
   way: rasterising the vector cannot disagree with it, and two independent
   renderers would.

   What is exported is the position and the view - orientation, the heat, the
   badges - and not the editing state. The selection ring says which piece you
   have picked up, which is a fact about this tab and not about the position, so
   it does not travel.

   The palette is passed in rather than named here, for the reason the heat scale
   gives for doing the opposite: these are the board's own colours, they already
   exist as tokens, and a copy of them in JavaScript is a copy that drifts. It is
   read off the live document by edPalette, which also means an export matches
   the theme the reader is actually looking at. */

var ED_SVG = 512;                 /* the drawing's own units; PNG scales it */
var ED_CELL = ED_SVG / 8;
var ED_GLYPH = ED_CELL * 0.714;   /* the ratio the stylesheet uses: 30px on a 42px square */
/* the per-piece sizes from _upstream.css, which exist because these glyphs are
   not drawn to one optical size */
var ED_GSCALE = { p:0.80, r:0.92, n:1.00, b:1.06, q:1.02, k:1.04 };
var ED_TOKENS = ['sq-l', 'sq-d', 'pc-w', 'pc-b', 'pc-w-edge', 'pc-b-edge', 'rule-strong',
                 'pip-edge', 'sel'];
/* Named font stacks rather than the page's --mono and --sans: an exported file
   is opened somewhere else, where this document's variables do not exist. The
   pieces are Unicode, so the glyph stack is the one place this export depends on
   the machine that opens it - every stack below ships with its platform. */
var ED_SVG_MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
var ED_SVG_GLYPHFONT = '"Segoe UI Symbol", "Apple Symbols", "Noto Sans Symbols 2", ' +
  'DejaVu Sans, sans-serif';

function edRound(n){ return Math.round(n * 100) / 100; }

/* The board's colours, off the live document, so the export follows the theme. */
function edPalette(){
  var out = {}, css = null;
  try { css = getComputedStyle(document.documentElement); } catch(err){ /* no document */ }
  ED_TOKENS.forEach(function(name){
    out[name] = css ? String(css.getPropertyValue('--' + name) || '').trim() : '';
  });
  return out;
}

function edXml(s){
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* One badge: a rounded box in its own army's colours, with its own army's ring,
   exactly as the CSS draws it. */
function edSvgBadge(x, y, n, side, pal, anchorRight){
  var fs = ED_GLYPH * 0.38;
  var w = Math.max(fs * 1.3, fs * (0.62 * String(n).length + 0.66)), h = fs * 1.35;
  var fill = side === 'w' ? pal['pc-w'] : pal['pc-b'];
  var edge = side === 'w' ? pal['pc-w-edge'] : pal['pc-b-edge'];
  if(anchorRight) x -= w;
  return '<rect x="' + edRound(x) + '" y="' + edRound(y) + '" width="' + edRound(w) +
    '" height="' + edRound(h) + '" rx="3" fill="' + edXml(fill) + '" stroke="' +
    edXml(edge) + '" stroke-width="1.5"/>' +
    '<text x="' + edRound(x + w / 2) + '" y="' + edRound(y + h / 2) + '" dy="0.36em" ' +
    'text-anchor="middle" font-family="' + edXml(ED_SVG_MONO) + '" font-size="' +
    edRound(fs) + '" font-weight="700" fill="' + edXml(edge) + '">' + n + '</text>';
}

/* The board as one self-contained SVG. `view` is {flip, heat, heatAll, badges,
   sides} - the same switches the page is set to, so what is saved is what is on
   screen. */
function edBoardSVG(st, view, pal){
  view = view || {};
  var sides = view.sides || { w: true, b: true };
  var anySide = sides.w || sides.b;
  var counts = ((view.heat || view.probe) && anySide) ? edAttackCounts(st.pos) : {};
  var top = view.flip ? 'w' : 'b', bottom = view.flip ? 'b' : 'w';

  /* Four layers, in the order the page stacks them: the board and its washes,
     then the lines, then the pieces, then everything that annotates a piece. A
     line of attack goes over the paint and under the men it is about, and doing
     that in one pass per cell is not possible - which is exactly why the page
     draws the rays into one overlay rather than into the squares. */
  var ground = [], rays = [], men = [], marks = [];
  var probeAt = (view.probe && anySide) ? edCellXY(view.probe, view.flip) : null;
  var vr, vf, r, f, nm, dark, pc, c, x, y;

  for(vr = 0; vr < 8; vr++){
    for(vf = 0; vf < 8; vf++){
      r = view.flip ? 7 - vr : vr;
      f = view.flip ? 7 - vf : vf;
      nm = ED_FILES.charAt(f) + (8 - r);
      dark = !!((r + f) % 2);
      x = vf * ED_CELL; y = vr * ED_CELL;
      ground.push(edSvgRect(x, y, ED_CELL, ED_CELL, pal[dark ? 'sq-d' : 'sq-l']));

      /* A square is washed if the survey reaches it, and the probed square is
         washed whether or not the survey is even on - the same rule paintProbe
         follows, so the file and the screen agree. */
      c = null;
      if(anySide && (view.heat ? (view.heatAll || st.pos[nm]) : nm === view.probe)){
        var all = counts[nm] || { w: 0, b: 0 };
        c = { w: sides.w ? all.w : 0, b: sides.b ? all.b : 0 };
        if(c.w + c.b) ground.push(edSvgRect(x, y, ED_CELL, ED_CELL, edHeat(c.w, c.b, dark)));
        else c = null;
      }

      pc = st.pos[nm];
      if(pc){
        var t = pc.toLowerCase(), white = edWhite(pc);
        var fs = ED_GLYPH * (ED_GSCALE[t] || 1);
        men.push('<text x="' + edRound(x + ED_CELL / 2) + '" y="' +
          edRound(y + ED_CELL / 2) + '" dy="0.34em" text-anchor="middle" ' +
          'font-family="' + edXml(ED_SVG_GLYPHFONT) + '" font-size="' + edRound(fs) +
          '" fill="' + edXml(pal[white ? 'pc-w' : 'pc-b']) + '" stroke="' +
          edXml(pal[white ? 'pc-w-edge' : 'pc-b-edge']) + '" stroke-width="' +
          edRound(fs / 21) + '" paint-order="stroke fill" stroke-linejoin="round">' +
          edXml(GLYPH[t]) + '</text>');
      }

      if(c && view.badges){
        if(c[top])
          marks.push(edSvgBadge(x + ED_CELL * 0.03, y + ED_CELL * 0.02, c[top], top, pal, false));
        if(c[bottom])
          marks.push(edSvgBadge(x + ED_CELL * 0.97,
            y + ED_CELL * 0.98 - ED_GLYPH * 0.38 * 1.35, c[bottom], bottom, pal, true));
      }
    }
  }

  if(probeAt){
    edAttackersOf(counts, view.probe, sides).forEach(function(a){
      var at = edCellXY(a.sq, view.flip);
      marks.push(edSvgRing(at.x * ED_CELL, at.y * ED_CELL, ED_CELL * 0.07,
        edSideColour(a.side), 3, pal['pip-edge']));
      var d = 'x1="' + edRound((at.x + 0.5) * ED_CELL) + '" y1="' +
        edRound((at.y + 0.5) * ED_CELL) + '" x2="' + edRound((probeAt.x + 0.5) * ED_CELL) +
        '" y2="' + edRound((probeAt.y + 0.5) * ED_CELL) + '"';
      /* the dots the stylesheet draws, in the drawing's own units */
      var open = a.ray;
      var dash = open ? '' :
        ' stroke-dasharray="' + edRound(ED_CELL * 0.02) + ' ' + edRound(ED_CELL * 0.17) + '"';
      rays.push('<line ' + d + dash + ' stroke="' + edXml(pal['pip-edge']) +
        '" stroke-width="' + edRound(ED_CELL * (open ? 0.14 : 0.175)) +
        '" stroke-linecap="round" opacity="0.85"/>' +
        '<line ' + d + dash + ' stroke="' + edSideColour(a.side) +
        '" stroke-width="' + edRound(ED_CELL * (open ? 0.075 : 0.1)) +
        '" stroke-linecap="round"/>');
    });
    /* The square you asked about, last, so nothing sits on top of it. */
    marks.push(edSvgRing(probeAt.x * ED_CELL, probeAt.y * ED_CELL, ED_CELL * 0.04,
      pal['pip-edge'], 3, pal['sel']));
  }

  /* The border the stylesheet draws, drawn inside the box so it is not clipped. */
  marks.push('<rect x="0.5" y="0.5" width="' + (ED_SVG - 1) + '" height="' + (ED_SVG - 1) +
    '" rx="6" fill="none" stroke="' + edXml(pal['rule-strong']) + '" stroke-width="1"/>');

  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + ED_SVG + '" height="' +
    ED_SVG + '" viewBox="0 0 ' + ED_SVG + ' ' + ED_SVG + '" role="img">' +
    '<title>' + edXml(edFen(st)) + '</title>' +
    '<clipPath id="b"><rect width="' + ED_SVG + '" height="' + ED_SVG + '" rx="6"/></clipPath>' +
    '<g clip-path="url(#b)">' + ground.join('') + rays.join('') + men.join('') +
    marks.join('') + '</g></svg>';
}

function edSvgRect(x, y, w, h, fill){
  return '<rect x="' + edRound(x) + '" y="' + edRound(y) + '" width="' + edRound(w) +
    '" height="' + edRound(h) + '" fill="' + edXml(fill) + '"/>';
}

/* A ring inset into a cell, with a halo either side of it - the pips' trick,
   which is what lets one colour carry on a light square and a dark one. */
function edSvgRing(x, y, inset, colour, width, halo){
  var side = ED_CELL - inset * 2;
  return '<rect x="' + edRound(x + inset) + '" y="' + edRound(y + inset) + '" width="' +
    edRound(side) + '" height="' + edRound(side) + '" rx="5" fill="none" stroke="' +
    edXml(halo) + '" stroke-width="' + (width + 3) + '"/>' +
    '<rect x="' + edRound(x + inset) + '" y="' + edRound(y + inset) + '" width="' +
    edRound(side) + '" height="' + edRound(side) + '" rx="5" fill="none" stroke="' +
    edXml(colour) + '" stroke-width="' + width + '"/>';
}

/* A filename someone can tell apart in a folder a week later. The placement is
   the position; the slash is the one character in it a filesystem refuses. */
function edFileName(st, ext){
  return 'board-' + edPlacement(st.pos).replace(/\//g, '-') + '.' + ext;
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
   king may not step, which squares a knight can never be dislodged from.

   Every box is on except the one that widens the scope, so the view a reader
   gets without touching anything is the whole answer to the question they came
   with - and each box takes something away rather than adding it. Dropping a
   side is what the two colour boxes are for: with Black off, the board is what
   White covers and nothing else, which is the way to see a square that only
   looks contested. */
function edHeatControls(){
  var box = function(id, label, on){
    return '<label class="edcheck"><input type="checkbox" id="' + id + '"' +
      (on ? ' checked' : '') + '><span>' + label + '</span></label>';
  };
  return '<div class="edheat">' +
    '<span class="lbl">Attack view</span>' +
    '<div class="row edheatrow">' +
      '<button type="button" class="btn ghost flag" id="edatk" aria-pressed="false">' +
        'Show attacks</button>' +
      '<span class="edopts" id="edscope" hidden>' +
        box('edwhite', 'White attacks', true) +
        box('edblack', 'Black attacks', true) +
        box('edall', 'All squares', false) +
        box('edbadge', 'Badges', true) +
      '</span>' +
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
      '<p class="viewlbl" id="edview"></p>' +
      edTray('b') +
      '<div class="board tappable" id="edb" role="group" aria-label="Editable board"></div>' +
      edTray('w') +
      '<p class="picked" id="edsay" aria-live="polite"></p>' +
    '</div>' +

    '<div class="row edtools">' +
      '<button type="button" class="btn ghost flag" id="edinspect" aria-pressed="true">' +
        'Inspect</button>' +
      '<button type="button" class="btn ghost flag" id="edmove" aria-pressed="false">Move</button>' +
      '<button type="button" class="btn ghost flag" id="ederase" aria-pressed="false">Erase</button>' +
      '<button type="button" class="btn ghost" id="edflip">Flip</button>' +
      /* A disclosure, not a mode, so it says aria-expanded rather than
         aria-pressed - and it names the thing it opens, because a lone "?" is
         only a question mark to a screen reader. */
      '<button type="button" class="btn ghost info" id="edinfo" aria-expanded="false" ' +
        'aria-controls="edhow" aria-label="How the editor works" ' +
        'title="How the editor works">?</button>' +
    '</div>' +

    /* Under the three buttons it is about, and shut. A reader who followed a
       board's link here came to look at a position; the instructions for a tool
       whose whole gesture is "tap a thing, then tap a square" do not need to be
       the first thing over it. */
    '<p class="edhow" id="edhow" hidden><em>Inspect</em> is where the page starts: tap ' +
    'any square, empty or not, and every piece attacking it is ringed, with a line back to ' +
    'it: solid from a piece that attacks along a line, so the line is the attack, and ' +
    'dotted from a knight, pawn or king, which attack a square rather than along anything. ' +
    'To change the position instead, tap a piece ' +
    'in a tray and then tap squares - it stays selected, so eight pawns are eight taps, ' +
    'and tapping it again puts it down. <em>Move</em> carries a piece from one square to ' +
    'another and <em>Erase</em> takes it off. Nothing here has to be legal.</p>' +

    edHeatControls() +

    /* Not the same kind of thing as Move, Erase and Flip, and until now it looked
       like it: four more ghost buttons in a row directly under three. Those three
       say what the editor is doing and stay lit while it does it; these four throw
       the position away and load another. So they are labelled as what they are
       and drawn as a different family - filled pills rather than outlined
       controls - and they sit under a heading instead of floating loose. */
    /* Save and Load are the same kind of act pointed in two directions, so they
       are neighbours and wear the same pill. */
    '<div class="edpresets edsaveblock"><span class="lbl">Save the board</span>' +
      '<div class="row edresets">' +
        '<button type="button" class="edsave" id="edsvg">SVG</button>' +
        '<button type="button" class="edsave" id="edpng">PNG</button>' +
      '</div>' +
      '<p class="picked edsaid" id="edsaid" aria-live="polite"></p></div>' +

    '<div class="edpresets edloadblock"><span class="lbl">Load a position</span>' +
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
  var tool = 'inspect', pick = null, probe = null, flip = false, flash = '';
  var heat = false, heatAll = false, showBadges = true;
  var showSide = { w: true, b: true };
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
    /* Both sides hidden is a legitimate thing to have asked for and there is
       nothing to draw for it - not even a label, which would be describing a
       board nobody is being shown. */
    if(!heat || !(showSide.w || showSide.b)) return;
    var counts = edAttackCounts(st.pos);
    var corner = [[flip ? 'w' : 'b', 'top'], [flip ? 'b' : 'w', 'bot']];
    var cells = host.querySelectorAll('[data-sq]'), i, j, sq, cell, all, c, wash, badge;
    for(i = 0; i < cells.length; i++){
      cell = cells[i];
      sq = cell.getAttribute('data-sq');
      if(!heatAll && !st.pos[sq]) continue;
      all = counts[sq] || { w: 0, b: 0 };
      /* A hidden side is not counted anywhere downstream - not in the colour,
         not in a badge, not in the label. Dropping it here rather than at each
         of the three is what keeps them from disagreeing. */
      c = { w: showSide.w ? all.w : 0, b: showSide.b ? all.b : 0 };
      cell.setAttribute('aria-label', cell.getAttribute('aria-label') + ', ' +
        edAttackWords(all, showSide.w, showSide.b));
      if(!(c.w + c.b)) continue;
      wash = document.createElement('span');
      wash.className = 'heat';
      wash.style.background = edHeat(c.w, c.b, cell.classList.contains('d'));
      cell.insertBefore(wash, cell.firstChild);
      /* The badges come off the picture, never off the square: the aria-label
         above is written before this test and is not subject to it. A reader who
         turned them off wanted a cleaner board, and a reader who is not looking
         at the board at all did not ask for anything. */
      if(!showBadges) continue;
      for(j = 0; j < corner.length; j++){
        if(!c[corner[j][0]]) continue;
        badge = document.createElement('span');
        badge.className = 'atk ' + corner[j][1] + ' ' + corner[j][0];
        badge.textContent = c[corner[j][0]];
        cell.appendChild(badge);
      }
    }
  }

  /* Inspect. One square's answer, drawn whether or not the survey is on - and
     better without it, because forty painted squares are noise when the question
     is about one of them.

     The probed square gets the wash and the badges it would get in the survey,
     even if the survey is off and even if it is empty: "what covers d5 before I
     put a knight there" is the most useful version of the question, so Inspect
     never asks you to tick All squares first. Its attackers are ringed in their
     own side's colour, and the ones that attack along a line get the line. */
  function paintProbe(){
    if(tool !== 'inspect' || !probe || !(showSide.w || showSide.b)) return;
    var counts = edAttackCounts(st.pos);
    var all = counts[probe] || { w: 0, b: 0 };
    var c = { w: showSide.w ? all.w : 0, b: showSide.b ? all.b : 0 };
    var cell = host.querySelector('[data-sq="' + probe + '"]');

    /* Its own marker rather than the picked-up piece's ring. The square you
       asked about is the one square guaranteed to be carrying the deepest wash
       on the board - eight attackers is very nearly black - and a navy ring
       disappears into it. A pale ring with a navy edge is the pair that survives
       both ends of the ramp, and being a different mark from the one Move uses
       is worth having anyway: the two mean different things. */
    if(cell){
      var here = document.createElement('span');
      here.className = 'probe';
      cell.appendChild(here);
    }

    if(cell && (c.w + c.b) && !cell.querySelector('.heat')){
      var wash = document.createElement('span');
      wash.className = 'heat';
      wash.style.background = edHeat(c.w, c.b, cell.classList.contains('d'));
      cell.insertBefore(wash, cell.firstChild);
    }
    if(cell && showBadges && !cell.querySelector('.atk')){
      var corner = [[flip ? 'w' : 'b', 'top'], [flip ? 'b' : 'w', 'bot']];
      corner.forEach(function(pair){
        if(!c[pair[0]]) return;
        var badge = document.createElement('span');
        badge.className = 'atk ' + pair[1] + ' ' + pair[0];
        badge.textContent = c[pair[0]];
        cell.appendChild(badge);
      });
    }

    var from = edAttackersOf(counts, probe, showSide), lines = [];
    var at0 = edCellXY(probe, flip);
    from.forEach(function(a){
      var at = host.querySelector('[data-sq="' + a.sq + '"]');
      if(at){
        var ring = document.createElement('span');
        ring.className = 'from';
        ring.style.borderColor = edSideColour(a.side);
        at.appendChild(ring);
        at.setAttribute('aria-label', at.getAttribute('aria-label') +
          ', attacking ' + probe);
      }
      var xy = edCellXY(a.sq, flip);
      lines.push({ x1: xy.x + 0.5, y1: xy.y + 0.5, x2: at0.x + 0.5, y2: at0.y + 0.5,
                   side: a.side, noray: !a.ray });
    });

    /* One overlay for every line rather than a border trick per cell: a line
       between two squares does not belong to either of them. It sits over the
       washes and under the pieces, which is where a line of attack goes - the
       pieces are what it is about. */
    if(lines.length){
      var svg = '<svg class="rays" viewBox="0 0 8 8" preserveAspectRatio="none" ' +
        'aria-hidden="true">' + lines.map(function(l){
          var d = 'x1="' + l.x1 + '" y1="' + l.y1 + '" x2="' + l.x2 + '" y2="' + l.y2 + '"';
          var kind = l.noray ? ' noray' : '';
          /* Drawn twice: a pale halo under a coloured line, the way the pips are
             separated from the square they sit on. One class attribute per line -
             two of them and the parser keeps the first, which silently cost the
             halo its `halo` class and drew every dotted line twice. */
          return '<line ' + d + ' class="halo' + kind + '"/>' +
            '<line ' + d + ' class="mark' + kind + '" stroke="' +
            edSideColour(l.side) + '"/>';
        }).join('') + '</svg>';
      host.insertAdjacentHTML('beforeend', svg);
    }

    /* The whole answer, in a sentence, in the live region that already exists.
       A ring and a line are no answer at all to a reader who is not looking. */
    flash = from.length
      ? probe + ' is ' + edAttackWords(all, showSide.w, showSide.b) + ' \u2014 from ' +
        edList(from.map(function(a){ return edWords(a.piece) + ' on ' + a.sq; })) + '.'
      : probe + ' is ' + edAttackWords(all, showSide.w, showSide.b) + '.';
  }

  /* The key is filled from edHeat rather than from a stylesheet, so the swatch a
     reader matches against cannot drift from the square it is explaining. It is
     rebuilt on every draw for the same reason: with the badges off, a key that
     still explains them is describing a board that is not there. */
  function fillKey(){
    var key = document.getElementById('edkey');
    if(!(showSide.w || showSide.b)){
      key.innerHTML = '<span class="kk">Both sides are hidden. Tick <em>White ' +
        'attacks</em> or <em>Black attacks</em> to paint the board.</span>';
      return;
    }
    /* Only the swatches that can actually appear. A key offering a purple the
       board can no longer produce is a key you have to disbelieve. */
    var swatches = [];
    if(showSide.w) swatches.push([2, 0, 'White attacks']);
    if(showSide.b) swatches.push([0, 2, 'Black attacks']);
    if(showSide.w && showSide.b) swatches.push([1, 1, 'Both']);
    var badges = [];
    if(showBadges && showSide.w) badges.push('<b class="atk w">2</b> White');
    if(showBadges && showSide.b) badges.push('<b class="atk b">1</b> Black');
    key.innerHTML = swatches.map(function(s){
      return '<span class="kk"><i style="background:' + edHeat(s[0], s[1], false) +
        '"></i>' + s[2] + '</span>';
    }).join('') +
      '<span class="kk">Deeper is more attackers' + (badges.length
        ? ' &mdash; and the badges are the count: ' + edList(badges) + '.'
        : '. With the badges off, the counts are still in each square\'s label.') +
      '</span>';
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

    document.getElementById('edinspect').setAttribute('aria-pressed',
      tool === 'inspect' ? 'true' : 'false');
    document.getElementById('edmove').setAttribute('aria-pressed', tool === 'move' ? 'true' : 'false');
    document.getElementById('ederase').setAttribute('aria-pressed', tool === 'erase' ? 'true' : 'false');
    document.getElementById('edatk').setAttribute('aria-pressed', heat ? 'true' : 'false');
    /* The scope checkbox and the key are the overlay's own furniture: with the
       overlay off they explain a board that is not there. */
    document.getElementById('edscope').hidden = !heat;
    document.getElementById('edkey').hidden = !heat;
    document.getElementById('edall').checked = heatAll;
    document.getElementById('edbadge').checked = showBadges;
    document.getElementById('edwhite').checked = showSide.w;
    document.getElementById('edblack').checked = showSide.b;
    fillKey();
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
    document.getElementById('edsaid').textContent = '';
    if(!keepText) box.value = fen;
    host.innerHTML = boardHTML(fen, { flip: flip, tappable: true, sel: pick ? [pick] : [] });
    label();
    paintHeat();
    paintProbe();
    var view = document.getElementById('edview');
    view.className = 'viewlbl' + (flip ? ' flip' : '');
    view.textContent = flip ? 'Black at the bottom' : 'White at the bottom';
    var line = tool === 'inspect'
      /* With a square probed, paintProbe has already put the whole answer in
         `flash`, and prefixing it with the instruction would bury it. */
      ? (probe ? '' : 'Tap any square to see what attacks it.')
      : tool === 'move'
        ? (pick ? 'Moving the ' + edWords(st.pos[pick]) + ' on ' + pick + ' - tap where it goes.'
                : 'Tap a piece, then tap where it goes.')
        : tool === 'erase'
          ? 'Erasing - tap a piece to take it off.'
          : 'Placing ' + edWords(tool) + ' - tap squares. It stays selected.';
    say([line, flash].filter(Boolean).join(' '));
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
    probe = null;
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
    if(parsed.state){ st = parsed.state; pick = null; probe = null; }
    draw(keepText);
  }

  function onSquare(sq){
    if(tool === 'inspect'){
      probe = (probe === sq) ? null : sq;
      draw(false);
      return;
    }
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

  /* Tapping the latched tool again releases it, and released means Inspect: a
     tool that changes the board on a single tap needs a way to be put down that
     is not "pick a different one".

     Inspect is the resting state rather than a fifth thing to be in, and it is
     where the page opens. Most visits arrive on a ?fen= link from a board
     somewhere else in the glossary, and that reader came to read a position, not
     to edit one - so the mode that answers questions about the board is the one
     you get without asking, and changing the board is the deliberate act. That
     is why tapping Inspect while it is already on does nothing. */
  function latch(next){
    tool = (tool === next) ? 'inspect' : next;
    pick = null;
    probe = null;
    draw(false);
  }

  var trayCells = document.querySelectorAll('[data-tool]');
  [].forEach.call(trayCells, function(cell){
    cell.addEventListener('click', function(){ latch(cell.getAttribute('data-tool')); });
  });

  document.getElementById('edinspect').addEventListener('click', function(){
    tool = 'inspect'; pick = null; draw(false);
  });
  document.getElementById('edmove').addEventListener('click', function(){
    latch('move');
  });
  document.getElementById('ederase').addEventListener('click', function(){
    latch('erase');
  });
  document.getElementById('edflip').addEventListener('click', function(){
    flip = !flip; draw(false);
  });
  document.getElementById('edinfo').addEventListener('click', function(){
    var how = document.getElementById('edhow'), btn = this;
    how.hidden = !how.hidden;
    btn.setAttribute('aria-expanded', how.hidden ? 'false' : 'true');
  });
  document.getElementById('edatk').addEventListener('click', function(){
    heat = !heat; draw(false);
  });
  document.getElementById('edall').addEventListener('change', function(ev){
    heatAll = !!ev.target.checked; draw(false);
  });
  document.getElementById('edbadge').addEventListener('change', function(ev){
    showBadges = !!ev.target.checked; draw(false);
  });
  [['edwhite', 'w'], ['edblack', 'b']].forEach(function(pair){
    document.getElementById(pair[0]).addEventListener('change', function(ev){
      showSide[pair[1]] = !!ev.target.checked; draw(false);
    });
  });

  [].forEach.call(document.querySelectorAll('[data-preset]'), function(btn){
    btn.addEventListener('click', function(){
      var preset = data.presets[+btn.getAttribute('data-preset')];
      tool = tool === 'erase' ? 'inspect' : tool;
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

  /* One drawing, two files: the PNG is this SVG rasterised, so a raster that
     disagrees with the vector is not a thing that can happen. */
  function currentSVG(){
    /* The probe travels and the pick does not. Both are rings on a square, but
       one is an answer about the position - here is what attacks e5 - and the
       other is "I am halfway through moving something", which is a fact about
       this tab and no use to anyone opening the file. */
    return edBoardSVG(st, { flip: flip, heat: heat, heatAll: heatAll,
      badges: showBadges, sides: { w: showSide.w, b: showSide.b },
      probe: tool === 'inspect' ? probe : null }, edPalette());
  }

  function saved(text){ document.getElementById('edsaid').textContent = text; }

  /* A download is the one thing on this page that can fail for reasons that have
     nothing to do with the position, so every path out of it says what happened
     rather than leaving a button that looks broken. */
  function offer(blob, name){
    var url;
    try {
      url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.parentNode.removeChild(a);
      saved('Saved ' + name);
    } catch(err){
      saved('This browser would not start the download.');
    }
    if(url) setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
  }

  document.getElementById('edsvg').addEventListener('click', function(){
    saved('');
    try {
      offer(new Blob([currentSVG()], { type: 'image/svg+xml;charset=utf-8' }),
            edFileName(st, 'svg'));
    } catch(err){ saved('Could not draw the board as SVG.'); }
  });

  /* Rasterised through an <img>, which is the only way to get a browser to lay
     the glyphs out: a canvas cannot draw an SVG string, and drawing the pieces
     as canvas text would be a second renderer to keep in step with the first. */
  document.getElementById('edpng').addEventListener('click', function(){
    saved('Drawing\u2026');
    var img = new Image(), url, done = false;
    function fail(){
      if(done) return;
      done = true;
      if(url) URL.revokeObjectURL(url);
      saved('Could not make a PNG here \u2014 the SVG will save.');
    }
    try {
      url = URL.createObjectURL(new Blob([currentSVG()],
        { type: 'image/svg+xml;charset=utf-8' }));
    } catch(err){ fail(); return; }
    img.onerror = fail;
    img.onload = function(){
      if(done) return;
      try {
        var scale = 2, canvas = document.createElement('canvas');
        canvas.width = ED_SVG * scale;
        canvas.height = ED_SVG * scale;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        url = null;
        canvas.toBlob(function(blob){
          if(done) return;
          done = true;
          if(blob) offer(blob, edFileName(st, 'png'));
          else fail();
        }, 'image/png');
      } catch(err){ fail(); }
    };
    img.src = url;
  });

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
