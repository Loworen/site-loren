import { API_BASE_URL } from './config';

// ── Shared types (mirror cat-types.ts on the backend) ─────────────────────

export type ActiveEffect = 'golden_paw' | 'cat_bite' | 'frenzy';

export interface ClickResult {
  success:       boolean;
  pointsGained:  number;
  reason?:       string;
  event?:        ActiveEffect;
  comboStreak:   number;
  isPowerSurge?: boolean;
}

export interface GameState {
  sessionId:          string;
  clicks:             number;
  score:              number;
  energy:             number;
  maxEnergy:          number;
  comboStreak:        number;
  activeEffects:      ActiveEffect[];
  unlockedFeatures:   string[];   // achievements + frenzy feature unlock
  ownedAutoUpgrades:  string[];
  totalPps:           number;
  ownedClickUpgrades: string[];
  clicksPerPoint:     number;     // 1 or 2 depending on sharp_claws achievement
  lastClickResult?:   ClickResult;
  catnipCharges:      number;
  catnipActiveUntil:  number;     // epoch ms; 0 = inactive
}

export interface PurchaseResult {
  state:   GameState;
  success: boolean;
  reason?: string;
}

// ── API functions ──────────────────────────────────────────────────────────

export async function initSession(): Promise<GameState> {
  const res = await fetch(`${API_BASE_URL}/cat/session`, { method: 'POST' });
  if (!res.ok) throw new Error(`initSession failed: ${res.status}`);
  return res.json() as Promise<GameState>;
}

export async function fetchSession(sessionId: string): Promise<GameState | null> {
  const res = await fetch(`${API_BASE_URL}/cat/session/${encodeURIComponent(sessionId)}`);
  if (!res.ok) return null;
  const data = (await res.json()) as GameState | { error: string };
  if ('error' in data) return null;
  return data;
}

export async function clickCat(sessionId: string): Promise<{ state: GameState; result: ClickResult }> {
  const res = await fetch(`${API_BASE_URL}/cat/click`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
  if (!res.ok) throw new Error(`clickCat failed: ${res.status}`);
  return res.json() as Promise<{ state: GameState; result: ClickResult }>;
}

/** Purchases a one-time feature unlock — currently only 'frenzy'. */
export async function purchaseFeatureUnlock(sessionId: string, featureId: string): Promise<PurchaseResult> {
  const res = await fetch(`${API_BASE_URL}/cat/unlock`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, featureId }),
  });
  if (!res.ok) throw new Error(`purchaseFeatureUnlock failed: ${res.status}`);
  return res.json() as Promise<PurchaseResult>;
}

export async function purchaseAutoUpgrade(sessionId: string, upgradeId: string): Promise<PurchaseResult> {
  const res = await fetch(`${API_BASE_URL}/cat/auto`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, upgradeId }),
  });
  if (!res.ok) throw new Error(`purchaseAutoUpgrade failed: ${res.status}`);
  return res.json() as Promise<PurchaseResult>;
}

export async function purchaseClickUpgrade(sessionId: string, upgradeId: string): Promise<PurchaseResult> {
  const res = await fetch(`${API_BASE_URL}/cat/click-upgrade`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, upgradeId }),
  });
  if (!res.ok) throw new Error(`purchaseClickUpgrade failed: ${res.status}`);
  return res.json() as Promise<PurchaseResult>;
}

/** Purchase one catnip charge (costs score, grants cat-bite immunity when used). */
export async function buyCatnip(sessionId: string): Promise<PurchaseResult> {
  const res = await fetch(`${API_BASE_URL}/cat/catnip/buy`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
  if (!res.ok) throw new Error(`buyCatnip failed: ${res.status}`);
  return res.json() as Promise<PurchaseResult>;
}

/** Activate one catnip charge — prevents cat bites for 60 seconds. */
export async function useCatnip(sessionId: string): Promise<PurchaseResult> {
  const res = await fetch(`${API_BASE_URL}/cat/catnip/use`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
  if (!res.ok) throw new Error(`useCatnip failed: ${res.status}`);
  return res.json() as Promise<PurchaseResult>;
}
