// ── Click mechanics ───────────────────────────────────────────────────────

export const MAX_ENERGY              = 100;
export const ENERGY_COST_PER_CLICK   = 10;
export const ENERGY_REGEN_PER_SECOND = 5;

export const COMBO_WINDOW_MS        = 2_000;
export const COMBO_BONUS_THRESHOLD  = 5;
export const COMBO_BONUS_MULTIPLIER = 2;

export const CLICK_COOLDOWN_MS = 150;
export const SESSION_EXPIRE_MS = 30 * 60 * 1_000;
export const FRENZY_CLICK_COUNT = 10;

// Random-event probabilities — evaluated against a single roll per click
export const GOLDEN_PAW_CHANCE = 0.05; // 0.00–0.05 → golden paw
export const CAT_BITE_CHANCE   = 0.03; // 0.05–0.08 → cat bite (was cat_nap)
export const FRENZY_CHANCE     = 0.07; // 0.08–0.15 → frenzy

export const CAT_BITE_DURATION_MS = 15_000; // how long a cat bite blocks clicks

// ── Achievements (auto-unlock when session.clicks hits threshold) ──────────
//   sharp_claws → base click score increases from 1 to 2
//   combo_bonus → enables 2× combo streak multiplier at ≥ COMBO_BONUS_THRESHOLD
//   golden_paw  → enables the golden_paw random event

export const ACHIEVEMENT_THRESHOLDS: Readonly<Record<string, number>> = {
  sharp_claws: 100,
  combo_bonus: 1_000,
  golden_paw:  10_000,
};

export const BASE_CLICK_SCORE          = 1; // before sharp_claws
export const BASE_CLICK_SCORE_ENHANCED = 2; // after sharp_claws

// ── Purchasable feature unlocks ───────────────────────────────────────────
// combo_bonus and golden_paw are now achievements — only frenzy is purchasable.

export const FEATURE_UNLOCK_COSTS: Readonly<Record<string, number>> = {
  frenzy: 300,
};

// ── Active items (consumables) ────────────────────────────────────────────

export const CATNIP_COST        = 150;  // pts per charge
export const CATNIP_DURATION_MS = 60_000; // 1 minute of cat-bite immunity

// ── Click upgrades (one-time, modify click outcomes) ──────────────────────

export interface ClickUpgradeDef {
  id:   string;
  cost: number;
}

export const CLICK_UPGRADE_DEFS: Readonly<Record<string, ClickUpgradeDef>> = {
  double_strike:  { id: 'double_strike',  cost:   500 },
  click_overflow: { id: 'click_overflow', cost:   750 },
  power_surge:    { id: 'power_surge',    cost: 1_000 },
};

export const DOUBLE_STRIKE_CHANCE       = 0.25;
export const CLICK_OVERFLOW_PPS_PERCENT = 0.10;
export const POWER_SURGE_CLICK_INTERVAL = 10;

// ── Auto upgrades (passive PPS income) ───────────────────────────────────

export interface AutoUpgradeDef {
  id:          string;
  pps:         number | null;
  multiplier?: number;
  cost:        number;
}

export const AUTO_UPGRADE_DEFS: Readonly<Record<string, AutoUpgradeDef>> = {
  sleepy_helper: { id: 'sleepy_helper', pps: 0.07, cost:    75 },
  purr_engine:   { id: 'purr_engine',   pps: 2,    cost:   200 },
  nap_buddy:     { id: 'nap_buddy',     pps: 5,    cost:   500 },
  dream_factory: { id: 'dream_factory', pps: null, multiplier: 1.5, cost: 1_200 },
  cat_cafe:      { id: 'cat_cafe',      pps: 20,   cost: 3_000 },
};

export const MAX_AUTO_TICK_ELAPSED_SEC = 3_600;

// ── Domain types ──────────────────────────────────────────────────────────

export type ActiveEffect = 'golden_paw' | 'cat_bite' | 'frenzy';

export type ClickFailureReason =
  | 'cooldown'
  | 'no_energy'
  | 'cat_bite'
  | 'session_not_found';

export interface PlayerSession {
  sessionId:                string;
  clicks:                   number;
  score:                    number;   // float; floor for display
  energy:                   number;
  comboStreak:              number;
  lastClickTimestamp:       number;
  lastEnergyUpdateTimestamp:number;
  activeEffects:            ActiveEffect[];
  frenzyClicksRemaining:    number;
  lastActivityTimestamp:    number;
  unlockedFeatures:         string[]; // achievements + purchased feature unlocks
  ownedAutoUpgrades:        string[];
  lastAutoTickTimestamp:    number;
  ownedClickUpgrades:       string[];
  powerSurgeClickCounter:   number;
  catnipCharges:            number;
  catnipActiveUntil:        number;   // epoch ms; 0 = inactive
}

export interface ClickResult {
  success:       boolean;
  pointsGained:  number;
  reason?:       ClickFailureReason;
  event?:        ActiveEffect;
  comboStreak:   number;
  isPowerSurge?: boolean;
}

export interface GameStateDto {
  sessionId:         string;
  clicks:            number;
  score:             number;
  energy:            number;
  maxEnergy:         number;
  comboStreak:       number;
  activeEffects:     ActiveEffect[];
  unlockedFeatures:  string[];
  ownedAutoUpgrades: string[];
  totalPps:          number;
  ownedClickUpgrades:string[];
  clicksPerPoint:    number;         // 1 or 2 depending on sharp_claws achievement
  lastClickResult?:  ClickResult;
  catnipCharges:     number;
  catnipActiveUntil: number;
}
