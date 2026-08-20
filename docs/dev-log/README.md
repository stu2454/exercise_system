# Development log

This directory records what happened during development, why decisions were
made, what was verified, and what should happen next. It complements the concise
current-state summary in [`PROJECT_STATUS.md`](../../PROJECT_STATUS.md):

- `PROJECT_STATUS.md` answers **Where is the project now?**
- A dated development log answers **What changed, why, and what comes next?**

Use one cumulative file per development day or session:

```text
YYYY-MM-DD.md
```

If a second file is genuinely necessary for a separate major session on the
same day, use `YYYY-MM-DD-02.md`, but prefer updating the existing daily file.

Start from [`TEMPLATE.md`](TEMPLATE.md). Preserve material changes, objectives,
decisions, superseded behavior, confirmed bug causes and fixes, architecture or
persistence changes, verification, meaningful manual checks, known limitations,
and the next stage. Do not copy diffs, list trivial edits, repeat unchanged
architecture, or treat test counts as a measure of roadmap completion.

After a stage is accepted, update both the current day's log and
`PROJECT_STATUS.md`. A stage becomes complete only after its acceptance criteria
and appropriate verification are satisfied.

The older `docs/development-log/` directory contains legacy narrative records
created before this convention. Retain those as historical source material;
write new progress records here.
