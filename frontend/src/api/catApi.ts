import { API_BASE_URL } from './config';

// ── Shared types (mirror cat-types.ts on the backend) ────────────────────

export type ActiveEffect = 'golden_paw' | 'cat_nap' | 'frenzy';

export interface ClickResult {
  success:      boolean;
  pointsGained: number;
  reason?:      string;
  event?:       ActiveEffect;
  comboStreak:  number;
}

export interface GameState {
  sessionId:         string;
  clicks:            number;
  score:             number;      // Math.floor of internal float
  energy:            number;
  maxEnergy:         number;
  comboStreak:       number;
  upgradeLevel:      number;
  activeEffects:     ActiveEffect[];
  nextUpgradeCost:   number | null;
  clicksPerPoint:    number;
  lastClickResult?:  ClickResult;
  unlockedFeatures:  string[];   // which one-time feature unlocks are active
  ownedAutoUpgrades: string[];   // which auto upgrades have been purchased
  totalPps:          number;     // current pts/sec from owned auto upgrades
}

// ── Shared response type for all purchase actions ─────────────────────────

export interface PurchaseResult {
  state:    GameState;
  success:  boolean;
  reason?:  string;
}

// ── API functions ─────────────────────────────────────────────────────────

/** Creates a fresh session on the server and returns the initial state. */
export async function initSession(): Promise<GameState> {
  const res = await fetch(`${API_BASE_URL}/cat/session`, { method: 'POST' });
  if (!res.ok) throw new Error(`initSession failed: ${res.status}`);
  return res.json() as Promise<GameState>;
}

/**
 * Fetches live state for an existing session (energy regen + PPS tick applied).
 * Returns null when the session is not found or has expired.
 */
export async function fetchSession(sessionId: string): Promise<GameState | null> {
  const res = await fetch(`${API_BASE_URL}/cat/session/${encodeURIComponent(sessionId)}`);
  if (!res.ok) return null;
  const data = (await res.json()) as GameState | { error: string };
  if ('error' in data) return null;
  return data;
}

/** Sends one click action. Returns updated state + per-click outcome. */
export async function clickCat(
  sessionId: string,
): Promise<{ state: GameState; result: ClickResult }> {
  const res = await fetch(`${API_BASE_URL}/cat/click`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ sessionId }),
  });
  if (!res.ok) throw new Error(`clickCat failed: ${res.status}`);
  return res.json() as Promise<{ state: GameState; result: ClickResult }>;
}

/** Purchases the next sharp-claws tier upgrade. */
export async function upgradeCat(sessionId: string): Promise<PurchaseResult> {
  const res = await fetch(`${API_BASE_URL}/cat/upgrade`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ sessionId }),
  });
  if (!res.ok) throw new Error(`upgradeCat failed: ${res.status}`);
  return res.json() as Promise<PurchaseResult>;
}

/**
 * Purchases a one-time feature unlock.
 * featureId: 'combo_bonus' | 'golden_paw' | 'frenzy'
 */
export async function purchaseFeatureUnlock(
  sessionId: string,
  featureId: string,
): Promise<PurchaseResult> {
  const res = await fetch(`${API_BASE_URL}/cat/unlock`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ sessionId, featureId }),
  });
  if (!res.ok) throw new Error(`purchaseFeatureUnlock failed: ${res.status}`);
  return res.json() as Promise<PurchaseResult>;
}

/**
 * Purchases a one-time auto upgrade (passive PPS income).
 * upgradeId: 'sleepy_helper' | 'purr_engine' | 'nap_buddy' | 'dream_factory' | 'cat_cafe'
 */
export async function purchaseAutoUpgrade(
  sessionId: string,
  upgradeId: string,
): Promise<PurchaseResult> {
  const res = await fetch(`${API_BASE_URL}/cat/auto`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ sessionId, upgradeId }),
  });
  if (!res.ok) throw new Error(`purchaseAutoUpgrade failed: ${res.status}`);
  return res.json() as Promise<PurchaseResult>;
}
