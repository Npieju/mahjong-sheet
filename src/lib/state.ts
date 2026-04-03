import { createGameRow, SCORE_UNIT, type GameRow } from './sheet';

export type AppState = {
  playerNames: [string, string, string, string];
  games: GameRow[];
};

const STORAGE_KEY = 'mahjong-sheet-state';
const DEFAULT_PLAYER_NAMES: AppState['playerNames'] = ['東', '南', '西', '北'];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizePlayerNames(value: unknown): AppState['playerNames'] | null {
  if (Array.isArray(value)) {
    const names = value
      .map((entry) => (typeof entry === 'string' ? entry : ''))
      .slice(0, 4);

    if (names.length === 4) {
      return names.map((name, index) => name || DEFAULT_PLAYER_NAMES[index]) as AppState['playerNames'];
    }
  }

  return null;
}

function normalizeLegacyPlayerNames(value: unknown): AppState['playerNames'] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const names = value
    .map((entry) => (isObject(entry) && typeof entry.name === 'string' ? entry.name : ''))
    .slice(0, 4);

  if (names.length !== 4) {
    return null;
  }

  return names.map((name, index) => name || DEFAULT_PLAYER_NAMES[index]) as AppState['playerNames'];
}

function normalizeScoreValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value)) {
    return String(value / SCORE_UNIT);
  }

  return '';
}

function normalizeGames(value: unknown): GameRow[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const games = value
    .map((entry) => {
      if (!isObject(entry) || !Array.isArray(entry.scores) || entry.scores.length !== 4) {
        return null;
      }

      return {
        id: typeof entry.id === 'string' && entry.id ? entry.id : createGameRow().id,
        scores: entry.scores.map(normalizeScoreValue) as GameRow['scores'],
      } satisfies GameRow;
    })
    .filter((entry): entry is GameRow => entry !== null);

  return games.length > 0 ? games : [createGameRow()];
}

function normalizeLegacyGames(value: unknown): GameRow[] | null {
  if (!Array.isArray(value) || value.length !== 4) {
    return null;
  }

  const scores = value.map((entry) => {
    if (!isObject(entry) || typeof entry.score !== 'number' || !Number.isFinite(entry.score)) {
      return '';
    }

    return String(entry.score / SCORE_UNIT);
  }) as GameRow['scores'];

  return [{ id: createGameRow().id, scores }];
}

export function normalizeState(raw: unknown): AppState | null {
  if (!isObject(raw)) {
    return null;
  }

  const playerNames = normalizePlayerNames(raw.playerNames);
  const legacyPlayerNames = normalizeLegacyPlayerNames(raw.players);
  const games = normalizeGames(raw.games) ?? normalizeLegacyGames(raw.players);

  if (!games) {
    return null;
  }

  return {
    playerNames: playerNames ?? legacyPlayerNames ?? DEFAULT_PLAYER_NAMES,
    games,
  };
}

function toBase64Url(value: string) {
  return btoa(unescape(encodeURIComponent(value)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));

  return decodeURIComponent(escape(atob(`${normalized}${padding}`)));
}

export function serializeState(state: AppState) {
  return toBase64Url(JSON.stringify(state));
}

export function deserializeState(value: string) {
  return normalizeState(JSON.parse(fromBase64Url(value)));
}

export function saveState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeState(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function buildShareUrl(serializedState: string) {
  const url = new URL(window.location.href);
  url.searchParams.set('state', serializedState);
  return url.toString();
}

export function readSharedState() {
  try {
    const url = new URL(window.location.href);
    const payload = url.searchParams.get('state');
    return payload ? deserializeState(payload) : null;
  } catch {
    return null;
  }
}