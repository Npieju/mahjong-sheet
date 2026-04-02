import type { PlayerInput, RuleConfig } from './settlement';

export type AppState = {
  players: PlayerInput[];
  rules: RuleConfig;
};

const STORAGE_KEY = 'mahjong-sheet-state';

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
  return JSON.parse(fromBase64Url(value)) as AppState;
}

export function saveState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AppState) : null;
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