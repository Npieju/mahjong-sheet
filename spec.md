# spec.md

## Product Summary

Build a static web application that records four-player Japanese mahjong final scores and calculates final settlement values.

## Goals

- Input repeated four-player game results in a table.
- Use player names as table columns.
- Auto-complete the fourth score when the other three are present.
- Reproduce Mahjong Soul style final score settlement.
- Accumulate results across multiple games.
- Support CSV export.
- Support shareable URLs by encoding app state into the URL.
- Persist recent state in the browser without a backend.
- Stay compatible with GitHub Pages deployment.

## Functional Requirements

1. The app must allow entry of four player names as table columns.
2. The app must allow entry of multiple games as table rows.
3. The app must allow entry of up to four final scores per row.
4. The app must auto-complete the remaining score when exactly three scores are entered.
5. The app must validate that entered scores are numeric integers.
6. The app must flag rows whose total score does not equal 100000.
7. The app must rank players by score.
8. The app must break ties by seat order.
9. The app must calculate final scores using Mahjong Soul style 25000 start / 30000 return / +15 +5 -5 -15 uma.
10. The app must correct rounding drift back to zero-sum.
11. The app must accumulate results across completed games.
12. The app must provide CSV export for the displayed result table.
13. The app must generate a shareable URL that restores the current state.
14. The app must restore recent state from local browser storage.
15. The app must tolerate invalid shared URL payloads by falling back safely.

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

## Confirmed Rules

- 4-player Mahjong Soul style final score uses 25000 start and 30000 return.
- Uma is `+15 / +5 / -5 / -15`.
- Seat wind tie-breaker is applied.
- Final score rounding is nearest integer with `0.5` rounded down.
- Any rounding drift is corrected on first place to restore zero-sum.

## Pending Research

- Compact URL serialization format can still be improved.
