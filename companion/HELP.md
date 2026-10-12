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

Feedback and variables available for Script Cue and register.

All outgoing commands are sent as an explicit byte buffer (built from the
fixed 10-byte header plus the literal command bytes) rather than relying on
implicit JS string encoding, so command text -- including `%20` used inside
the Source Apply action to escape a space within a source name -- always
reaches the device byte-for-byte unchanged.

**Live layer source feedback**

Set "Layers to monitor for live source feedback" in the connection's config
(human-numbered, e.g. `1-3, 10, 15-18`) to have the module poll those
layers' currently-applied source every ~2.5s via `RLS`. Use the "Layer
source is" feedback to style a button based on whether a given layer's
live source name matches.


--------
Contributions for development and maintenance of this open source module are always welcome
https://github.com/sponsors/istnv

--------