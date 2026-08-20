# Development Progress — YYYY-MM-DD

## 1. Session summary

**Build:** Build X — Build name
**Stages worked on:** Stage X–Y
**Status:** In progress / Complete / Blocked
**Tests:** X test files / Y tests passing
**Production build:** Pass / Fail
**git diff --check:** Pass / Fail

### Outcome

A concise 2–5 sentence summary of the material outcome of this development session.

---

## 2. Build status

| Stage | Description | Status |
|---|---|---|
| 1 | Stage name | ✅ Complete |
| 2 | Stage name | 🟡 In progress |
| 3 | Stage name | ⬜ Not started |

Status vocabulary:

- ✅ Complete
- 🟡 In progress
- ⛔ Blocked
- ⬜ Not started
- 🔁 Reopened

---

## 3. Work completed this session

### Stage X — Stage name

#### Objective

What was this stage intended to achieve?

#### Implemented

- Change
- Change
- Change

#### Key behaviour

Describe important application behaviour or state transitions.

#### Data/model changes

Record material changes to types, interfaces, persistence, IDs, state machines,
event contracts, and storage schemas.

If none:

> No data-model changes.

#### Materially affected components/files

List significant areas only.

---

## 4. Decisions made

| Decision | Rationale |
|---|---|
| Decision | Reason |

Where relevant, record:

> **Supersedes:** earlier decision / implementation.

---

## 5. Bugs identified and fixed

### Bug — Short descriptive name

**Observed behaviour:**
What happened?

**Cause:**
What was the confirmed technical cause?

**Fix:**
What changed?

**Regression protection:**
What test or safeguard now prevents recurrence?

---

## 6. Architecture snapshot

Update only if architecture materially changed.

```text
Current architecture here
```

---

## 7. Persistence and data status

| Data | Storage | Persistence |
|---|---|---|
| Example | `localStorage` | Persistent |

Include storage keys/schema versions where relevant.

---

## 8. Verification

### Automated

- [ ] Unit tests pass
- [ ] Integration/regression tests pass
- [ ] Production build passes
- [ ] `git diff --check` passes

Results:

```text
X test files passed
Y tests passed
Production build passed
git diff --check passed
```

### Manual verification

- [ ] Meaningful manual test
- [ ] Meaningful manual test

Do not fill this with trivial UI checks.

---

## 9. Known limitations / technical debt

Document current known limitations only. Do not use this as a general wishlist.

---

## 10. Next stage

### Stage X — Stage name

#### Objective

Short description.

#### Planned deliverables

- Deliverable
- Deliverable
- Deliverable

#### Acceptance focus

What must work for the stage to be complete?

---

## 11. Build boundary

List functionality deliberately excluded from the current build.

---

## 12. Handover prompt for next development session

Write a short self-contained handover that states the current build, last
completed stage, next stage, current verification status, critical architectural
constraints, and the instruction to implement only the next stage.
