## Spyder

**Available commands for Spyder**


* Take
* Basic Preset Recall (Index number)
* Recall Script Cue (Script, Cue)
* Source Apply (assign a source to one or more layers)
* Refresh Sources / Command Keys Now (force an immediate re-fetch)
* Force Server Save (also available as a preset: "<connection
  label>\nSAVE", with a "Last Save Time" feedback appending
  "last:HH:MM" once a save has succeeded this connection. Font is a
  per-button Companion setting -- the classic button style this module
  uses has no font property for a module to set.)
* Recall Command Key at Cue (sets selected) -- dropdown-fed by live
  command keys; also sets which key "Is Selected Command Key" tracks
* Cue Advance (FWD) / Cue Back (REV) -- both also available as presets
* Transition Layer(s)
* Freeze Layer(s)
* Background Transition
* Function Key Recall
* Output Freeze
* Device Mixer Transition

Feedback and variables available for Script Cue and register. Sources are
also polled (`RRL 6`) and exposed as `src_<N>` variables, and feed the
Source Apply action's and the "Layer source is" feedback's "Source Name"
dropdowns directly -- pick a live source by name, or type a custom
value/expression (`$(...)` variables work there too).

All outgoing commands are sent as an explicit byte buffer (built from the
fixed 10-byte header plus the literal command bytes) rather than relying on
implicit JS string encoding, so command text -- including `%20` used inside
the Source Apply action to escape a space within a source name -- always
reaches the device byte-for-byte unchanged.

**Live layer source feedback**

Add the "Layer source is" feedback to a button and point it at a layer
number -- no config needed elsewhere. Pressing `sra` immediately
confirms via `RLS` for exactly the layer(s) it just applied, so the
feedback updates right away for the common case (a change made through
this module). Beyond that, every real layer is also re-checked via `RLS`
on the same slow cadence as the source/command-key cache below -- a
periodic safety net for a change made some other way (directly at the
Spyder console, a script, `FKR`...), not the primary path. If you
suspect feedback is stale, press the `sra` button again rather than
waiting on that safety net.

**Poll interval**

"Poll interval (ms)" in the connection's config (default 2500ms,
500-30000ms) is now mostly about how fast the module notices things are
idle -- the RLS layer sweep, plus the source and command-key lists, are
refreshed at most once every 60 seconds regardless, since they rarely
change outside of this module's own actions.

To force an immediate refresh instead of waiting -- e.g. right after
adding a source or command key -- use the "Refresh Sources / Command
Keys Now" action (multi-select which type(s)), or drag the "Refresh
Sources & Command Keys Now" preset onto a button.

**Script Cue workflow**

Spyder's `ASC` (Advance Script Cue) has no script-ID argument -- it
always acts on Spyder's own single global "current script." Since
there's nothing to read back from Spyder about which key is
"selected," this module tracks it locally:

- "Recall Command Key at Cue" (dropdown-fed by live command keys, cue
  defaults to the connection's "Default recall cue" config, 0 by
  default) both sends `RSC` and records what it just recalled.
- "Is Selected Command Key" feedback highlights whichever button's
  Command Key matches that recording. Local memory only -- not a live
  readback.
- "Cue Advance (FWD)" / "Cue Back (REV)" send `ASC +1` / `ASC -1` and
  nudge the recorded cue, clamped using that key's own `numCues` (from
  `RRD`) where known, so it won't track past a script's actual cue
  count.
- One preset per currently-discovered command key (category "Command
  Keys"), each pre-wired with "Recall Command Key at Cue" and "Is
  Selected Command Key" for that specific key. Kept live: regenerated
  whenever a key is added, renamed, or removed, with an `info` log
  noting the change. A button already dragged from an older version
  of one of these does *not* auto-update or auto-disappear -- re-drag
  it from the Presets tab if its key changed.

**Logging**

Every send is logged readably at `info` (`Sending: Source Apply (SRA
"WF PGM" 6)` -- mnemonic expanded to its full manual name, and any
`%20`-escaped argument decoded back to a space and quoted, so it reads
as one value rather than looking like extra arguments), with the exact
hex also logged at `debug` for wire-level inspection -- the quoting and
decoding is display-only, never sent. Every
response is logged too, decoded against the protocol's result-code table
(`info` for Success/Empty, `warn` for anything else -- Header/invalid
command, Argument count/value, Execution, or an unexpected/unmatched
response). For the five commands this module sends itself (`RLC`,
`RLS`, `RRL`, `RRD`, `SCR`) the response body is further decoded into
named fields -- e.g. `Received for Script Cue Request (SCR 0 R):
Success -- active=yes` instead of a bare `0 1`. Action commands
(`SRA`, `ASC`, ...) just get Success/fail, per the manual's own
documented response for those. The protocol gives responses no sequence number and no echo
of the request that caused them -- correctness depends entirely on never
having more than one command outstanding at once, which is why every
action goes through the same queue as the periodic poll rather than
sending directly. A `warn` saying a response arrived with nothing
pending to match it to is the one case that can still happen (e.g. a
genuinely late response racing a timeout-triggered resend) -- rare, and
now visible instead of silently misattributed.

**Layer count validation**

The real layer count is read via `RLC` at connect (minus the 2 background
layers Spyder always reports). Source Apply checks any layer number you
give it against this before sending, logging a warning and dropping only
the out-of-range ones -- a typo doesn't silently get sent to a layer that
doesn't exist. Not enforced until that first response lands; its regex
does still reject values that could never be a real layer number (zero,
negative, leading zeros) regardless of connection state.


--------
Contributions for development and maintenance of this open source module are always welcome
https://github.com/sponsors/istnv

--------