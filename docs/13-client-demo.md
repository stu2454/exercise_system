# Client Demo and GitHub Pages deployment

## Purpose

The Client Demo is a clean participant-facing surface for external sharing. A
visitor opens the static site, completes a short guided setup, and then selects
**START PROGRAMME**. The demo runs Exercise 01 through Exercise 09 once, then
shows programme completion.

It is a prototype interaction and technology demonstration. It is not presented
as clinically validated or as a medical device.

## Client Demo user flow

```text
Welcome → Prepare space → Enable camera → Position body
→ Three-movement tutorial → Ready
→ Nine-exercise programme → Complete
```

Camera permission is not requested on page load. It is requested only after the
participant reaches Camera Setup and selects **ENABLE CAMERA**. The resulting
stream is retained throughout positioning and the tutorial and reused by the
programme. The pose engine uses one onboarding loop and is cleanly rebound to
the programme's camera canvas without creating a second MediaStream.

The positioning step uses the existing debounced framing guidance to check for
a detected body, approximate centre position, useful body size and full-body
visibility. The checks are forgiving and are a usability aid only. They are not
clinical calibration or an assessment, and **CONTINUE ANYWAY** prevents an
unreliable landmark from blocking the participant.

The tutorial contains exactly three movements:

1. **Stand in the centre** — a usable pose with shoulders and hips remains
   visible for approximately 750 ms; brief tracking loss is tolerated.
2. **Raise your arms** — both wrists move above their respective shoulders and
   then return below shoulder level.
3. **Step to the side** — shoulder/hip body centre shifts horizontally and then
   returns towards its starting position.

After successful positioning or tutorial recognition, the participant can hold
their right arm above their shoulder for 650 ms to continue without approaching
the device. The same canonical ready-gesture detector used by the programme is
reused here; it requires the arm to be lowered between screens so a held gesture
cannot skip the next instruction. Each screen retains a secondary button for
accessibility and a **CONTINUE ANYWAY** path when recognition is incomplete.

Tutorial observations are not exercises and do not create or enter a
`ProgrammeSessionResult`. The actual session tracker is created only from the
final Ready screen's **START PROGRAMME** action.

## One engine, multiple application surfaces

The normal Vite root loads the developer `App`. The `client-demo/` Vite root
loads `ClientDemoApp` and does not import the developer application, navigation,
programme editor, Exercise Library, replay UI or diagnostic controls.

Both surfaces consume the same exercise definitions, programme runner,
participant screen, camera and MediaPipe pipeline, movement processing,
programme-session tracker, reference playback and prompt service.

`createClientDemoProgramme` makes an independent copy of the current development
programme and overrides each prescription's circuit set count to one. Dose,
duration, order, demonstration preferences and transition rest remain sourced
from the existing programme. The shared runner retains its multi-round support.

## Programme flow

```text
Exercise 01 → Rest → Exercise 02 → … → Rest → Exercise 09
→ Programme Complete
```

There is no rest after Exercise 09 and no second circuit. The Client Demo shows
only `Exercise X of 9`; round, circuit and set counters are omitted.

## Local development and builds

```bash
npm run dev          # full developer application
npm run dev:demo     # participant-only Client Demo development server
npm run build        # developer production build in dist/
npm run build:demo   # static Client Demo build in dist-demo/
npm run preview:demo # preview dist-demo/
```

Vite's configured `base` is applied when reference videos and natural-audio
prompts are played. To reproduce a project-site deployment locally:

```bash
npm run build:demo -- --base /exercise_system/
```

The Client Demo uses one root page and no client-side routes, so refreshing the
GitHub Pages URL does not require a server fallback.

## GitHub Pages deployment

The `Deploy Client Demo to GitHub Pages` workflow runs on pushes to `master` and
manual dispatch. It checks out the repository, installs with `npm ci`, runs the
complete test suite, configures Pages, builds with `/${repository-name}/` as the
Vite base, uploads `dist-demo/`, and deploys through the `github-pages`
environment.

One-time repository configuration is required:

**Settings → Pages → Build and deployment → Source → GitHub Actions**

The expected URL is `https://<username>.github.io/<repository-name>/`. No server
runtime, database, runtime secret or server-side route is required.

## Privacy and error behaviour

Camera and MediaPipe inference execute in the browser. Camera video, images and
pose streams are not uploaded. The demo does not expose diagnostic recording or
download controls. Camera denial/unavailability, pose initialisation failure and
reference playback problems use concise participant-facing messages and do not
show raw errors in the page.

MediaPipe currently downloads its browser WASM and pose model from the configured
public CDNs at runtime. The site is static, but first use therefore requires
network access beyond the Pages assets.

## Verification

Automated tests cover the one-pass derivation, preserved order/dose/rest,
Exercise 1-to-2 transition, final Exercise 9 completion, retained multi-round
behaviour, landing-screen copy and repository-base asset resolution. Completion
also requires the full test suite, both production builds, generated-output
inspection and `git diff --check`.

Camera permission, pose inference, autoplay policy and full programme timing
must still be manually smoke-tested in current Chrome, Safari and Edge when a
deployed HTTPS URL is available.

Framing and tutorial recognition remain deliberately simple. Lighting, camera
field of view, loose clothing, furniture and occlusion can affect landmarks;
mirrored presentation is why the tutorial says “sideways” rather than naming a
side. The checks do not assess exercise quality or safety.

## Distance-readable presentation

Onboarding is designed for a participant standing approximately 1–2 metres from
the device. Each screen uses one short primary instruction, large responsive
headings, high-contrast camera feedback and a prominent right-arm continuation
prompt. Space preparation is reduced to four scannable actions with bold lead
words. Privacy and prototype qualifications remain visible but do not compete
with the current movement instruction. Supporting text, setup navigation,
section labels, safety messages and fallback controls use deliberately large
minimum sizes as well; wide screens allocate more horizontal space to the
instruction column rather than leaving it unused. Responsive vertical spacing
separates section labels, headings, primary instructions, gesture prompts,
camera feedback and fallback actions so the different text tiers remain easy to
scan from a distance.
