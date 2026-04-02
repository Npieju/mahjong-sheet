import type { AppState } from './state';

export const defaultState: AppState = {
  players: [
    { id: 'p1', name: 'East', score: 35000 },
    { id: 'p2', name: 'South', score: 28000 },
    { id: 'p3', name: 'West', score: 22000 },
    { id: 'p4', name: 'North', score: 15000 },
  ],
  rules: {
    startPoint: 25000,
    returnPoint: 30000,
    placementBonus: [10, 5, -5, -10],
    applyOka: true,
  },
};