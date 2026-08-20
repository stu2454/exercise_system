# Build 7 — Developer workspace and session history

Build 7 is implemented incrementally. Stage 1 introduces a persistent developer
workspace shell with five responsibilities:

- **Overview** — active programme and the primary Participant Mode launch.
- **Programmes** — programme creation and prescription configuration.
- **Exercise Library** — reusable exercise definitions and reference media.
- **Sessions** — reserved for real persisted session history in later stages.
- **Developer** — camera, pose, replay, runner test controls and audio settings.

Application services remain owned by `App`, above navigation. Programme
collection, runner, camera stream, pose engine, movement processing, replay,
recording and session-tracker state are therefore not recreated when the active
tab changes.

The tab panels remain mounted and inactive panels use the native `hidden`
attribute. This is intentional for camera safety: the live developer video and
pose canvas keep stable DOM identities while a stream is active. Tab navigation
does not stop tracks, call `getUserMedia`, create a second stream, reset pose
processing or reset a participant session. Participant Mode remains a separate,
large-format interface and does not display developer navigation.

Stage 1 does not persist session history. The Sessions tab states that limitation
instead of displaying fabricated data.

## Stage 2 — Participant launch and session start

The developer workspace has one primary participant action: `LAUNCH PARTICIPANT
MODE` on Overview. Launch changes presentation mode only. Participant Mode then
shows the active programme name, exercise count and circuit-set count, with the
explicit `START PROGRAMME` action that creates the session tracker, begins the
diagnostic recording and advances the shared runner.

The existing developer runner remains available for event, repetition and timer
testing, but is labelled `START TEST RUN`, styled as secondary and does not
create a participant session. This avoids two ambiguous programme-start actions
while preserving developer-only runner controls.

Ready-state reference playback uses the native muted `autoplay` attribute as
well as the existing imperative playback/error path. This lets the participant
see the exercise demonstration before raising their arm, including when the
video element has only just mounted and the media source is still becoming
ready. Pose, camera and ready-gesture state do not gate this playback.
The same pre-exercise preview remains active when a completed exercise enters
rest and the participant screen switches to the next exercise. The next clip
therefore plays before the participant raises their arm to continue, rather than
appearing as a static frame until the exercise begins.

Participant Mode mounts its live camera/video and pose canvas immediately on
entry, including before `START PROGRAMME`. These same DOM nodes remain mounted
when the programme moves from idle to ready, preventing the shared stream ref or
pose engine from pointing at the hidden Developer surface. An already active
stream is reattached; no permission request or second MediaStream is created.

## Stage 3 — Programmes workspace

The complete Build 6 Programme Editor and readable programme summary now compose
the dedicated Programmes panel. The panel is presentation-only: it receives the
single active programme, versioned collection and mutation callbacks owned by
`App`/`useProgrammeCollection`. It does not create a tab-local draft or duplicate
store, so creation, selection, renaming, deletion, exercise search/add/remove,
reordering, dose configuration, circuit sets, rest and demonstration preferences
retain their existing persistence and validation behavior across tab changes.

## Stage 4 — Exercise Library and reference media

The Exercise Library tab provides case-insensitive search across exercise name,
stable ID, category, tags, dose type and recognition type. Lightweight cards
show reference-media availability and key metadata without mounting a video
player for every result. Selecting a card opens one controlled, non-autoplaying
reference player; closing or selecting another exercise removes that player.
This keeps library browsing practical as the number of definitions grows while
preserving the exact stable exercise-to-video mapping. Exercise authoring is not
part of Build 7.

## Stage 5 — Persistent structured session history

Every new `ProgrammeSessionTracker` receives a stable `sessionId` and snapshots
the programme name alongside its stable programme ID. Finalized completed and
participant-aborted results are added idempotently to the versioned
`exercise-engagement.session-history.v1` localStorage collection. Repeated
finalization or save calls for one ID do not duplicate or overwrite history;
starting again constructs a new tracker and ID.

Parsing validates the schema and nested set/interval result shapes. Missing,
malformed, incompatible, duplicated-ID or blocked storage falls back to an empty
in-memory history without preventing application startup. Retrieval can return
newest sessions first without mutating stored results.

Session history stores only the compact structured result: identity, timestamps,
status, programme/prescription snapshots, set outcomes and the compact attempted
set interval timeline. It does not store camera frames, video, canonical pose
observations, movement frame streams or exported JSONL. Those diagnostic records
remain in memory and require explicit download.

## Stage 6 — Session history list

The Sessions tab lists real locally stored results newest first and filters them
by stable programme ID or completed/stopped-early status. Rows use the historical
programme-name snapshot and show fully completed circuit sets, completed versus
prescribed exercise-set instances, and wall-clock elapsed minutes. A circuit set
counts as complete only when every prescribed exercise result for that set is
complete; partial, skipped and unattempted sets do not inflate it.

Structured session start/end timestamps now use epoch milliseconds from
`Date.now()` so calendar dates and elapsed times remain meaningful after browser
reload. High-frequency pose, gesture and movement calculations continue using
their existing monotonic clocks. Detail navigation is deliberately deferred to
Stage 7; the list does not invent unavailable detail or analytics.
