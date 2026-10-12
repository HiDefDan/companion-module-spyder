## Spyder

**Available commands for Spyder**


* Take
* Basic Preset Recall (Index number)
* Recall Script Cue (Script, Cue)
* Source Apply (assign a source to one or more layers)
* Refresh Sources / Command Keys Now (force an immediate re-fetch)
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

Every real layer is polled automatically for its currently-applied source
via `RLS`, once the real layer count is known (see below) -- no config
needed. Add the "Layer source is" feedback to a button and point it at a
layer number to see it; the polling by itself is invisible, that feedback
is what reads the polled value. The traffic this adds is negligible even
for a large layer count, which is why it isn't made optional.

**Poll interval**

"Poll interval (ms)" in the connection's config affects feedback latency
(default 2500ms, 500-30000ms) -- how often layer-source polling runs.
Sources and command keys are cached rather than re-fetched on every tick
(they rarely change): refreshed automatically at most once every 60
seconds, independently of the poll interval above, so a rename/add/
delete on the Spyder shows up within a minute rather than instantly, but
layer-source feedback (the latency-sensitive one) is no longer waiting
behind that traffic on every single tick.

To force an immediate refresh instead of waiting -- e.g. right after
adding a source or command key -- use the "Refresh Sources / Command
Keys Now" action (multi-select which type(s)), or drag the "Refresh
Sources & Command Keys Now" preset onto a button.

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