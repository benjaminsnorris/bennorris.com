# Interstitial Time — Design Spec & Handoff

**What this is.** A record of how we designed a tool for the scattered 2–10 minute gaps in Ben's day, what parameters produced the current build, and which of those parameters are worth changing on a future pass. Hand this to a fresh session to iterate.

**How to use it.** Sections 2–3 are the reusable method. Section 4 is the specific *mix* we chose this round — change any of it and re-derive from there. Sections 7–9 are what exists now. Section 10 is what's still open.

---

## 1. The goal, as stated

Use the scattered few-minute gaps throughout the day in a way that helps Ben's brain and feels at least somewhat productive. ADHD-friendly: must not open a rabbit hole. Phone is easiest; analog ideas welcome. Cost is not a constraint — free, subscription, or custom-built are all on the table.

Explicit instruction from Ben: **design the selection process before generating ideas.** Do not skip to a list. This held up — the process eliminated most of the obvious ideas before they were proposed.

---

## 2. The method (reusable)

Run in this order. The ordering is the point; reversing steps 1 and 3 produces generic answers.

1. **Characterize the slots, not the activities.** Ideas fail on physical fit, not quality. For each recurring gap: duration, hands free or not, seated or moving, socially observable, headphones viable, screen viable.
2. **Write the disqualifiers before the candidates.** ADHD-specific kill rules, stated in advance so they can't be rationalized away when an appealing idea shows up.
3. **Define what "productive" means.** The highest-leverage decision. Four candidate meanings, and they conflict: **accumulating** (compounds), **discharging** (clears small debts), **restoring** (regulates for the next focus block), **noticing** (reflection, attention, prayer).
4. **Pre-assign one default per slot shape.** Choosing in the moment is what kills these systems. The phone wins by default because it's the zero-decision option; the only way to beat it is to remove the decision, not to add willpower.
5. **Trial with a kill criterion written in advance.** Otherwise the thing limps along on guilt.

---

## 3. Findings that should survive any change of mix

- **Slots collapse into three shapes, not six.** Screen (private, hands free, 3–7 min), Walking (eyes up, audio in / voice out, 5–10 min), Scrap (2–5 min, public or covert, high interruption risk).
- **Accumulating and restoring pull against each other.** Anything that compounds is engaging, and engaging is what turns 3 minutes into 15 and leaves you more wound up than you started. The walking shape is where this tension dissolves — walking is already regulating, so a compounding activity is safe there in a way it wouldn't be in a chair.
- **The walking shape is the largest block and the worst-served by phone defaults.** Design here first.
- **Almost nothing compounds in the Scrap shape.** Expect it to hold one low-stakes default, likely analog.
- **Invisible persistence kills the value.** If compounding is ranked first but the accumulation can't be seen, the thing will feel pointless and get abandoned. Container design is not an afterthought.

---

## 4. Parameters for this round — **change these to get a different tool**

### 4a. Slot inventory (Ben's actual gaps)

| Slot | Length | Shape | Notes |
|---|---|---|---|
| Bathroom | 3–5 min | Screen | Private, hands free |
| Before a call | 3–7 min | Screen | Private, hands free |
| Standing in line | 2 min | Scrap | One hand, public |
| Boring meeting | 3–5 min | Scrap | Covert, partial attention |
| Walking break | 3–5 min | Walking | Eyes up, alone |
| Walking the dog | 5–10 min | Walking | Eyes up, alone, longest slot |

### 4b. "Productive" ranking (Ben's, this round)

1. Accumulating
2. Restoring
3. Noticing
4. Discharging

**Consequence:** the work queue is out by rule. No Slack, no email, no task triage — even though they're the most available thing on the phone. A future pass that promotes discharging would invert this and produce a completely different tool.

### 4c. Meeting-slot rule

In bounds **only if invisible and meeting-adjacent.** Time partially committed to someone else can't be spent on unrelated work. This is why meeting mode uses a separate deck of questions about the meeting you're sitting in.

### 4d. Container

Options offered were bennorris.com, a single running note, or a purpose-built app — Ben chose **purpose-built app first**, with storage/export figured out downstream. Presented as OR, not AND.

**Standing caution:** building the app is the appealing failure mode. It feels productive and defers the habit. Persistence and export were built in from day one specifically so the app can't become a dead end.

---

## 5. Derived constraint spec

Invariant across mixes:

- Zero resume cost — nothing to remember, no place you left off
- Finite by construction — a hard bottom, never a feed
- Survives interruption mid-action
- No login, no setup
- Decision-free entry — opens straight into the activity

Mix-dependent (derived from 4b/4c):

- Compounds, but through a low-engagement channel
- Leaves a visible, exportable trace
- Never touches the work queue
- Meeting content is about the meeting or doesn't exist

---

## 6. Interaction archetypes

Three candidates cleared the spec. **Ask** was built; the others are unbuilt and specified enough to pick up.

| Archetype | Mechanic | Compounds by | Status |
|---|---|---|---|
| **Ask** | Serves one question from a rotating deck; you answer in a sentence or two | Accumulating raw material for writing | Built (v1) |
| **Recall** | Serves one card from something already learned or written; you reconstruct before revealing | Consolidating | Not built |
| **Loop** | You leave one open question at the end of a deep work block; app serves it back in the next gap | Tying gaps to live work | Not built |

Ask was chosen because it feeds bennorris.com directly and works while walking.

---

## 7. Ask v1 — what exists

Single self-contained HTML file, `ask.html`. No build step, no dependencies, no API calls.

**Behavior**

- Opens directly to a question. No home screen, no choosing.
- **Random by default, choosable after.** Entry is always a random question across the six general decks — the label reads "Home · surprise me". Tapping the deck label opens the topic picker; choosing one narrows to that deck for the rest of the session. "Surprise me" returns to random. Reopening the app resets to random, so the default is never something you have to maintain.
- One answer ends the session. Done screen says to put the phone away. "One more" exists but is deliberately small and quiet.
- Two skips maximum, then the button reads "This is the one." — prevents question-shopping. Skips stay inside the chosen topic.
- **Answers** view lists everything; "Copy as markdown" exports all entries, oldest first, question as H2.
- Persistence: single storage key holding entries plus the last 40 questions served (repeat avoidance). One read on open, one write per save.
- When storage is unavailable, degrades to session-only: rail shows "session only", done screen says so, and a copy-all button appears. A failed write never loses the typed answer.

**Decks** — writing (24), people/leadership (22), craft (18), faith (18), home/family (14), noticing (14), meeting (20). 130 total; 110 in the random rotation. Questions are answerable in one or two sentences and stay under ~85 characters so they don't overflow the card. Deliberately excluded: anything inviting rumination or self-criticism.

**"This meeting" is picker-only.** It never appears in the random rotation, because meeting questions are only appropriate when you're actually in a meeting. Reaching for it is itself the signal that the §4c rule is satisfied.

**Design tokens** — every color is a token with a paired dark value; system preference switches automatically via `prefers-color-scheme`. Changes belong in the `:root` block, not in rules.

| Token | Light | Dark |
|---|---|---|
| `--ground` | `#E4E7E4` pale ash-green | `#101417` near-black, green cast |
| `--card` | `#FAFAF8` | `#191F22` |
| `--ink` | `#232A2E` | `#E6E9E4` |
| `--moss` | `#3F5F4E` accent | `#9CC0A8` sage |
| `--on-moss` | `#F4F6F3` | `#101619` |
| `--muted` | `#5C665F` | `#8B958E` |
| `--faint` | `#6F7A73` | `#78837C` |
| `--line` | `#C9D0C9` | `#2B3438` |
| `--ghost` | `#B4BCB6` | `#4E5A54` |
| `--off` / `--on-off` | `#C2CAC4` / `#F0F2EF` | `#2E3639` / `#6E7873` |
| `--wash` | `#EDF1EE` | `#222B2C` |

```
display Newsreader 300, 29px/1.28 (25px under 380px)
utility IBM Plex Mono 11px, .14em tracking, uppercase
```

Dark mode inverts the identity rather than switching to a generic dark theme: the accent moves *up* to a sage so it stays in the same color family, and the Save button flips to dark text on sage. All text pairings clear WCAG AA (≥4.2:1) in both modes — the small mono labels are the ones to re-check after any token change, since they were the failing case.

The signature idea: the whole screen is one card, dealt once. Restraint is the aesthetic — the boldness is spent on the large serif question and nothing else.

---

## 8. Technical findings

- **`window.storage` is unavailable in the Claude mobile app's artifact context.** It failed there in testing. Detect with a capability check and degrade; there is no workaround from inside the artifact.
- **`localStorage` and `sessionStorage` do not work in Claude artifacts.** Don't reach for them.
- **Text-to-speech was built and then removed.** `SpeechSynthesisUtterance` is free and native, roughly fifteen lines, no library. It came out because it only solved half the walking problem and didn't earn the space. Don't rebuild it without a reason that survives §10's trial. iOS requires a user gesture, so auto-speak on open was never an option anyway.
- **Speech *recognition* is unreliable in iOS webviews.** Hands-free answering is not solvable this way. Realistic walking flow stays: read the question, dictate into a trusted notes app, paste later — or use the keyboard mic, which requires pulling the phone out.
- If persistence matters more than convenience, host it under bennorris.com rather than living in the artifact sandbox.

---

## 9. Open threads

Ordered by expected value.

1. **Extend random-then-choose across interaction types.** The menu-vs-randomizer tension is now **resolved as a pattern**: randomize by default, let the choice happen *after* the thing is already on screen. It costs nothing when you don't want it and eliminates the in-the-moment decision that §2 step 4 warns about. Currently applied to topics within Ask; the same picker should extend to Ask / Recall / Loop once those exist. Still open: whether weighting shifts by time of day, since morning and 9pm gaps want different things.
2. **Build Recall and Loop.** Loop is the more interesting of the two because it links the gaps to live work; it needs a capture point at the end of a focus block, which is a new surface.
3. **Different rankings of "productive."** Re-run §2 step 3 with discharging or noticing on top and see what falls out. A noticing-first pass would likely produce something much closer to analog.
4. **The Scrap shape is unserved.** Current best guess: one physical card in the pocket carrying the question of the week. Two minutes in a line is enough to look at it and nothing else.
5. **Analog options were never actually generated.** Ben asked for them and the conversation went app-first. Genuine gap.
6. **Answer field sizing for dictation-length answers.** Untested against real dictation.

---

## 10. Not done — the trial

Step 5 of the method was never executed. Nothing here has been tested against a real week. Before adding features, a future session should push for:

- One candidate per slot shape, pre-assigned
- A two-week window
- A kill criterion written down in advance — what specifically counts as "this isn't working"

Feature work in place of a trial is the most likely way this project quietly dies.
