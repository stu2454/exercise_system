# 01 — Project Vision

## Working name

Exercise Engagement.

The name is intentionally descriptive and temporary.

## Problem

Video-delivered exercise can show a participant what to do, but ordinarily provides little objective information about whether the participant:

- remained present;
- actually moved;
- participated throughout the session;
- used upper body, lower body and trunk;
- moved with substantial or minimal amplitude;
- broadly followed the demonstrated movement.

Traditional exercise logging usually records only completion or self-report. Camera-based systems can potentially derive richer information without requiring wearables or specialist depth cameras.

## First project question

Can a browser application using an ordinary RGB webcam and real-time pose estimation produce useful and interpretable measures of **exercise engagement**?

## Product hypothesis

A participant should be able to:

1. open a web application;
2. grant camera permission;
3. position themselves using simple framing feedback;
4. play an exercise video;
5. perform the exercise;
6. receive a simple session summary.

The system should preferentially process camera data locally and store pose-derived measurements rather than identifiable raw video.

## What engagement means in this project

Engagement is not synonymous with technical exercise correctness.

The project initially separates:

### Participation
Was the participant present and actively moving?

### Effort / movement activity
How much movement occurred and which regions of the body contributed?

### Persistence
Was participation sustained across the exercise interval?

### Responsiveness
Did movement begin and change in relation to the exercise stimulus?

### Movement similarity
At a later stage, how similar was the participant's movement pattern to the reference demonstration?

### Movement capability
Potential descriptive measures such as excursion and joint range may be captured, but must not automatically lower engagement when range is restricted.

## Explicit non-goals for the prototype

The prototype is not intended to:

- diagnose falls risk;
- diagnose disease or impairment;
- determine whether exercise is clinically safe;
- prescribe exercise;
- provide automated clinical progression;
- claim movement is "correct";
- infer motivation or psychological engagement;
- replace clinician observation;
- store continuous identifiable video by default.

## Design principles

### Privacy by architecture

Prefer:

```text
camera → pose landmarks → features → metrics
```

rather than:

```text
camera → uploaded video → server analysis
```

### Explainability

A session score must be traceable to component measures.

### Measurement before gamification

Do not add rewards, streaks or persuasive features until the measurement system behaves sensibly.

### Accessibility

The intended population may include older adults and people with mobility limitations. Low movement amplitude is not equivalent to low participation.

### Browser first

A browser implementation maximises deployability and avoids specialist hardware for the first experimental phase.

## Relationship to the earlier Vision Exercise System

The earlier project remains an independent movement-recognition laboratory. It demonstrated useful architectural patterns around:

- pose abstraction;
- quality gating;
- feature derivation;
- deterministic interpretation;
- replay;
- regression testing.

This project translates those patterns into a TypeScript/browser architecture while pursuing a different primary question: engagement with video-delivered exercise.
