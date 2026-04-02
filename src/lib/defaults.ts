import type { AppState } from './state';
import { createGameRow } from './sheet';

export const defaultState: AppState = {
  playerNames: ['東', '南', '西', '北'],
  games: [createGameRow()],
};