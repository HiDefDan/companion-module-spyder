# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
History starts here — earlier versions weren't tracked in this file.
Everything below is in-progress dev-mode work against a live connection;
it gets one real version bump when it's actually ready to PR upstream,
not one per commit.

## [Unreleased]

### Migration: @companion-module/base 1.14.1 -> 2.1.3 (API v2)
Phase 1 of a two-phase upgrade -- gets the module running on the new major
API with equivalent behavior to before. Phase 2 converts the per-key
presets to the new "layered" graphics preset format so they can set a
font, which only exists on that path (see below).

**Phase 2:** The per-key command-key presets are now `type: 'layered'`,
hand-authoring two graphics elements (`bg`, a box; `label`, a text
element) instead of the flat `style` object. This is the only reason
for Phase 2 existing: the plain `simple`/`CompanionButtonStyleProps`
style has no font field at all, in 1.x or 2.x -- font only exists on
this layered/graphics path. `label` sets `font: 'companion-mono'`
directly (no config toggle -- a stated preference, not asked to be
configurable). `is_selected_key`'s feedback entry on these presets
uses the layered equivalent of the "needs its own style" fix from
earlier: `styleOverrides: [{elementId: 'bg', elementProperty: 'color',
override: {value: 0xff9f40, isExpression: false}}]` instead of a flat
`style` object, overriding only the background on selection -- text
stays black/mono in both states. The `override` value must be the full
`{value, isExpression}` wrapper, not a plain value (unlike everywhere
else in this codebase that takes a `CompanionGraphicsElementValue`,
e.g. every field in this preset's own `elements` above) -- a plain
value here is silently dropped by Companion's own preset-conversion
code before the feedback is even created, which doesn't fail loudly;
it just makes the feedback disappear from the button entirely. Found
by reading Companion's actual bundled conversion function, not just
the (more permissive-looking) `@companion-module/base` type.

Per explicit request, mono font is now applied everywhere, not just
the per-key presets: `force_server_save`, `cue_rev`, `cue_fwd`, and
`rrl_refresh_both` are also now `type: 'layered'` with a `bg` box +
mono `label` text element, matching their previous colors/text exactly
-- no visual change besides the font.

**Correction:** the `sav_last_time`-via-`styleOverrides` approach for
`force_server_save` (reasoned from source, flagged as unconfirmed)
turned out not to work live -- the button rendered the literal
placeholder override text, not the feedback's actual callback output.
Replaced entirely with a new `LastSave` module variable
(`spyder.js`: a `STATIC_VARIABLE_DEFS` object merged into every
`variableDefs` rebuild so it survives the command-key/source list
being wholesale-replaced there, set on every successful `SAV` via
`getLastSaveTime()`, initialized to `''` on connect) baked directly
into the preset's label text as `$(spyder:LastSave)` -- the same
live-variable-in-layered-text mechanism already proven by the per-key
presets' `cKey_rID_<id>` text, sidestepping the advanced-feedback-in-
layered-preset question entirely rather than continuing to debug it.
`force_server_save`'s `feedbacks` array is now empty; `sav_last_time`
itself is untouched in `feedbacks.js` and still works normally if
hand-added to any button (the originally-proven use case).

One minor cosmetic side effect: the label is now always 3 lines
(`<connection label>`, `SAVE`, `$(spyder:LastSave)`) including a blank
third line before the first save this connection, rather than growing
from 2 lines to 3 only once there's something to show.

Initially installed 2.2.1, which loaded on this Companion build with
"Module Api version is too new/old: spyder 2.2.1" -- the base package's
own README has a Companion<->module-base compatibility table that says
Companion v5.0 supports module-base v1.0-v2.1 only; v2.2 needs v5.1
(itself listed "unconfirmed" there). Downgraded to 2.1.3 (the latest
2.1.x), pinned with `~2.1.3` rather than `^2.1.3` so a future install
can't silently drift back into the unsupported 2.2.x line. Diffed every
relevant .d.ts between 2.1.3 and 2.2.1 before downgrading -- identical
except `color`/`bgcolor` typed as plain `number` (2.1.3) vs `number |
string` (2.2.1, both still accept the numbers this module uses) and two
2.2-only preset additions this module doesn't use (`notes`,
`storeResult`) -- so no code changes were needed beyond the version bump.

- `package.json`: `@companion-module/base` ^1.8.0 -> ~2.1.3,
  `@companion-module/tools` ^2.8.0 -> ^3.1.1 (required for the manifest
  validator to even load -- 2.8.0 imports `validateManifest` from a path
  2.1.3/2.2.1 no longer export it from).
- `companion/manifest.json`: added required top-level `"type":
  "connection"`; `runtime.type` "node18" -> "node26" (node26 "corresponds
  to Companion 5.0" per Bitfocus's own docs, and the live server here is
  5.0.5, so no runtime-support blocker).
- `spyder.js`: removed `runEntrypoint`, now `export default SpyderInstance`
  + `export const UpgradeScripts = Upgradereg` (empty array, unchanged).
  `udp.send()` -> `udp.sendAsync()` (send is now synchronous in 2.x;
  sendAsync is the new promise-based equivalent, keeping `sendCmd`'s
  await-based error handling intact). `variableDefs` changed from an
  array of `{name, variableId}` to an object keyed by variable id (new
  `setVariableDefinitions` shape). `setPresetDefinitions` is now a
  2-argument call (`structure`, `presets`) instead of one flat object.
- `presets.js`: `GetPresetDefinitions` now returns `{structure, presets}`
  instead of just `presets`. Each preset's `type` changed from `'button'`
  to `'simple'` (required). The flat per-preset `category` field is gone
  -- replaced by a `structure` array of sections (Utility, Script Cue,
  Command Keys) built alongside the presets and passed as
  `setPresetDefinitions`'s first argument.
- `actions.js`: `sra`'s callback no longer calls
  `context.parseVariablesInString` -- Companion now resolves
  `$(...)` variables/expressions in option values automatically before
  the callback runs, so `action.options.source` already arrives resolved.
- `yarn.lock`: updated via `npm install` (no local yarn/corepack
  available) -- correct versions, but npm-flavored resolution
  (registry.npmjs.org URLs, not yarn-native). Needs a real `yarn install`
  from a machine with yarn/corepack to regenerate properly before any
  upstream PR.

Verified via `node --check` on every changed file, a clean
`companion-module-check` manifest validation, a full
`companion-module-build --dev` (real esbuild bundle through the actual
entrypoint) with no errors, and now confirmed live: connects, polls
(`RLC`/`RRL`/`RRD`/`SCR`), and regenerates presets correctly against
the real Companion 5.0.5 server.

The first live attempt crashed Companion's own module-host harness
with `TypeError: Promise.withResolvers is not a function` under
Node.js v18.20.8, despite the manifest declaring `node26` (which this
Companion install does have bundled, alongside node18/node22, in its
`node-runtimes` directory). Root cause: Companion resolves a dev
module's Node runtime from its own in-memory copy of that module's
manifest, populated when it scans the developer-modules path -- not
re-read on every connection start/restart. Toggling the connection
re-used the stale pre-migration (`node18`) manifest data; a full
Companion **application** restart forced a rescan and picked up the
current manifest correctly.

Also fixed: `sav_last_time` (an `advanced` feedback) was missing the
new `affectedProperties: ['text']` -- without it Companion logged a
"missing an array for affectedProperties" warning on every connect.

### Added
- `sra` action (Source Apply): assigns a named source to one or more layers,
  auto-escaping in-value spaces to the literal `%20` the protocol requires
  and applying the existing human-to-protocol layer (+1) offset.
- Every real layer (per `RLC`, see below) is now polled automatically via
  `RLS` -- no config needed.
- `layer_source_is` feedback: styles a button based on whether a layer's
  live, device-reported source matches a given name (dropdown-fed, same
  as `sra`'s "Source Name", `allowCustom` still on).
- Sources are now polled too (`RRL 6`, same add/rename/delete tracking as
  command keys), exposed as `src_<N>` variables, and feed the `sra`
  action's "Source Name" option as a live dropdown (still `allowCustom`,
  so a typed name or `$(...)` expression still works).
- "Poll interval (ms)" connection config field (default 2500, 500-30000):
  affects feedback latency.
- `RLC` (Request Layer Count) is now parsed at connect (minus the 2
  background layers Spyder always reports) and used to (a) decide the
  full layer range to auto-poll, above, and (b) validate `sra`'s layer
  number(s) before sending -- out-of-range layers are dropped
  individually (with a warning logged) rather than silently sent to a
  layer that doesn't exist. Neither applies until the first `RLC`
  response lands.

- `rrl_refresh` action (Refresh Sources / Command Keys Now): multi-select
  which register type(s) (Command Keys, Sources) to re-fetch immediately,
  for right after adding/renaming/deleting one rather than waiting out
  the cache interval below. Also available as a preset
  ("Refresh Sources & Command Keys Now", Utility category).
- `sav` action (Force Server Save): no options, just sends `SAV` to force
  the Spyder to persist current config/state to non-volatile storage.
  Also available as a preset ("Force Server Save", Utility category).
- `sav_last_time` feedback ("Last Save Time"): advanced feedback that
  appends `last:HH:MM` to the button text once a `SAV` has gotten a
  Success response this connection; no override before that. Wired
  into the "Force Server Save" preset by default.
- `GetPresetDefinitions` now takes `self`, so preset text can use
  `self.label` (the connection's own name) -- the Force Server Save
  preset's text is now `<connection label>\nSAVE` (and
  `<connection label>\nSAVE\nlast:HH:MM` once saved), rather than a
  fixed "Force\nServer Save" label.
- `recall_at_cue` action (Recall Command Key at Cue): dropdown-fed by
  live command keys (same id/label convention as `sra`'s source
  dropdown), sends `RSC <id> <cue> R` and records `{registerId, cue}`
  as `self.lastRecalled` -- Spyder's `ASC` has no script-ID argument
  of its own, so this is the module's local stand-in for the ST420
  Shotbox's "selected key" concept.
- `is_selected_key` feedback (Is Selected Command Key): highlights
  whichever Command Key matches `self.lastRecalled`. Local memory
  only, same caveat as the Shotbox's own red-key indicator -- not a
  live readback from Spyder.
- `cue_fwd`/`cue_rev` actions (Cue Advance/Cue Back, FWD/REV to match
  Shotbox naming): send `ASC +1`/`ASC -1` and nudge
  `self.lastRecalled.cue`, clamped at 0 and (where known) that key's
  `numCues` from `RRD`. Both also available as presets.
- "Default recall cue" connection config field (0-999, default 0):
  `recall_at_cue`'s and the per-key presets' default cue, instead of a
  hardcoded 0 -- matches the Shotbox having this as a device-level
  setting rather than per-key.
- One preset per currently-discovered command key (category "Command
  Keys"), pre-wired with `recall_at_cue` + `is_selected_key` for that
  key -- mirrors the Shotbox's "Read CMD Keys" auto-populate. Kept
  live: regenerated (with an `info` log) whenever the command-key list
  changes, not just at connect. A button already dragged from an
  older version does not auto-update/auto-remove if its key's
  RegisterID changes -- Companion presets are templates, not
  live-bound after being placed. A rename alone does still reach
  placed buttons, though: the preset's text is the live
  `cKey_rID_<RegisterID>` variable, not a literal string baked in at
  drop time.
- Per-key preset idle style is now yellow bg (`0xffff80`) / black text,
  matching colors pulled from the user's own hand-styled button export
  (also used for `is_selected_key`'s orange/black, above). An earlier
  attempt also baked in a decorative keycap/LCD-bezel `png64` graphic;
  removed per feedback -- didn't earn its place.

### Changed
- All actions now go through `cueCmd` instead of calling `sendCmd`
  directly (one-line fix: `compileActionDefinitions`'s `sendCmd` alias
  now points at `self.cueCmd`). The protocol gives responses no sequence
  number or echo of the originating request, so correctness depends
  entirely on never having more than one command outstanding at a time;
  every stock action (not just `sra`) was bypassing that discipline and
  could previously fire while a poll response was still in flight.
- Every send is now logged readably at `info` (e.g. `Sending: Source
  Apply (SRA "WF PGM" 6)` -- mnemonic expanded via a new `COMMAND_NAMES`
  lookup, and any `%20`-escaped argument decoded + quoted via a new
  `humanizeArgs()` so it reads as one value rather than looking like
  extra arguments; display-only, never affects what's sent), not just
  as hex at `debug`. Every response is now logged too (previously not
  logged at all, including its own `%20` args humanized the same way),
  decoded against the protocol's result-code table and leveled `info`
  (Success/Empty) or `warn` (everything else, including a response
  that arrives with nothing pending to match it to).
- New `describeResponseBody()` further decodes the response for the
  five commands this module sends itself (`RLC`/`RLS`/`RRL`/`RRD`/`SCR`)
  into named fields, e.g. `SCR 0 R` -> `Success -- active=yes` instead
  of `Success -- 0 1`. Action commands have a bare `<Result Code>`
  response per the manual, so they're unaffected -- nothing more to
  decode there.
- Removed the `RBL` (Request Basic Preset List) call at connect. It was
  already in the stock module, inherited unchanged, but never had a
  response handler -- nothing used it, so no reason to keep sending it.
- `sra` now immediately follows its `SRA` send with an `RLS` for exactly
  the layer(s) it just applied, so `layer_source_is` confirms the change
  right away instead of waiting on the next periodic poll.
- Sources (`RRL 6`), command keys (`RRL 4` + `RRD`/`SCR` per key), and
  now also the per-layer `RLS` sweep are all cached/throttled instead of
  re-fetched on every poll tick -- refreshed at most once every
  `DISCOVERY_INTERVAL_MS` (60s, independent of the poll interval), since
  none of them change outside of this module's own actions. That periodic
  sweep is now a safety net for a change made some other way (Spyder
  console, a script, `FKR`...), not the primary feedback path -- that's
  the `sra`-triggered check above.
- `updateStatus` now only fires on a real transition (new `setStatus`
  wrapper tracks the last status/message). Previously the success branch
  called `updateStatus(Ok, 'Connected')` on every single response, so a
  poll cycle sending a dozen-plus commands logged "Connected" a
  dozen-plus times for no reason. Note this status was never a real
  connection check anyway -- UDP has no connection state; it only ever
  meant "the last command got a well-formed success response."
- Outgoing commands are now sent as an explicit byte buffer (fixed header +
  command bytes) instead of a plain JS string, so command text reaches the
  device byte-for-byte regardless of Node's string-encoding defaults.
- Each command key now exposes exactly one `cKey_rID_<RegisterID>` variable
  (named `r_name_*` until this was renamed for clarity), labelled
  "Command Key: <name>" (kept in sync if renamed in Spyder Studio).
  Previously a second, duplicate variable (`s_name_<ScriptID>`) was also
  created for the same key, since Register ID and Script ID are separate
  numbering spaces the Spyder uses for the same object; the redundant
  Script-ID-keyed `SCR` poll that fed it is also removed. Addressing a key
  by Script ID (via `script2reg`) still works for feedbacks/actions that
  want it.
- Deleting a command key on the Spyder now removes its variable on the
  next poll instead of leaving a stale one behind until the connection
  was restarted (`RRL 4 -1` is the full register list, so anything
  previously tracked that's absent from a response has been deleted).
- Factored the add/rename/delete tracking shared by command keys and
  sources into one `syncRegisterStore` helper instead of duplicating it;
  removed a dead commented-out register-polling block it superseded.
- `sra`'s "Layer(s)" field has a regex rejecting values that could never
  be a real layer (zero, negative, leading zeros), on top of the live
  `RLC` bounds check above.

### Fixed
- `is_selected_key`'s `defaultStyle` now includes an explicit numeric
  `size: 14` instead of leaving it unset (an earlier attempt at this
  fix used `size: 'auto'`, which is valid for a button's own Style
  tab but not for Companion's per-feedback "Layered Styles Overrides"
  text-size field, which is numeric-only). Without a resolvable
  number there, that field showed `NaN`, and applying the feedback
  blanked the button's background/text once it went true.
- `is_selected_key`'s `defaultStyle` colors changed from red bg/white
  text to orange bg (`0xff9f40`)/black text, pulled directly from an
  exported Companion config of a button the user hand-styled -- the
  prior red/white combo (chosen without that reference) looked wrong
  against this module's generated preset/base styling.
- Removed `defaultStyle.size` entirely rather than fixing its value a
  third time. The underlying NaN/blanked-button symptom this chased
  turned out to be a stale per-button style override frozen on one
  test button since an earlier module version -- `defaultStyle` only
  seeds a feedback instance's style the moment it's first added to a
  button, so none of these `defaultStyle` edits were ever reaching
  that already-placed instance. A fresh instance doesn't need a size
  override at all: leaving it unset lets the selected state inherit
  the idle style's `size: 'auto'` instead of forcing a fixed point
  size (which otherwise rendered noticeably smaller than idle text).
- One instance of "selected" highlighting not appearing turned out to
  be a Command Key mismatch between the feedback and the button's own
  "Recall Command Key at Cue" action, not a module bug -- worth
  checking both match if a button's highlight never seems to fire.
- Found the real bug behind the rest: even a freshly-dragged per-key
  preset's `is_selected_key` feedback rendered with no visible effect
  at all. A boolean feedback's `defaultStyle` only auto-populates a
  button's style overrides when the feedback is added through the
  Companion UI by hand -- one arriving pre-attached inside a preset
  needs its own `style` on that `CompanionPresetFeedback` entry, which
  the per-key presets weren't setting. Added it (same orange/black as
  the feedback's own `defaultStyle`, kept in sync by comment).

### Layer Positioning: Select Target (Phase 1)
First slice of absolute-pixel layer/clone positioning for multi-display
composited pixelspaces, replacing the imprecise relative-coordinate clone
placement previously used. This phase only covers choosing *which* layer
is the current nudge/placement target and showing its live state -- the
actual `KPS`/`LCC` nudge and clone-offset actions are a later phase.
Protocol primitives (`KPS`, `LCC`, `RLK`, `RPD`, `RSF`) were verified
live against the real frame with standalone out-of-band probe scripts
(not part of this module) before any of this was written; notably,
`LCC`'s Clone Offset can be written in real pixels but is always read
back from `RLK` in a different, pixelspace-relative normalized unit --
there is no way to read a clone's offset back in pixels, so a future
phase handling clones has to track its own intended pixel offsets rather
than trusting `RLK` for them. No such problem exists for plain layer
position: `KPS`/`RLK` round-trip exactly in real pixels both ways.

- `RLK` (Request Layer KeyFrame) is now a command this module can send
  and parse (`spyder.js`'s response dispatch), extracting X/Y position
  into a new `this.layerPos` map (keyed by protocol layer id). Only
  queried for the currently-selected layer, not all of them -- unlike
  the existing always-on `RLS` sweep, position is only displayed/acted
  on for one layer at a time.
- `select_next` / `select_prev` actions: cycle `this.selectedLayer`
  (human-numbered, wraps at `1`/`this.layerCount`), each queuing a fresh
  `RLK` for the newly-selected layer so the display doesn't show stale
  position data from whatever was previously selected. Source doesn't
  need a fresh query on selection change -- `this.layerSource` is
  already kept current by the existing discovery-tick `RLS` polling.
- The discovery tick (same slow, 60s-ish cadence `RLS`/`RRL` already use)
  now also re-queries `RLK` for the currently-selected layer, as a
  drift-correction safety net for moves made outside this module (Spyder
  Studio, a script, ...) -- same reasoning as the existing RLS sweep.
- `layer_select_display` preset: a live-updating readout of the
  currently-selected layer -- layer number, its source name, and its
  X,Y position, via 4 new variables (`selLayerNum`, `selLayerSrcLine1`,
  `selLayerSrcLine2`, `selLayerPos`) refreshed by a new
  `refreshSelectedLayerDisplay()` method. Built as 4 independent
  `layered`-preset text elements with explicit draw bounds stacked in
  4 horizontal bands, not one `\n`-joined text block -- a single block's
  `fontsizeAllowShrink` scales uniformly off its tallest/widest line,
  which would needlessly shrink the short layer-number line just to fit
  the source-name wrap.
- A scrolling/marquee source-name display (`unixNow()`/`strlen()`/
  `substr()` expression trick in a text element) was built as an
  isolated throwaway test preset and confirmed live to NOT animate --
  Companion doesn't re-render a layered preset's expression-mode text
  on a free-running timer the way it does for `blink()`-driven
  visibility. Reverted; not part of this commit. Settled instead on a
  static layout, word-wrapped by a new `wrapSourceName()` helper within
  a confirmed-comfortable 4-lines-of-11-chars-per-line budget (checked
  against all 24 of this venue's current source names -- the longest,
  22 chars, wraps cleanly at the nearest word boundary on both lines).

### Fixed (Layer Positioning)
- The display key's source lines weren't updating promptly after a
  layer was selected -- live-tested, confirmed the `RLS` responses
  themselves were arriving instantly (not a network/protocol issue),
  but `setLayerSource()` only updated `this.layerSource` and checked
  `layer_source_is`; it never called `refreshSelectedLayerDisplay()`.
  Since `RLK` for the selected layer is queued *after* the full 24-layer
  `RLS` sweep on each discovery tick, the source line's freshness was
  accidentally riding on that unrelated RLK call finally landing near
  the end of the ~60s cycle, rather than updating the moment its own
  RLS data actually arrived. `setLayerSource` now also calls
  `refreshSelectedLayerDisplay()` when the layer it just updated is the
  currently-selected one, same as the existing `RLK` handler does.
- That fix alone didn't help -- live-tested again post-restart and
  found a second, pre-existing bug underneath it: the `'listening'`
  handler sent `RLC` and called `this.poll()` immediately afterwards,
  without waiting for `RLC`'s response (`queueCmd` only awaits the
  send). `this.watchedLayers` is only populated inside the async `RLC`
  response handler, so that very first `poll()` call always ran with
  `watchedLayers` still `[]`, silently skipping the entire `RLS`
  discovery sweep for the whole first ~60s discovery cycle after any
  connect/restart -- not just for the newly-selected-layer display, for
  every layer's source. (`RLK` appeared to work "instantly" in the
  first debugging pass only because it doesn't depend on
  `watchedLayers`.) Removed the immediate `this.poll()` call; the
  `pollTimer` interval's first firing is now what runs the real first
  poll, by which point `RLC`'s response has reliably already landed
  even at the fastest allowed poll rate (500ms) on a LAN.

### Layer Positioning: Nudge (Phase 2)
Second slice of absolute-pixel layer positioning -- adds the actual
movement actions on top of Phase 1's "select target". Covers plain
layer nudging only; clone-offset (`LCC`) positioning is still a later
phase.

- `RSF` (Request System FrameRate) is now read at: every discovery tick
  (alongside the existing `RLS`/`RLK`/`RRL` traffic), and the `rrl_refresh`
  action/preset (renamed `Refresh Data`, see below). Its enum response is
  bucketed to a clean round-number Hz "family" (`FRAME_RATE_FAMILY_HZ`)
  rather than tracked as an exact fractional rate -- 23.98/24 both count
  as 48, 25/PAL both count as 50, 29.97/30/60/NTSC all count as 60 --
  cached as `this.frameRateHz` (defaults to 60, this venue's confirmed
  family, until the first `RSF` answers). Drives the nudge repeat
  interval below; not currently exposed as a variable.
- `rrl_refresh` action and its `rrl_refresh_both` preset renamed from
  "Refresh Sources / Command Keys Now" / "Refresh Sources & Command Keys
  Now" to just **"Refresh Data"** -- the longer name didn't fit a 15mm
  Stream Deck key even before this added a third thing (frame rate) for
  it to refresh.
- `cycle_nudge_step` action + preset: cycles `this.nudgeStep` through
  1px/10px/100px, shown live via a new `nudgeStep` variable.
- `nudge_start` / `nudge_stop` actions (direction option: up/down/left/
  right) + four directional presets, wired to a preset's `down`/`up`
  steps respectively (not two taps -- `down` starts repeating while
  held, `up` stops it). The actual move/throttle/accel logic lives in
  three new `spyder.js` instance methods:
  - `doNudge(direction)`: sends one relative `KPS` move (`KPS 1 <dx>
    <dy> <layerId>` -- hardware-side relative accumulation, no need to
    track/send absolute coordinates) for the currently-selected layer,
    and optimistically updates the cached `this.layerPos` by the same
    delta so the select-target display's position line stays live
    while nudging (`KPS`'s response is a bare result code, nothing to
    read back). Deliberately **skips the send entirely** (rather than
    queuing it) if anything is already pending/queued on the shared
    single-outstanding-command channel -- queuing instead would let a
    backlog of moves build up behind a discovery-tick burst and keep
    moving the layer after the key was released, the exact "shoots out
    of the pixelspace" failure mode described when this feature was
    scoped. A skipped tick is simply lost, not deferred; acceptable
    since the channel is idle the vast majority of the time.
  - `startNudge(direction)`: no-ops if already repeating; otherwise
    sends one move immediately (so a tap isn't delayed behind the first
    interval tick) and starts a `setInterval` for the rest. Interval is
    `(1000 / this.frameRateHz) * sqrt(this.nudgeStep)` -- 1px at the
    cached frame rate feels like "1px per frame" (the explicitly
    requested feel), while bigger steps get genuine acceleration
    (sub-linear interval scaling) rather than either (a) the same total
    px/sec regardless of step size, which would make picking a bigger
    step pointless, or (b) the same interval regardless of step size,
    which is what risked the runaway-overshoot failure mode in the
    first place.
  - `stopNudge(direction)`: clears that direction's timer.
  - `destroy()` now also clears any still-running nudge timers, so a
    connection torn down mid-hold doesn't leave an interval firing into
    a destroyed `udp` instance.
- A scrolling/marquee text display was explicitly NOT reattempted here
  for any of this -- see the Select Target phase's entry above and
  `companion-expression-text-no-live-refresh` memory.

### Fixed (Layer Positioning)
- Live-tested the nudge repeat interval (`(1000/frameRateHz) *
  sqrt(step)`, ~16.67ms at 60Hz for 1px) and found it too fast for
  single-pixel precision -- a human tap easily lasts 50-200ms,
  comfortably longer than that interval, so almost every "quick dab"
  was also triggering several unwanted repeat moves before release
  could register. Added a `NUDGE_INTERVAL_MULTIPLIER` (4x, the user's
  own estimate -- not yet fully live-tested, their team was using the
  venue for rehearsal) applied uniformly across the whole
  `sqrt(step)`-accelerated curve, not just the 1px case, so the
  acceleration ratio between step sizes is unchanged, just the whole
  thing slower. Easy to re-tune as a single constant once it can be
  properly tested.
- Added diagonal nudge directions (`upleft`/`upright`/`downleft`/
  `downright`) -- present in a prior tool the user built for the same
  kind of layer-nudging work, missed in the first pass here. Applies a
  full step to both axes simultaneously (not magnitude-normalized to
  match the orthogonal step distance) -- simpler and more expected than
  trigonometric normalization. Four new presets (`UL`/`UR`/`DL`/`DR`
  text labels, not unicode arrow glyphs -- unconfirmed whether those
  render correctly in Companion's font rendering, and the rest of this
  module's labeling has deliberately stuck to plain ASCII throughout).
- 4x still reported too fast for a clean single-pixel dab. Bumped
  `NUDGE_INTERVAL_MULTIPLIER` to 15 (user-specified exact figure: 250ms
  at the 60Hz family) rather than guessing another multiplier blind.
- Reconsidered the `sqrt(step)`-scaled curve entirely once 250ms worked
  for 1px: a flat interval across all step sizes already gives a huge
  effective speed difference for free (a 100px step covers 100x the
  distance of a 1px step on an identical tick), so the extra
  frame-rate-derived curve was unnecessary complexity on top, and tap
  precision has nothing to do with the Spyder's video frame rate in the
  first place. Replaced `NUDGE_INTERVAL_MULTIPLIER`/`frameRateHz`-based
  math with a single flat `NUDGE_REPEAT_INTERVAL_MS = 250` used for
  every step size. `this.frameRateHz`/`RSF` caching is unaffected and
  still runs (connect/periodic/"Refresh Data") -- just no longer
  consumed by nudge timing.

### Changed (Layer Positioning)
- `layer_select_display`'s source-name display, per the user's own
  live-tuned values: merged `selLayerSrcLine1`/`selLayerSrcLine2` into
  one `selLayerSrc` variable (`wrapSourceName`'s two lines joined by
  `\n`, so a short name that only needs one line doesn't carry a
  dangling blank second line) and one preset text element (`label`,
  `x:5 y:25 w:90 h:50`, `companion-mono` size 38, no shrink) instead of
  two stacked elements each with their own size/shrink behavior.
