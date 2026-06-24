import { API_BASE_URL } from './config';

// ── Shared types (mirror cat-types.ts on the backend) ────────────────────

export type ActiveEffect = 'golden_paw' | 'cat_nap' | 'frenzy';

export interface ClickResult {
  success: boolean;
  pointsGained: number;
  /** Set on failure — tells the UI what to show. */
  reason?: string;
  /** Set on success when a random event fired. */
  event?: ActiveEffect;
  comboStreak: number;
}

export interface GameState {
  sessionId: string;
  clicks: number;
  score: number;
  energy: number;
  maxEnergy: number;
  comboStreak: number;
  upgradeLevel: number;
  activeEffects: ActiveEffect[];
  /** null when the player has reached max level. */
  nextUpgradeCost: number | null;
  clicksPerPoint: number;
  lastClickResult?: ClickResult;
}

// ── API functions ─────────────────────────────────────────────────────────

/** Creates a fresh session on the server and returns the initial state. */
export async function initSession(): Promise<GameState> {
  const res = await fetch(`${API_BASE_URL}/cat/session`, { method: 'POST' });
  if (!res.ok) throw new Error(`initSession failed: ${res.status}`);
  return res.json() as Promise<GameState>;
}

/**
 * Fetches live state for an existing session (energy regeneration included).
 * Returns null when the session is not found or has expired.
 */
export async function fetchSession(sessionId: string): Promise<GameState | null> {
  const res = await fetch(`${API_BASE_URL}/cat/session/${encodeURIComponent(sessionId)}`);
  if (!res.ok) return null;
  const data = (await res.json()) as GameState | { error: string };
  if ('error' in data) return null;
  return data;
}

/** Sends one click action to the server. Returns updated state + outcome. */
export async function clickCat(
  sessionId: string,
): Promise<{ state: GameState; result: ClickResult }> {
  const res = await fetch(`${API_BASE_URL}/cat/click`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
  if (!res.ok) throw new Error(`clickCat failed: ${res.status}`);
  return res.json() as Promise<{ state: GameState; result: ClickResult }>;
}

/** Attempts to purchase the next upgrade tier. */
export async function upgradeCat(
  sessionId: string,
): Promise<{ state: GameState; success: boolean; reason?: string }> {
  const res = await fetch(`${API_BASE_URL}/cat/upgrade`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
  if (!res.ok) throw new Error(`upgradeCat failed: ${res.status}`);
  return res.json() as Promise<{ state: GameState; success: boolean; reason?: string }>;
}
