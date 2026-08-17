# 09 — First Coding-Agent Task

Paste the following into Codex or Claude Code after opening the repository.

## Task

Implement **Build 0 only**.

Read `AGENTS.md`/`CLAUDE.md` and all files in `docs/` before modifying code.

Requirements:

1. Create a minimal React + TypeScript application layout.
2. Add a webcam panel using `navigator.mediaDevices.getUserMedia`.
3. The camera must not start automatically.
4. Provide:
   - Start camera button
   - Stop camera button
   - camera status
   - clear permission/error messages
5. Ensure camera tracks are stopped when the component unmounts.
6. Do not add MediaPipe yet.
7. Do not record video.
8. Do not add a backend.
9. Keep camera logic out of the presentational component where practical.
10. Add tests for any non-trivial state/helper logic.
11. Run `npm test` and `npm run build`.
12. Update README only if setup instructions change.

Before implementation, briefly state:
- the files you intend to change;
- the design you will use.

After implementation, report:
- changed files;
- tests/build result;
- any browser permission caveats.

Do not proceed to Build 1.
