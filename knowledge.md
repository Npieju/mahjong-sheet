# knowledge.md

## Confirmed Facts

- Hosting target is GitHub Pages.
- The app should remain fully static.
- Session persistence should rely on browser cache and URL encoding.
- Input is now organized as a multi-game table.
- Player names are managed as seat-order columns.
- Exactly three entered scores auto-complete the remaining fourth score.
- Mahjong Soul settlement is implemented as 25000 start, 30000 return, uma `+15 / +5 / -5 / -15`.
- Seat wind tie-breaker is applied.
- Final-score rounding uses nearest integer with `.5` rounded down.
- Any rounding drift is corrected on first place to preserve zero-sum.

## Open Points

- URL payload format is not yet optimized for length.
