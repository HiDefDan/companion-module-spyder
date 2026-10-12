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

### Changed
- Outgoing commands are now sent as an explicit byte buffer (fixed header +
  command bytes) instead of a plain JS string, so command text reaches the
  device byte-for-byte regardless of Node's string-encoding defaults.
- Each command key now exposes exactly one `r_name_<RegisterID+1>` variable,
  labelled "Command Key: <name>" (and kept in sync if renamed in Spyder
  Studio). Previously a second, duplicate variable (`s_name_<ScriptID>`)
  was also created for the same key, since Register ID and Script ID are
  separate numbering spaces the Spyder uses for the same object; the
  redundant Script-ID-keyed `SCR` poll that fed it is also removed.
  Addressing a key by Script ID (via `script2reg`) still works for
  feedbacks/actions that want it.
