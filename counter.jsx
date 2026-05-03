import { useState, useEffect, useRef } from ‘react’;
import {
Plus,
Minus,
RotateCcw,
Trash2,
MapPin,
ChevronLeft,
ChevronRight,
Check,
Circle,
Flag,
Copy,
Play,
ListPlus,
Pencil,
X,
} from ‘lucide-react’;

export default function AttendeeCounter() {
const [mode, setMode] = useState(‘setup’); // ‘setup’ | ‘counting’ | ‘review’
const [rooms, setRooms] = useState([]); // [{ id, name, count, visited }]
const [currentIndex, setCurrentIndex] = useState(0);
const [draftRoom, setDraftRoom] = useState(’’);
const [renamingId, setRenamingId] = useState(null);
const [renameValue, setRenameValue] = useState(’’);
const [copiedFlash, setCopiedFlash] = useState(false);
const [isDark, setIsDark] = useState(false);
const inputRef = useRef(null);
const listEndRef = useRef(null);

// System dark mode
useEffect(() => {
if (typeof window === ‘undefined’ || !window.matchMedia) return;
const mq = window.matchMedia(’(prefers-color-scheme: dark)’);
setIsDark(mq.matches);
const handler = (e) => setIsDark(e.matches);
if (mq.addEventListener) mq.addEventListener(‘change’, handler);
else mq.addListener(handler);
return () => {
if (mq.removeEventListener) mq.removeEventListener(‘change’, handler);
else mq.removeListener(handler);
};
}, []);

// Fonts
useEffect(() => {
const link = document.createElement(‘link’);
link.rel = ‘stylesheet’;
link.href =
‘https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap’;
document.head.appendChild(link);
return () => {
try { document.head.removeChild(link); } catch (e) { /* noop */ }
};
}, []);

const total = rooms.reduce((s, r) => s + r.count, 0);
const visitedCount = rooms.filter((r) => r.visited).length;
const currentRoom = rooms[currentIndex] || null;

const buzz = (pattern = 15) => {
if (typeof navigator !== ‘undefined’ && navigator.vibrate) {
try { navigator.vibrate(pattern); } catch (e) { /* noop */ }
}
};

// ––––– Room list management –––––
const addRooms = (raw) => {
const names = raw
.split(/\r?\n/)
.map((n) => n.trim())
.filter(Boolean);
if (names.length === 0) return;
const created = names.map((n) => ({
id: Date.now() + Math.random(),
name: n,
count: 0,
visited: false,
}));
setRooms((prev) => […prev, …created]);
setDraftRoom(’’);
buzz(10);
setTimeout(() => {
if (listEndRef.current) listEndRef.current.scrollIntoView({ behavior: ‘smooth’, block: ‘nearest’ });
}, 50);
};

const removeRoom = (id) => {
const idx = rooms.findIndex((r) => r.id === id);
setRooms((prev) => prev.filter((r) => r.id !== id));
if (mode === ‘counting’ && idx !== -1) {
if (idx < currentIndex) setCurrentIndex((c) => Math.max(0, c - 1));
else if (idx === currentIndex) setCurrentIndex((c) => Math.min(c, rooms.length - 2));
}
buzz(8);
};

const handleDraftKey = (e) => {
if (e.key === ‘Enter’) {
e.preventDefault();
if (draftRoom.trim()) addRooms(draftRoom);
}
};

const handleDraftPaste = (e) => {
const text = e.clipboardData?.getData(‘text’) || ‘’;
if (text.includes(’\n’)) {
e.preventDefault();
addRooms(text);
}
};

// ––––– Mode transitions –––––
const startCounting = () => {
if (rooms.length === 0) {
// Auto-create a first room so user can start immediately
const room = {
id: Date.now() + Math.random(),
name: ‘Location 1’,
count: 0,
visited: false,
};
setRooms([room]);
}
setCurrentIndex(0);
setMode(‘counting’);
buzz(25);
};

const finish = () => {
setMode(‘review’);
buzz([25, 35, 25]);
};

const continueCounting = () => {
const nextIdx = rooms.findIndex((r) => !r.visited);
setCurrentIndex(nextIdx === -1 ? 0 : nextIdx);
setMode(‘counting’);
buzz(15);
};

const startOver = () => {
if (!window.confirm(‘Start over? All rooms and counts will be cleared.’)) return;
setRooms([]);
setCurrentIndex(0);
setMode(‘setup’);
setDraftRoom(’’);
buzz(60);
};

const resetCountsKeepRooms = () => {
if (!window.confirm(‘Reset counts to 0 but keep the room list?’)) return;
setRooms((prev) => prev.map((r) => ({ …r, count: 0, visited: false })));
setCurrentIndex(0);
setMode(‘counting’);
buzz(40);
};

// ––––– Counting actions –––––
const incrementCurrent = () => {
setRooms((prev) =>
prev.map((r, i) => (i === currentIndex ? { …r, count: r.count + 1, visited: true } : r))
);
buzz(15);
};

const decrementCurrent = () => {
if (!currentRoom || currentRoom.count <= 0) return;
setRooms((prev) =>
prev.map((r, i) => (i === currentIndex ? { …r, count: Math.max(0, r.count - 1) } : r))
);
buzz(8);
};

const markVisitedAndAdvance = () => {
setRooms((prev) =>
prev.map((r, i) => (i === currentIndex ? { …r, visited: true } : r))
);
if (currentIndex >= rooms.length - 1) {
finish();
} else {
setCurrentIndex(currentIndex + 1);
buzz(20);
}
};

const goToPrev = () => {
if (currentIndex > 0) {
setCurrentIndex(currentIndex - 1);
buzz(15);
}
};

const jumpToRoom = (idx) => {
setCurrentIndex(idx);
buzz(12);
};

const startRename = (id) => {
const room = rooms.find((r) => r.id === id);
if (!room) return;
setRenameValue(room.name);
setRenamingId(id);
};

const saveRename = () => {
const trimmed = renameValue.trim();
if (trimmed && renamingId != null) {
setRooms((prev) =>
prev.map((r) => (r.id === renamingId ? { …r, name: trimmed } : r))
);
buzz(10);
}
setRenamingId(null);
setRenameValue(’’);
};

const cancelRename = () => {
setRenamingId(null);
setRenameValue(’’);
};

const copyResults = async () => {
const lines = [
`Total: ${total}`,
‘’,
…rooms.map((r) => `${r.name}: ${r.count}`),
];
const text = lines.join(’\n’);
try {
if (navigator.clipboard && navigator.clipboard.writeText) {
await navigator.clipboard.writeText(text);
} else {
const ta = document.createElement(‘textarea’);
ta.value = text;
document.body.appendChild(ta);
ta.select();
document.execCommand(‘copy’);
document.body.removeChild(ta);
}
setCopiedFlash(true);
setTimeout(() => setCopiedFlash(false), 1600);
buzz(15);
} catch (e) {
/* noop */
}
};

// ––––– Theme –––––
const t = isDark
? {
page: ‘bg-neutral-950 text-stone-50’,
muted: ‘text-neutral-400’,
dim: ‘text-neutral-500’,
panel: ‘bg-neutral-900’,
panelSub: ‘bg-neutral-800’,
border: ‘border-neutral-800’,
borderSoft: ‘border-neutral-800/60’,
input:
‘bg-neutral-900 border-neutral-700 text-stone-50 placeholder-neutral-500 focus:border-amber-400’,
accent: ‘bg-amber-400 text-neutral-950 hover:bg-amber-300 active:bg-amber-300’,
accentSoft: ‘bg-amber-400/10 border-amber-400/30 text-amber-300’,
accentBorder: ‘border-amber-400/60’,
secondary:
‘bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-700 text-stone-100 border-neutral-700’,
ghost: ‘hover:bg-neutral-800/60 active:bg-neutral-800/60 text-stone-100’,
danger: ‘text-red-400 hover:bg-red-500/10’,
check: ‘text-emerald-400’,
}
: {
page: ‘bg-stone-50 text-stone-950’,
muted: ‘text-stone-600’,
dim: ‘text-stone-500’,
panel: ‘bg-white’,
panelSub: ‘bg-stone-100’,
border: ‘border-stone-200’,
borderSoft: ‘border-stone-200/60’,
input:
‘bg-white border-stone-300 text-stone-950 placeholder-stone-400 focus:border-amber-500’,
accent: ‘bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-600’,
accentSoft: ‘bg-amber-500/10 border-amber-500/40 text-amber-700’,
accentBorder: ‘border-amber-500/60’,
secondary:
‘bg-stone-100 hover:bg-stone-200 active:bg-stone-200 text-stone-900 border-stone-200’,
ghost: ‘hover:bg-stone-100 active:bg-stone-100 text-stone-900’,
danger: ‘text-red-600 hover:bg-red-500/10’,
check: ‘text-emerald-600’,
};

const display = {
fontFamily: ‘“Bricolage Grotesque”, system-ui, -apple-system, sans-serif’,
letterSpacing: ‘-0.02em’,
};
const body = {
fontFamily: ‘“DM Sans”, system-ui, -apple-system, sans-serif’,
};

// =========================================================
// RENDER
// =========================================================

const header = (
<header
className={`px-5 pt-5 pb-4 flex items-center justify-between border-b ${t.border}`}
>
<div className="flex items-center gap-3 min-w-0">
<div
className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${t.accentSoft}`}
>
<MapPin size={18} strokeWidth={2.25} />
</div>
<div className="min-w-0">
<div className={`text-xs uppercase tracking-widest font-semibold ${t.dim}`}>
{mode === ‘setup’ && ‘Setup’}
{mode === ‘counting’ && `Room ${currentIndex + 1} of ${rooms.length}`}
{mode === ‘review’ && ‘Review’}
</div>
<div className="text-base font-bold leading-tight truncate" style={display}>
{mode === ‘setup’ && ‘Add Rooms’}
{mode === ‘counting’ && (currentRoom?.name || ‘Counter’)}
{mode === ‘review’ && ‘All Rooms’}
</div>
</div>
</div>
{(mode === ‘counting’ || mode === ‘review’) && (
<div
className={`flex items-baseline gap-2 px-3.5 py-2 rounded-full border shrink-0 ${t.accentSoft}`}
>
<span className="text-xs uppercase tracking-widest font-semibold opacity-80">
Total
</span>
<span className="text-xl font-extrabold tabular-nums" style={display}>
{total}
</span>
</div>
)}
</header>
);

// ––––– SETUP MODE –––––
const renderSetup = () => (
<>
{header}
<main className="flex-1 overflow-y-auto px-5 py-4">
<div className={`text-sm leading-relaxed mb-4 ${t.muted}`}>
Add the rooms or areas you’ll walk through. You can also paste a list — one room per line.
</div>

```
    <div className="flex gap-2 mb-5">
      <input
        ref={inputRef}
        type="text"
        value={draftRoom}
        onChange={(e) => setDraftRoom(e.target.value)}
        onKeyDown={handleDraftKey}
        onPaste={handleDraftPaste}
        placeholder="Room name…"
        className={`flex-1 h-12 px-4 rounded-xl border-2 text-base font-medium transition-colors ${t.input}`}
        autoComplete="off"
        autoCapitalize="words"
        maxLength={60}
      />
      <button
        onClick={() => draftRoom.trim() && addRooms(draftRoom)}
        disabled={!draftRoom.trim()}
        className={`h-12 w-12 rounded-xl border-2 flex items-center justify-center disabled:opacity-30 active:scale-95 transition-transform ${t.secondary}`}
        aria-label="Add room"
      >
        <Plus size={22} strokeWidth={2.5} />
      </button>
    </div>

    {rooms.length > 0 ? (
      <>
        <div
          className={`text-xs uppercase tracking-widest font-semibold mb-3 px-1 ${t.dim}`}
        >
          {rooms.length} room{rooms.length === 1 ? '' : 's'}
        </div>
        <ul className="space-y-2">
          {rooms.map((room, idx) => (
            <li
              key={room.id}
              className={`slide-in flex items-center gap-3 p-3.5 rounded-2xl border ${t.panel} ${t.border}`}
            >
              <div
                className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold tabular-nums shrink-0 ${t.panelSub} ${t.dim}`}
                style={display}
              >
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0 font-semibold truncate">{room.name}</div>
              <button
                onClick={() => removeRoom(room.id)}
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${t.danger}`}
                aria-label={`Remove ${room.name}`}
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
          <li ref={listEndRef} />
        </ul>
      </>
    ) : (
      <div className={`text-center py-10 ${t.dim}`}>
        <div
          className={`w-14 h-14 rounded-2xl border flex items-center justify-center mb-3 mx-auto opacity-70 ${t.border}`}
        >
          <ListPlus size={22} />
        </div>
        <div className={`text-sm font-medium ${t.muted}`}>No rooms added yet</div>
        <div className="text-xs mt-1.5 opacity-80 leading-relaxed max-w-[16rem] mx-auto">
          Add rooms above, or just tap Start Counting to begin — you can name and add rooms as you go.
        </div>
      </div>
    )}
  </main>

  <section className={`px-5 pt-4 pb-6 border-t ${t.border} ${t.panel}`}>
    <button
      onClick={startCounting}
      className={`w-full h-28 rounded-3xl font-extrabold text-2xl flex items-center justify-center gap-3 active:scale-95 transition-transform shadow-lg ${t.accent}`}
      style={display}
    >
      <Play size={32} strokeWidth={3} fill="currentColor" />
      <span>Start Counting</span>
    </button>
  </section>
</>
```

);

// ––––– COUNTING MODE –––––
const renderCounting = () => (
<>
{header}
<main className="flex-1 overflow-y-auto px-5 py-4">
<div className="flex items-center justify-between mb-3 px-1">
<div className={`text-xs uppercase tracking-widest font-semibold ${t.dim}`}>
{visitedCount} of {rooms.length} visited
</div>
<button
onClick={finish}
className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors font-semibold border ${t.ghost} ${t.borderSoft}`}
>
<Flag size={12} strokeWidth={2.5} />
Finish now
</button>
</div>

```
    <ul className="space-y-2">
      {rooms.map((room, idx) => {
        const isCurrent = idx === currentIndex;
        const isCompleted = room.visited && !isCurrent;
        const isUpcoming = !room.visited && !isCurrent;
        return (
          <li key={room.id}>
            <button
              onClick={() => jumpToRoom(idx)}
              className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all text-left active:scale-95 ${
                isCurrent
                  ? `${t.panel} ${t.accentBorder} shadow-md`
                  : `${t.panel} ${t.borderSoft} ${t.ghost}`
              }`}
            >
              <div className="shrink-0">
                {isCompleted && <Check size={20} strokeWidth={2.75} className={t.check} />}
                {isCurrent && (
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center ${t.accent}`}
                  >
                    <ChevronRight size={14} strokeWidth={3} />
                  </div>
                )}
                {isUpcoming && <Circle size={20} strokeWidth={2} className={t.dim} />}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className={`font-semibold truncate ${
                    isUpcoming ? t.muted : ''
                  }`}
                >
                  {room.name}
                </div>
                <div className={`text-xs mt-0.5 font-medium ${t.dim}`}>
                  {isCurrent ? 'Counting now' : isCompleted ? 'Done' : 'Up next'}
                </div>
              </div>
              <div
                className={`text-2xl font-extrabold tabular-nums leading-none ${
                  isUpcoming ? t.dim : ''
                }`}
                style={display}
              >
                {isUpcoming && room.count === 0 ? '–' : room.count}
              </div>
            </button>
          </li>
        );
      })}
    </ul>

    {/* inline add-room mid-walk */}
    <div className={`flex gap-2 mt-4 pt-4 border-t ${t.borderSoft}`}>
      <input
        type="text"
        value={draftRoom}
        onChange={(e) => setDraftRoom(e.target.value)}
        onKeyDown={handleDraftKey}
        onPaste={handleDraftPaste}
        placeholder="Add another room…"
        className={`flex-1 h-11 px-4 rounded-xl border-2 text-sm font-medium transition-colors ${t.input}`}
        autoComplete="off"
        autoCapitalize="words"
        maxLength={60}
      />
      <button
        onClick={() => draftRoom.trim() && addRooms(draftRoom)}
        disabled={!draftRoom.trim()}
        className={`h-11 w-11 rounded-xl border-2 flex items-center justify-center disabled:opacity-30 active:scale-95 transition-transform ${t.secondary}`}
        aria-label="Add room"
      >
        <Plus size={20} strokeWidth={2.5} />
      </button>
    </div>
  </main>

  {/* Bottom action zone */}
  <section
    className={`px-5 pt-5 pb-6 border-t space-y-4 ${t.border} ${t.panel}`}
  >
    {/* Big count + decrement */}
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0 flex-1">
        {renamingId === currentRoom?.id ? (
          <div className="flex items-center gap-1.5 mb-1">
            <input
              autoFocus
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={saveRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); saveRename(); }
                if (e.key === 'Escape') { e.preventDefault(); cancelRename(); }
              }}
              className={`flex-1 min-w-0 h-8 px-2 -mx-2 rounded-md border-2 text-xs uppercase tracking-widest font-semibold ${t.input}`}
              maxLength={60}
            />
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={cancelRename}
              className={`shrink-0 w-7 h-7 rounded-md flex items-center justify-center ${t.ghost}`}
              aria-label="Cancel rename"
            >
              <X size={14} strokeWidth={2.5} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => currentRoom && startRename(currentRoom.id)}
            className={`flex items-center gap-1.5 mb-1 -mx-1 px-1 py-0.5 rounded-md max-w-full ${t.ghost} transition-colors`}
          >
            <span
              className={`text-xs uppercase tracking-widest font-semibold truncate ${t.dim}`}
            >
              {currentRoom?.name || ''}
            </span>
            <Pencil size={11} strokeWidth={2.5} className={`shrink-0 ${t.dim} opacity-60`} />
          </button>
        )}
        <div
          key={currentRoom?.count}
          className="num-pop text-7xl font-extrabold tabular-nums leading-none"
          style={display}
        >
          {currentRoom?.count ?? 0}
        </div>
      </div>
      <button
        onClick={decrementCurrent}
        disabled={!currentRoom || currentRoom.count === 0}
        className={`shrink-0 h-20 w-20 rounded-2xl border-2 flex items-center justify-center disabled:opacity-30 active:scale-95 transition-transform ${t.secondary}`}
        aria-label="Decrement"
      >
        <Minus size={32} strokeWidth={2.75} />
      </button>
    </div>

    {/* Prev / Next row */}
    <div className="grid grid-cols-2 gap-2">
      <button
        onClick={goToPrev}
        disabled={currentIndex === 0}
        className={`h-20 rounded-2xl border-2 font-semibold text-base flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-transform ${t.secondary}`}
      >
        <ChevronLeft size={20} strokeWidth={2.5} />
        Previous
      </button>
      <button
        onClick={markVisitedAndAdvance}
        className={`h-20 rounded-2xl border-2 font-semibold text-base flex items-center justify-center gap-1.5 active:scale-95 transition-transform ${t.secondary}`}
      >
        {currentIndex >= rooms.length - 1 ? (
          <>
            <Flag size={18} strokeWidth={2.5} />
            Finish
          </>
        ) : (
          <>
            Next
            <ChevronRight size={20} strokeWidth={2.5} />
          </>
        )}
      </button>
    </div>

    {/* BIG +1 — thumb zone */}
    <button
      onClick={incrementCurrent}
      className={`w-full h-28 rounded-3xl font-extrabold text-2xl flex items-center justify-center gap-3 active:scale-95 transition-transform shadow-lg ${t.accent}`}
      style={display}
    >
      <Plus size={40} strokeWidth={3} />
      <span>Add Person</span>
    </button>
  </section>
</>
```

);

// ––––– REVIEW MODE –––––
const renderReview = () => (
<>
{header}
<main className="flex-1 overflow-y-auto px-5 py-4">
<div
className={`rounded-3xl border-2 px-5 py-6 mb-5 flex items-baseline justify-between ${t.accentSoft}`}
>
<div>
<div className="text-xs uppercase tracking-widest font-semibold opacity-80">
Grand Total
</div>
<div className="text-xs mt-1 opacity-70">
across {rooms.length} room{rooms.length === 1 ? ‘’ : ‘s’}
</div>
</div>
<div
className="text-6xl font-extrabold tabular-nums leading-none"
style={display}
>
{total}
</div>
</div>

```
    <div className={`text-xs uppercase tracking-widest font-semibold mb-3 px-1 ${t.dim}`}>
      Breakdown
    </div>
    <ul className="space-y-2">
      {rooms.map((room, idx) => (
        <li
          key={room.id}
          className={`flex items-center gap-3 p-3.5 rounded-2xl border ${t.panel} ${t.border}`}
        >
          <div
            className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold tabular-nums shrink-0 ${t.panelSub} ${t.dim}`}
            style={display}
          >
            {idx + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{room.name}</div>
            {!room.visited && (
              <div className={`text-xs mt-0.5 font-medium ${t.dim}`}>Not visited</div>
            )}
          </div>
          <div
            className={`text-3xl font-extrabold tabular-nums leading-none ${
              room.count === 0 ? t.dim : ''
            }`}
            style={display}
          >
            {room.count}
          </div>
        </li>
      ))}
    </ul>
  </main>

  <section className={`px-5 pt-4 pb-6 border-t space-y-2 ${t.border} ${t.panel}`}>
    <button
      onClick={copyResults}
      className={`w-full h-14 rounded-2xl border-2 font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform ${t.secondary}`}
    >
      <Copy size={16} strokeWidth={2.5} />
      {copiedFlash ? 'Copied!' : 'Copy results'}
    </button>
    <div className="grid grid-cols-2 gap-2">
      <button
        onClick={continueCounting}
        className={`h-14 rounded-2xl border-2 font-semibold text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-transform ${t.secondary}`}
      >
        <ChevronLeft size={16} strokeWidth={2.5} />
        Keep counting
      </button>
      <button
        onClick={resetCountsKeepRooms}
        className={`h-14 rounded-2xl border-2 font-semibold text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-transform ${t.secondary}`}
      >
        <RotateCcw size={16} strokeWidth={2.5} />
        Recount
      </button>
    </div>
    <button
      onClick={startOver}
      className={`w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5 transition-colors ${t.danger}`}
    >
      <Trash2 size={14} strokeWidth={2.5} />
      Clear everything
    </button>
  </section>
</>
```

);

return (
<div className={`min-h-screen ${t.page}`} style={body}>
<style>{`@keyframes pop { 0% { transform: scale(1); } 35% { transform: scale(1.07); } 100% { transform: scale(1); } } .num-pop { animation: pop 0.18s ease-out; } @keyframes slideIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } } .slide-in { animation: slideIn 0.25s ease-out; } button:focus { outline: none; } button:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; } input:focus { outline: none; } button, input { touch-action: manipulation; }`}</style>

```
  <div className="max-w-md mx-auto min-h-screen flex flex-col">
    {mode === 'setup' && renderSetup()}
    {mode === 'counting' && renderCounting()}
    {mode === 'review' && renderReview()}
  </div>
</div>
```

);
}