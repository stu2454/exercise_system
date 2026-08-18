# Development Session — 18 August 2026

## 1. Starting point

Exercise Engagement began as a new project rather than an extension of
`vision-exercise-system`. The earlier project informed the architecture through
its canonical pose abstraction, separation of sensing from interpretation,
pose-quality gating, temporal filtering, movement features, record/replay,
deterministic regression testing and privacy-first handling of participant
video.

A separate codebase was chosen because this project is browser-native and asks
a different product question: whether interpretable pose-derived measures can
describe engagement with video-delivered exercise. Carrying forward the older
Python/OpenCV, desktop, Raspberry Pi, SQLite and exercise-specific runtime
assumptions would have obscured that goal.

## 2. Initial project scaffold

The repository uses React, TypeScript, Vite, Vitest and MediaPipe Tasks Vision
Pose Landmarker. `AGENTS.md` and `CLAUDE.md` define coding-agent constraints,
while numbered files under `docs/` define the measurement model, architecture,
contracts, validation strategy and roadmap.

The application is browser-first. Camera and pose processing remain local by
default, there is no backend, and portable development records contain
canonical pose and derived data rather than raw participant video.

## 3. Build 0 — Webcam acquisition

Build 0 introduced explicit browser camera permission through `getUserMedia`,
manual Start Camera and Stop Camera actions, status/error presentation, stream
attachment and cleanup of media tracks on stop or component unmount. Camera
access was manually confirmed working in the browser before pose work began.

## 4. Build 1 — MediaPipe pose

Build 1 added MediaPipe Pose Landmarker in single-person mode. It performs live
inference against the existing webcam stream, draws a development skeleton,
reports participant presence and exposes inference FPS/debug state. Inference
stops with the camera and MediaPipe resources are disposed on teardown. Live
skeleton tracking was manually confirmed.

## 5. Build 2 — Canonical PoseFrame

The MediaPipe adapter converts successful results to timestamped canonical
`PoseFrame` values with `source: "participant"`, person confidence and named
landmarks. The initial canonical set includes the nose, shoulders, elbows,
wrists, hips, knees, ankles, heels and foot indices. Coordinates include x/y,
optional z and confidence. MediaPipe landmark numbering and result types remain
inside `src/pose`; downstream processing consumes canonical names. Mocked
adapter tests and manual inspection confirmed anatomical left/right mapping.

## 6. Build 3 — Pose quality and temporal filtering

Build 3 introduced conservative `GOOD`, `DEGRADED` and `INSUFFICIENT` pose
quality. It checks participant presence, required major landmarks, framing,
confidence, implausible jumps and prolonged landmark loss. Required lower-body
landmarks prevent tracking failure from being silently interpreted as stillness.

An exponential moving-average landmark filter smooths canonical coordinates,
preserves timestamps/confidence, handles missing landmarks and resets after
prolonged loss. Raw and filtered frames remain available for debugging.

Development checks included moving close to and back from the camera, leaving
and re-entering the frame, and partially clipping the body. These checks drove
the distinction between framing/tracking failure and participant inactivity.

## 7. Build 4 — Movement/activity features

Movement extraction uses actual timestamp deltas rather than assumed FPS and
normalises displacement by participant body scale. It reports whole-body,
upper-body, lower-body, trunk, left/right arm and left/right leg activity with
validity, plus development activity levels `STILL`, `LOW`, `MODERATE` and
`HIGH`. Pose quality gates all interpretation.

Manual observations behaved directionally as intended: arm movement was
predominantly upper-body, stepping was predominantly lower-body, whole-body
movement produced larger whole-body values, and tracking loss produced invalid
movement rather than `STILL`. These observations validate plumbing and
directionality only; they are not clinical validation.

## 8. Build 5 — Record / Replay / Regression

### Initial recording

The first in-memory JSONL design wrote metadata followed by canonical pose,
pose-quality and movement-feature records. Recording was explicit and exported
locally without video or cloud upload.

### Discovery of missing no-pose observations

Inspection of the first recording found 4,441 pose-quality records, 4,441
movement-feature records and only 4,292 pose records. The difference was exactly
149, matching the 149 `INSUFFICIENT` quality frames. Complete tracking loss had
therefore disappeared from the canonical replay input, making faithful replay
of absence impossible.

### Schema 2.0.0 correction

Schema 2.0.0 changed canonical input to a timestamped
`pose-observation` envelope. Present observations contain a canonical pose;
tracking-loss observations contain explicit `pose: null`. No landmarks are
synthesised. Pose-quality and movement-feature records remain diagnostic
outputs but are not required replay inputs.

### Second structured recording

The next inspected recording contained 3,621 pose observations, 3,621 quality
records and 3,621 movement records, including 228 explicit `pose: null`
observations. A participant-out-of-frame interval of approximately 46.3–50.1
seconds was preserved. The session staged stillness, left-arm movement,
stepping/lower-body movement, whole-body movement, leaving the frame and return.

Observed examples included approximately:

- left-arm phase: left arm 0.96, right arm 0.02, upper body 0.49 and lower body
  0.02;
- whole-body phase: whole body 1.21, upper body 2.05, lower body 1.14, left arm
  1.89 and right arm 2.20.

These values are development observations, not validated thresholds or
prescriptions.

### Deterministic replay

The first real replay processed all 3,621 observations through the same pose
quality, filter and movement pipeline, bypassing camera acquisition and
MediaPipe. It reported quality matches of 3,621/3,621 and activity-level matches
of 3,619/3,621, but some numeric maxima appeared as `Infinity`.

### Comparator bug

`Infinity` had been used as a generic mismatch sentinel for invalid/null
feature values. This polluted max-delta statistics and conflated validity with
numeric disagreement. The comparator was changed to compare validity first,
exclude invalid pairs from numeric deltas and report validity mismatches and
non-finite values separately.

### Revised replay result

- observations compared: 3,621;
- quality matches: 3,621/3,621;
- activity-level matches: 3,619/3,621;
- non-finite-value errors: 0.

| Feature | Validity matches | Valid numeric matches | Maximum finite delta | Validity mismatches |
| --- | ---: | ---: | ---: | ---: |
| wholeBodyActivity | 3,620/3,621 | 3,351/3,391 | 0.0797763 | 1 |
| upperBodyActivity | 3,620/3,621 | 3,350/3,391 | 0.124184 | 1 |
| lowerBodyActivity | 3,621/3,621 | 3,321/3,321 | 2.953e-14 | 0 |
| trunkActivity | 3,620/3,621 | 3,351/3,391 | 0.0353686 | 1 |

### Initial-state/warm-up issue

All 121 finite mismatches occurred within the first 41 observations and
diminished progressively. The two activity-level mismatches were indices 0 and
1. The live pipeline already had temporal history when recording began, whereas
replay correctly began from reset state. This was an initial-condition
difference, not continuing replay divergence.

A configurable regression warm-up was therefore introduced, defaulting to
1,000 ms. Warm-up observations are still processed normally but are excluded
from deterministic pass/fail assertions. A fixture known to start from empty
temporal state can explicitly use zero warm-up.

### Regression framework

Schema 2.0.0 canonical pose observations are the only regression input.
Expectation manifests define relative-time segments and warm-up. Segment
summaries expose counts, quality distribution, valid fractions, feature means
and activity-level proportions. Property assertions favour durable
relationships—such as arm activity exceeding leg activity in an arm segment—
over fragile exact floating-point values.

The committed staged fixture contains canonical and diagnostic JSONL but no raw
images or video. Raw session exports remain ignored under `recordings/`.

## 9. Build 6 — Exercise library and programme architecture

The original source exercise video was a matrix in which nine demonstrations
played simultaneously. Treating that grid as one reference session would make
exercise identity and timing ambiguous. The demonstrations were therefore
manually separated so each exercise is an independent reference video under
`public/videos/`.

The current assets are native `.mov` files. They were not transcoded; playback
uses the browser's native media support and reports codec failures.

## 10. Exercise prescription model

Reusable exercise metadata is separate from programme prescription. The domain
continues to represent repetitions, repetitions per side, duration, hold and
free doses, while the supplied exercise set currently uses duration:

- 60 seconds per exercise;
- configurable two or three sets;
- three sets in the initial development programme;
- 20 seconds rest between intervals.

This is supplied development configuration, not a clinically validated
prescription. Terminology uses “sets” rather than “repeats”. One set is a full
pass: Exercise 1 → Exercise 2 → … → Exercise 9, followed by the full sequence
again for Set 2. It is not Exercise 1 three times followed by Exercise 2 three
times.

## 11. Programme runner

The programme runner is an explicit state machine with `READY`, `EXERCISING`,
`RESTING`, `SET_COMPLETE` and `PROGRAMME_COMPLETE` phases (plus idle). It shows
one exercise at a time, set/exercise progress, a 60-second automatic interval,
configurable rest and manual development controls. The current reference video
loops muted only while its exercise is active.

## 12. Right-arm readiness gesture

An intentional anatomical right-arm raise starts or continues the programme.
The filtered canonical right wrist must remain 0.03 normalised units above the
right shoulder for 650 ms with adequate quality. One raise triggers once; the
arm must lower before rearming. Transient tracking loss clears incomplete dwell
without silently disarming the gesture. It is ignored during active exercise,
and a manual Start/Continue fallback remains.

The gesture is a product control, not an engagement metric. Developer
diagnostics expose wrist/shoulder coordinates, comparison, quality, armed state,
dwell and trigger count.

## 13. Full-screen participant mode

Configuration/developer UI is separated from a participant mode designed for a
person approximately 2–4 metres from the display. It uses large typography,
large timers, concise instructions, optional browser fullscreen and spoken
prompts while hiding developer clutter. Fullscreen denial is non-fatal.

Participant prompts are semantic events independent of programme logic.
Optional high-quality files under `public/audio/` are preferred, with
configurable browser SpeechSynthesis fallback. Browser voices rank en-AU,
en-GB, then other English voices; participants retain a simple mute control.

## 14. Split-screen participant mode

Ready, exercise and transition views place the reference video on the left and
the existing live participant camera on the right with a canonical skeleton
overlay. No second camera stream or MediaPipe instance is created. The timer and
instruction remain prominent, and the participant can visually confirm
tracking.

Video and skeleton are mirrored together for a natural self-view. Mirroring is
presentation-only; canonical anatomical left/right names and gesture logic are
unchanged.

## 15. Framing guidance

The original immediate “Move your body back” warning was too simplistic and
flickered on brief clipping. Guidance now considers pose presence, quality,
confident-landmark bounds, body size, frame centre and margins. Participant
states are `STEP INTO VIEW`, `STEP BACK`, `STEP FORWARD`, `MOVE LEFT`,
`MOVE RIGHT`, `FULL BODY VISIBLE` and `TRACKING LOST`.

Changes must persist for 750 ms before display. Stable full-body visibility
suppresses incidental warnings, and ordinary degraded tracking does not pause
the exercise timer.

## 16. Graceful session termination

Participant mode provides an always-visible End Session control. An Escape key
received by the application follows the same path, although browsers may
consume Escape solely to leave native fullscreen. Requesting exit pauses the
timer, stops progression, cancels pending gesture advancement and shows an
`END THIS SESSION?` confirmation.

Continue Session restores the previous running/paused state. End and Save
flushes the synchronous in-memory recording, commits the current partial
exercise, marks the result `aborted` with `participant_exit`, downloads JSONL
and leaves participant mode. Normal completion records `completed`. Retained
interval data includes set/exercise indices and ID, elapsed exercise time,
timestamp, valid-observation fraction and partial status. Completed intervals
are committed at transitions.

An abrupt browser/process/device crash can still lose unexported in-memory
recording and interval data. No backend or persistent browser database was
introduced.

## 17. Verification performed

Unit and regression coverage grew to 24 Vitest files containing 171 tests. The
final session verification on 18 August 2026 reported:

- `npm test`: 24 files passed, 171 tests passed;
- `npm run build`: passed, 78 modules transformed;
- `git diff --check`: passed with no output.

Tests cover camera state, MediaPipe adaptation, pose quality/filtering,
movement features, JSONL recording/parsing, deterministic replay, regression
properties, exercise/programme models, gesture behavior, framing, fullscreen,
session termination, canonical overlay/mirroring and audio prompt delivery.

Manual browser observations confirmed camera permission, skeleton tracking and
directionally sensible movement behavior. Browser-specific functionality was
not automated end-to-end in a real browser during the final verification.

## 18. Alternatives, failures and decisions

- Extending the old Python system was rejected in favour of a browser-native
  codebase with a different measurement objective.
- Omitting absent poses from recording failed because tracking loss vanished
  from canonical replay; explicit `pose: null` observations replaced it.
- Using `Infinity` as a mismatch sentinel failed because validity errors
  polluted numeric statistics; validity-aware comparison replaced it.
- Demanding bit-identical replay from an unknown temporal initial state was
  rejected; explicit warm-up models the missing pre-recording history.
- Treating a nine-cell matrix as one reference video was rejected; independent
  clips now define exercises.
- Relying only on OS browser speech sounded robotic and was not portable;
  semantic prompts now prefer optional natural audio while retaining browser
  fallback.
- Raw participant video, cloud upload and a backend remained deliberately out
  of scope.

## 19. Unfinished work and known limitations

- Build 7 reference pose extraction and explicit participant/reference time
  bases have not begun.
- Movement similarity, responsiveness and clinical interpretation remain
  deferred.
- Current exercise names are placeholders and prescriptions are not clinically
  validated.
- Native `.mov` support varies by browser; reference assets may later need a
  documented compatible format.
- Optional natural prompt MP3 files have not yet been supplied.
- Fullscreen, SpeechSynthesis voices, autoplay policy and camera permissions
  remain browser/OS dependent.
- Session data is in memory until download and is vulnerable to abrupt crashes.
- Thresholds require broader real-participant validation across camera,
  clothing, lighting, body-size and movement-ability variation.

The next technical build should begin only after reviewing these limitations
and should follow the roadmap's Build 7 boundary rather than introducing a
composite engagement score.
