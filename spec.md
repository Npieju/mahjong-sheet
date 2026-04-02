# spec.md

## Product Summary

Build a static web application that records four-player Japanese mahjong final scores and calculates final settlement values.

## Goals

- Input four player scores based on a 25000-point start.
- Calculate score differences against a 30000-point return baseline.
- Apply placement-based adjustments.
- Present a settlement table that is easy to read and export.
- Support CSV export.
- Support shareable URLs by encoding app state into the URL.
- Persist recent state in the browser without a backend.
- Stay compatible with GitHub Pages deployment.

## Functional Requirements

1. The app must allow entry of four player names.
2. The app must allow entry of four final scores.
3. The app must validate that entered scores are numeric.
4. The app should warn when the total score does not match expected total points.
5. The app must rank players by score.
6. The app must calculate score settlement relative to 30000-point return.
7. The app must apply configurable placement bonuses.
8. The app must provide CSV export for the displayed result table.
9. The app must generate a shareable URL that restores the current state.
10. The app must restore recent state from local browser storage.

## Non-Functional Requirements

- Static-only architecture.
- Client-side calculation only.
- Mobile and desktop support.
- Fast initial load.
- Deterministic, testable calculation logic.

## Proposed Technical Approach

- Frontend: React + TypeScript + Vite.
- Styling: simple custom CSS.
- State: URL query/hash plus localStorage.
- Deployment: GitHub Actions to GitHub Pages.

## Pending Research

- Verify the exact Mahjong Soul formula, including ranking bonus and rounding.
- Decide default placement bonus values.
- Decide compact URL serialization format.
