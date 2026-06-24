// ── Game constants ─────────────────────────────────────────────────────────

export const MAX_ENERGY = 100;
export const ENERGY_COST_PER_CLICK = 10;
export const ENERGY_REGEN_PER_SECOND = 5;

export const COMBO_WINDOW_MS = 2_000; // streak resets after this gap
export const COMBO_BONUS_THRESHOLD = 5; // streak must reach this for bonus
export const COMBO_BONUS_MULTIPLIER = 2;

export const CLICK_COOLDOWN_MS = 150; // minimum ms between accepted clicks

export const SESSION_EXPIRE_MS = 30 * 60 * 1_000; // 30 minutes

export const FRENZY_CLICK_COUNT = 10; // free clicks granted by frenzy
export const CAT_NAP_DURATION_MS = 15_000; // how long cat_nap blocks clicks

// upgrade level 0 = starting state, levels 1-3 must be purchased
export const UPGRADE_COSTS: ReadonlyArray<number> = [0, 50, 200, 500];
export const UPGRADE_POINTS: ReadonlyArray<number> = [1, 2, 5, 12];
export const MAX_UPGRADE_LEVEL = 3;

// Random-event probabilities (evaluated in order for a single roll)
export const GOLDEN_PAW_CHANCE = 0.05; // 0.00-0.05 → golden paw (5× points)
export const CAT_NAP_CHANCE = 0.03; // 0.05-0.08 → cat nap (drain + block)
export const FRENZY_CHANCE = 0.07; // 0.08-0.15 → frenzy (10 free clicks)

// ── Domain types ───────────────────────────────────────────────────────────

export type ActiveEffect = 'golden_paw' | 'cat_nap' | 'frenzy';

export type ClickFailureReason =
  | 'cooldown'
  | 'no_energy'
  | 'cat_nap'
  | 'session_not_found';

/** Server-side mutable session — never exposed directly to clients. */
export interface PlayerSession {
  sessionId: string;
  clicks: number;
  score: number;
  energy: number;
  comboStreak: number;
  lastClickTimestamp: number; // ms epoch; 0 = never clicked
  lastEnergyUpdateTimestamp: number; // ms epoch; used for regen calculation
  upgradeLevel: number;
  activeEffects: ActiveEffect[];
  frenzyClicksRemaining: number;
  lastActivityTimestamp: number;
}

/** Outcome of a single click action. */
export interface ClickResult {
  success: boolean;
  pointsGained: number;
  reason?: ClickFailureReason;
  event?: ActiveEffect;
  comboStreak: number;
}

/** Sanitised view of session state sent to the client. */
export interface GameStateDto {
  sessionId: string;
  clicks: number;
  score: number;
  energy: number;
  maxEnergy: number;
  comboStreak: number;
  upgradeLevel: number;
  activeEffects: ActiveEffect[];
  /** Cost (in score) for the next upgrade, or null when already at max. */
  nextUpgradeCost: number | null;
  /** Base points gained per successful click at the current upgrade level. */
  clicksPerPoint: number;
  lastClickResult?: ClickResult;
}
