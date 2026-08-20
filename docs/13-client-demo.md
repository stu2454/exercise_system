# Client Demo and GitHub Pages deployment

## Purpose

The Client Demo is a clean participant-facing surface for external sharing. A
visitor opens the static site, sees the exercise-programme landing screen and
selects **START PROGRAMME**. The demo runs Exercise 01 through Exercise 09 once,
then shows programme completion.

It is a prototype interaction and technology demonstration. It is not presented
as clinically validated or as a medical device.

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
