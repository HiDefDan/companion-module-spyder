# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
History starts here at 2.4.0 — earlier versions weren't tracked in this file.

## [2.4.0]

### Added
- `sra` action (Source Apply): assigns a named source to one or more layers,
  auto-escaping in-value spaces to the literal `%20` the protocol requires
  and applying the existing human-to-protocol layer (+1) offset.
- "Layers to monitor" connection config field: drives a periodic `RLS` poll
  per watched layer.
- `layer_source_is` feedback: styles a button based on whether a watched
  layer's live, device-reported source matches a given name.

### Changed
- Outgoing commands are now sent as an explicit byte buffer (fixed header +
  command bytes) instead of a plain JS string, so command text reaches the
  device byte-for-byte regardless of Node's string-encoding defaults.
