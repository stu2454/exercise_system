# Exercise Engagement — Project Status

## Current position

**Purpose:** A browser-based experimental system for privacy-preserving measurement of participation in video-delivered exercise using commodity RGB cameras and pose-derived data.

**Current build:** Build 7 — Developer Workspace, Session History and Adherence Review
**Current stage:** Stage 7 — Session Detail View (not started)
**Last completed stage:** Build 7 Stage 6 — Session History List

**Additional deployment capability:** Client Demo deployed on GitHub Pages; guided onboarding with hands-free continuation implemented locally

**Verification:**

- 37 test files passing
- 243 tests passing
- Production build passing
- Client Demo production build passing
- `git diff --check` passing

Progress is determined by verified stage acceptance, not test count.

## Build progress

| Build / stage | Description | Status |
|---|---|---|
| Builds 0–5 | Camera, pose, canonical processing, quality/filtering, movement, record/replay/regression | ✅ Complete |
| Build 6 | Exercise Library, programmes, circuit runner and session results (Stages 1–10) | ✅ Complete |
| Build 7 Stage 1 | Developer Workspace | ✅ Complete |
| Build 7 Stage 2 | Launch versus Start UX | ✅ Complete |
| Build 7 Stage 3 | Programmes Workspace | ✅ Complete |
| Build 7 Stage 4 | Exercise Library | ✅ Complete |
| Build 7 Stage 5 | Persistent Session History | ✅ Complete |
| Build 7 Stage 6 | Session History List | ✅ Complete |
| Build 7 Stage 7 | Session Detail View | ⬜ Not started |
| Build 7 Stage 8 | Descriptive Adherence Measures | ⬜ Not started |
| Build 7 Stage 9 | Session Management | ⬜ Not started |
| Build 7 Stage 10 | Regression, Migration, Documentation and Cleanup | ⬜ Not started |
| Client Demo | Participant-only static GitHub Pages target; guided setup plus one pass through nine exercises | ✅ Complete |

Status vocabulary: ✅ Complete · 🟡 In progress · ⛔ Blocked · ⬜ Not started · 🔁 Reopened

## Architecture snapshot

```text
Exercise Library → Active Programme → Shared Programme Runner
→ Participant Session → ProgrammeSessionResult
→ Versioned Session History → Sessions UI
```

```text
Camera / Pose → Canonical Observations → Quality / Filtering
→ Movement Features → Explicit Diagnostic Recording / Download
```

## Persistence status

| Data | Storage | Status |
|---|---|---|
| Programmes and active programme | `localStorage` — `exercise-engagement.programmes.v1` (schema 1) | Persistent |
| Structured session results | `localStorage` — `exercise-engagement.session-history.v1` (schema 1) | Persistent, local browser only |
| Diagnostic recording | Memory | Explicit JSONL download only |
| Camera video and image frames | Not stored | Never recorded by default |
| Reference videos | Application assets under `public/videos/` | Not stored in session history |

## Current build boundary

Build 7 does not implement authentication, participant or clinician accounts, organisations, a backend API, cloud databases, remote synchronisation, clinician–participant relationships, or programme-assignment workflows.

Exercise-specific repetition recognition is not yet implemented; the runner accepts generic typed repetition events and provides a developer `+1 Rep` control. Structured history is local-browser only. Current supplied exercise prescriptions are development configuration and are not clinically validated.

The Client Demo is a separate participant-only static build over the shared
runner and sensing services. It adds no authentication, backend, upload or cloud
storage and does not replace the developer application.

## Next action

**Build 7 Stage 7 — Session Detail View**

Add a detailed view for stored sessions showing the programme snapshot, timestamps, completion status, circuit progress, per-exercise/per-set prescribed versus completed dose, and completed/partial/skipped/not-attempted semantics.
