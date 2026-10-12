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
- "Layers to monitor" connection config field (accepts ranges/lists, e.g.
  `1-3, 10, 15-18`): drives a periodic `RLS` poll per watched layer.
- `layer_source_is` feedback: styles a button based on whether a watched
  layer's live, device-reported source matches a given name.
- Sources are now polled too (`RRL 6`, same add/rename/delete tracking as
  command keys), exposed as `src_<N>` variables, and feed the `sra`
  action's "Source Name" option as a live dropdown (still `allowCustom`,
  so a typed name or `$(...)` expression still works).
- "Poll interval (ms)" connection config field (default 2500, 500-30000)
  controls how often register/source/layer-source polling runs.
- `RLC` (Request Layer Count) is now parsed at connect and used to
  validate `sra`'s layer number(s) before sending -- out-of-range layers
  are dropped individually (with a warning logged) rather than silently
  sent to a layer that doesn't exist; skipped entirely if no `RLC`
  response has landed yet.

### Changed
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
- Relabelled "Layers to monitor" to "Layers to poll for live source" and
  spelled out that it only starts polling -- it doesn't produce feedback
  by itself, that's what the "Layer source is" feedback does.
- Both layer-number fields ("Layers to poll for live source" and `sra`'s
  "Layer(s)") now have a regex rejecting values that could never be a
  real layer (zero, negative, leading zeros), on top of the live `RLC`
  bounds check. "Layers to poll for live source" is now also pruned
  against the real layer count once `RLC` answers, same as `sra`.
