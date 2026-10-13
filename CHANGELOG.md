# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
History starts here — earlier versions weren't tracked in this file.
Everything below is in-progress dev-mode work against a live connection;
it gets one real version bump when it's actually ready to PR upstream,
not one per commit.

## [Unreleased]

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
- What actually broke "selected" highlighting not appearing at all
  wasn't a module bug either: the feedback's "Command Key" option
  didn't match the Command Key the button's own "Recall Command Key
  at Cue" action targets. Worth checking both match if a button's
  highlight never seems to fire.
