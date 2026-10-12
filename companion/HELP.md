## Spyder

**Available commands for Spyder**


* Take
* Basic Preset Recall (Index number)
* Recall Script Cue (Script, Cue)
* Source Apply (assign a source to one or more layers)
* Transition Layer(s)
* Freeze Layer(s)
* Background Transition
* Function Key Recall
* Output Freeze
* Device Mixer Transition

Feedback and variables available for Script Cue and register. Sources are
also polled (`RRL 6`) and exposed as `src_<N>` variables, and feed the
Source Apply action's "Source Name" dropdown directly -- pick a live
source by name, or type a custom value/expression (`$(...)` variables
work there too).

All outgoing commands are sent as an explicit byte buffer (built from the
fixed 10-byte header plus the literal command bytes) rather than relying on
implicit JS string encoding, so command text -- including `%20` used inside
the Source Apply action to escape a space within a source name -- always
reaches the device byte-for-byte unchanged.

**Live layer source feedback**

Set "Layers to monitor for live source feedback" in the connection's config
(human-numbered, e.g. `1-3, 10, 15-18`) to have the module poll those
layers' currently-applied source via `RLS`. Use the "Layer source is"
feedback to style a button based on whether a given layer's live source
name matches.

**Poll interval**

"Poll interval (ms)" in the connection's config controls how often
register/source/layer-source polling runs (default 2500ms, 500-30000ms).

**Layer count validation**

The real layer count is read via `RLC` at connect (minus the 2 background
layers Spyder always reports). Source Apply checks any layer number you
give it against this before sending, logging a warning and dropping only
the out-of-range ones -- a typo doesn't silently get sent to a layer that
doesn't exist. Not enforced until the first `RLC` response lands.


--------
Contributions for development and maintenance of this open source module are always welcome
https://github.com/sponsors/istnv

--------