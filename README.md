# mahjong-sheet

Static web app for Japanese mahjong score sheet calculation.

## Current MVP

- Multi-game table input
- Player names as columns
- Automatic completion of the fourth score when three scores are entered
- Mahjong Soul style final score calculation
- Seat-order tie-break
- CSV export
- Shareable URL output
- Browser-side state restoration
- GitHub Pages deployment workflow

## Development

```bash
npm install
npm run dev
```

## Validation

```bash
npm test
npm run build
```

## Deploy

GitHub Actions deploys the built app to GitHub Pages.
