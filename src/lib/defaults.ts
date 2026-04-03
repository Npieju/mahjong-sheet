import type { AppState } from './state';
import { createGameRow } from './sheet';
import { DEFAULT_RULE } from './settlement';

export const defaultState: AppState = {
  playerNames: ['東', '南', '西', '北'],
  games: [createGameRow()],
  rules: DEFAULT_RULE,
};