# Build 6 — Exercise library and programme foundations

## Reference asset rule

Each file in `public/videos/` is one independent reference exercise. Browser
paths use `/videos/<filename>`. The former source matrix containing simultaneous
exercises is not a reference session and is not modelled as one continuous clip.

Build 6 keeps native `.mov` files unchanged and also supports `.mp4` paths. The
browser attempts native playback without autoplay. Playback and codec failures
are shown to developers rather than triggering conversion.

## Domain separation

An `Exercise` describes reusable exercise metadata and its individual reference
clip. `ExerciseDose` represents repetitions, repetitions per side, duration,
hold duration or free movement. An `ExercisePrescription` supplies a dose,
configurable sets, rest between sets and optional rest after the exercise for
one programme. An ordered `ExerciseProgramme` contains the prescriptions.

This separation allows the same exercise to carry different doses in different
programmes. The models and validation are vendor-neutral and have no React or
MediaPipe dependencies.

Participant instructions and rest instructions are deterministic pure-function
outputs. Build 6 does not count repetitions, infer completion, extract reference
poses or compare participant movement with a reference.

## Development metadata

The current assets are named `exercise-01.mov` through `exercise-09.mov`. These
filenames do not communicate clinically meaningful exercise names or dose
types, so the library uses temporary names `Exercise 01` through `Exercise 09`.

The current supplied programme configuration applies to every exercise:

- dose type: duration;
- duration: 60 seconds;
- default sets: 3;
- rest between sets: 20 seconds.

Programmes can override the set count, including prescribing either two or
three sets. The domain continues to support repetitions, repetitions per side,
hold and free movement for future exercise definitions.

This supplied configuration is not described as clinically validated. Replace
the temporary names and update programme settings when approved information is
available.

## Participant programme runner

The current Build 6 runner uses circuit sequencing: one set is a complete
ordered pass through all nine exercises. It runs Exercise 1 through Exercise 9
once, then starts Exercise 1 again for the next set, until the configured number
of sets is complete. All prescriptions in a circuit therefore use the same set
count. Transition calculation remains isolated in pure runner helpers so a
future alternative sequencing strategy can be introduced without coupling it
to UI or recognition; no alternative mode is implemented yet.

The explicit runtime phases are idle, ready, exercising, resting, set complete
and programme complete. Exercise and transition countdowns advance
automatically, while manual controls remain available for starting, continuing,
pausing, resuming and development-only skipping. Only the current reference
video is active, looped and muted during an exercise.

Stage 7 supports duration and repetition prescriptions through the same runner.
Duration exercises finish when their countdown reaches zero. Repetition
exercises consume typed, exercise-scoped `repetition-completed` events and stop
at the prescribed target; the developer UI provides a `+1 Rep` control for
testing this boundary without exercise-specific pose recognition. Events for a
different exercise, paused runner, completed target or non-repetition exercise
are ignored. A positive configured rest shows a countdown that can be skipped;
zero rest advances without rendering an unnecessary rest screen.

Programmes are stored in a versioned localStorage collection with a persisted
active programme ID. Missing, malformed, incompatible, blocked or empty storage
falls back to an independent copy of the supplied default programme. The app,
runner, participant view and session transition tracking consume the selected
active programme rather than importing a fixed sequence directly.

## Programme editor

Stage 8 adds a developer programme editor backed by that same stored collection.
It supports creating, selecting and deleting local programmes; searching and
adding library exercises; removing and reordering programme exercises; and
editing duration or repetition targets, the shared circuit set count, transition
rest, and demonstration preferences. A programme receives independent copies of
library defaults, so editing a prescription never mutates the Exercise Library.
At least one programme and one exercise are retained. The editor deliberately
offers only duration and repetition modes supported by the current runner while
the domain model retains its additional dose types for later builds.

## Programme session result

Stage 9 presents a simple completion summary with completed versus prescribed
sets for every exercise. The underlying `ProgrammeSessionResult` retains the
programme ID, start and end timestamps, completion status, independent copies of
the prescriptions, and per-set duration or repetition targets, achieved values,
and completion flags. Skipped and aborted sets remain partial rather than being
reported as completed. A compact interval timeline remains in recording exports
for diagnostic compatibility. This structure prepares for later adherence work
without introducing a dashboard or interpreting pose-derived activity as
exercise correctness.

The ready gesture consumes filtered canonical participant landmarks, not
MediaPipe output. It requires adequate pose quality and a right wrist at least
0.03 normalised units above the right shoulder for 650 ms. One sustained raise
can trigger only once; the arm must be lowered before rearming. Gesture triggers
are accepted only during ready and transition phases and are ignored while an
exercise is active.

## Full-screen participant mode

Build 6 separates the configuration/developer interface from a dedicated
participant layout. Launching participant mode begins at the ready screen and
hides camera diagnostics, replay tools, exercise-library configuration and
development controls. The participant sees one exercise, large set/exercise
progress, a large video or countdown, concise tracking warnings and large manual
fallback controls.

Browser fullscreen is optional. Failure or denial leaves the participant layout
running in the ordinary browser viewport. Native speech synthesis is also
optional and enabled by default for development. Prompts are keyed to programme
transitions so React rendering and countdown updates do not repeat them; stale
speech is cancelled at the next intended prompt. Participants can mute speech.

Participant prompts now pass through a technology-independent semantic prompt
service. Natural pre-generated files under `public/audio/` are preferred by
default. Each event has a documented filename; missing, unsupported or failed
audio falls back to browser SpeechSynthesis without interrupting the programme.
No external TTS API is used.

The browser fallback enumerates installed voices and ranks English voices in
the order en-AU, en-GB, then other English locales. Developers can override the
voice, select natural audio or browser voice, mute prompts, and adjust volume.
Fallback rate (0.92), pitch (1.0) and volume (0.9) are central configurable
defaults rather than programme-state behaviour. Full-screen participant mode
retains only the uncomplicated mute control.

Critical camera messages use concise text without raw confidence values. Pose
loss does not pause exercise or transition timers. Gesture feedback is shown
only while waiting to start or continue, and the manual Start and Continue
actions always remain available.

## Split-screen tracking and graceful exit

The participant view presents the current reference exercise and the existing live
participant camera/pose pipeline side by side. The camera and canonical skeleton
are both mirrored with CSS for a natural self-view. This is display-only:
MediaPipe inference, canonical landmark names and right/left gesture semantics
remain anatomical and unmirrored.

Participant framing guidance is derived conservatively from pose presence,
quality, confident-landmark bounds, body size and centre position. Changes must
persist for 750 ms before display, while prolonged loss is distinguished from a
participant who has not yet entered view. A stable full-body observation shows
`FULL BODY VISIBLE` and suppresses incidental boundary warnings. Ordinary
degraded tracking does not pause programme timers.

The right-arm ready detector requires the anatomical right wrist to remain at
least 0.03 normalized units above the right shoulder for 650 ms. Transient pose
quality loss clears an incomplete dwell but does not silently disarm a gesture.
After a successful trigger, lowering the arm is still required before rearming.
Developer diagnostics expose the two landmark y coordinates, comparison,
quality, armed state, dwell and trigger count.

`END SESSION` and an Escape event received by the application pause progression
and show a confirmation screen. Continuing restores the prior paused/running
state. Ending commits the partial exercise interval, records an aborted result
with `participant_exit`, finalises the in-memory canonical JSONL recording and
initiates its existing browser download. Completed exercise intervals are
committed at transitions; normal completion is recorded separately as
`completed`.

Browser-native Escape may be consumed solely to leave fullscreen, so the
on-screen control is always retained and leaving fullscreen never resets the
programme. Data remains in memory until JSONL download. An abrupt tab, browser,
device or process crash can therefore still lose the current partial interval
and any completed intervals that have not yet been exported. Programme
configuration persists in localStorage, but session recordings remain in memory
until download and no backend is introduced in Build 6.
