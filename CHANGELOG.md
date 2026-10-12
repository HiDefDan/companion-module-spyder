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
  `RLS` -- no config needed; measured traffic from this is negligible
  even for a large layer count, so it isn't made optional.
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

### Changed
- Sources (`RRL 6`) and command keys (`RRL 4` + `RRD`/`SCR` per key) are
  now cached instead of re-fetched on every poll tick -- refreshed at
  most once every `DISCOVERY_INTERVAL_MS` (60s, independent of the poll
  interval), since they rarely change. `RLS` layer-source checks (the
  latency-sensitive one) run every tick regardless, and no longer queue
  behind that traffic almost all of the time.
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
