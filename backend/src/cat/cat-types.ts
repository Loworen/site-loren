// ── Click mechanics ───────────────────────────────────────────────────────

export const MAX_ENERGY              = 100;
export const ENERGY_COST_PER_CLICK   = 10;
export const ENERGY_REGEN_PER_SECOND = 5;

export const COMBO_WINDOW_MS          = 2_000; // streak resets after this gap
export const COMBO_BONUS_THRESHOLD    = 5;     // streak must reach this for bonus
export const COMBO_BONUS_MULTIPLIER   = 2;

export const CLICK_COOLDOWN_MS        = 150;   // minimum ms between accepted clicks

export const SESSION_EXPIRE_MS        = 30 * 60 * 1_000; // 30 minutes

export const FRENZY_CLICK_COUNT   = 10;
export const CAT_NAP_DURATION_MS  = 15_000;

// Tiered click-power upgrade (sharp claws)
export const UPGRADE_COSTS:  ReadonlyArray<number> = [0,  50, 200, 500];
export const UPGRADE_POINTS: ReadonlyArray<number> = [1,   2,   5,  12];
export const MAX_UPGRADE_LEVEL = 3;

// Random-event probabilities — ranges are checked against a single roll per click
export const GOLDEN_PAW_CHANCE = 0.05; // 0.00–0.05 → golden paw (5× pts, unlockable)
export const CAT_NAP_CHANCE    = 0.03; // 0.05–0.08 → cat nap  (drain + block, always active)
export const FRENZY_CHANCE     = 0.07; // 0.08–0.15 → frenzy   (10 free clicks, unlockable)

// ── One-time feature unlocks ──────────────────────────────────────────────

/**
 * Features that are locked by default and must be purchased once to activate.
 *   combo_bonus  → 2× multiplier once streak ≥ COMBO_BONUS_THRESHOLD
 *   golden_paw   → golden_paw random event starts firing
 *   frenzy       → frenzy random event starts firing
 */
export const FEATURE_UNLOCK_COSTS: Readonly<Record<string, number>> = {
  combo_bonus: 75,
  golden_paw:  150,
  frenzy:      300,
};

// ── Click upgrades (one-time, modify click outcomes) ──────────────────────

export interface ClickUpgradeDef {
  id:   string;
  cost: number;
}

/**
 * One-time click-side upgrades that, once purchased, permanently modify
 * how processClick() computes a click's outcome:
 *   double_strike  → 25% chance per click to count the click twice
 *   click_overflow → each click adds 10% of current totalPps as bonus score
 *   power_surge    → every 10th click (since purchase) deals 5× normal score
 */
export const CLICK_UPGRADE_DEFS: Readonly<Record<string, ClickUpgradeDef>> = {
  double_strike:  { id: 'double_strike',  cost:   500 },
  click_overflow: { id: 'click_overflow', cost:   750 },
  power_surge:    { id: 'power_surge',    cost: 1_000 },
};

export const DOUBLE_STRIKE_CHANCE       = 0.25; // 25% chance to count twice
export const CLICK_OVERFLOW_PPS_PERCENT = 0.10; // 10% of totalPps added per click
export const POWER_SURGE_CLICK_INTERVAL = 10;   // every Nth click since purchase

// ── Auto upgrades (passive PPS income) ───────────────────────────────────

export interface AutoUpgradeDef {
  id:           string;
  pps:          number | null; // pts per second added; null = multiplier type
  multiplier?:  number;        // set only when pps is null
  cost:         number;
}

/** One-time purchases; each one adds passive income to the session. */
export const AUTO_UPGRADE_DEFS: Readonly<Record<string, AutoUpgradeDef>> = {
  sleepy_helper: { id: 'sleepy_helper', pps: 0.07, cost:    75 },
  purr_engine:   { id: 'purr_engine',   pps: 2,    cost:   200 },
  nap_buddy:     { id: 'nap_buddy',     pps: 5,    cost:   500 },
  dream_factory: { id: 'dream_factory', pps: null, multiplier: 1.5, cost: 1_200 },
  cat_cafe:      { id: 'cat_cafe',      pps: 20,   cost: 3_000 },
};

/** Cap offline PPS accumulation to prevent runaway ballooning on reconnect. */
export const MAX_AUTO_TICK_ELAPSED_SEC = 3_600; // 1 hour

// ── Domain types ──────────────────────────────────────────────────────────

export type ActiveEffect = 'golden_paw' | 'cat_nap' | 'frenzy';

export type ClickFailureReason =
  | 'cooldown'
  | 'no_energy'
  | 'cat_nap'
  | 'session_not_found';

/** Server-side mutable session — never exposed directly to clients. */
export interface PlayerSession {
  sessionId:               string;
  clicks:                  number;
  score:                   number;  // float; use Math.floor for display
  energy:                  number;
  comboStreak:             number;
  lastClickTimestamp:      number;  // epoch ms; 0 = never clicked
  lastEnergyUpdateTimestamp: number;
  upgradeLevel:            number;
  activeEffects:           ActiveEffect[];
  frenzyClicksRemaining:   number;
  lastActivityTimestamp:   number;
  // ── new ──
  unlockedFeatures:        string[]; // feature IDs that have been purchased
  ownedAutoUpgrades:       string[]; // auto upgrade IDs that have been purchased
  lastAutoTickTimestamp:   number;   // epoch ms; used for PPS income calculation
  ownedClickUpgrades:      string[]; // click upgrade IDs that have been purchased
  powerSurgeClickCounter:  number;   // counts clicks since power_surge was purchased
}

/** Outcome of a single click action. */
export interface ClickResult {
  success:        boolean;
  pointsGained:   number;
  reason?:        ClickFailureReason;
  event?:         ActiveEffect;
  comboStreak:    number;
  isPowerSurge?:  boolean; // true when this click triggered a power_surge 5× hit
}

/** Sanitised view of session state sent to the client. */
export interface GameStateDto {
  sessionId:        string;
  clicks:           number;
  score:            number;  // Math.floor of internal float
  energy:           number;
  maxEnergy:        number;
  comboStreak:      number;
  upgradeLevel:     number;
  activeEffects:    ActiveEffect[];
  nextUpgradeCost:  number | null;
  clicksPerPoint:   number;
  lastClickResult?: ClickResult;
  // ── new ──
  unlockedFeatures:  string[];
  ownedAutoUpgrades: string[];
  totalPps:          number;  // current pts/sec from owned auto upgrades
  ownedClickUpgrades: string[];
}
