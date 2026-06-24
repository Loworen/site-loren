import { CatService } from './cat.service';
import {
  CLICK_COOLDOWN_MS,
  COMBO_BONUS_THRESHOLD,
  COMBO_WINDOW_MS,
  ENERGY_COST_PER_CLICK,
  MAX_ENERGY,
  MAX_UPGRADE_LEVEL,
  UPGRADE_COSTS,
} from './cat-types';

// Silence "defined but never read" — these are imported for use in the
// implemented tests and referenced in TODO comments.
void CLICK_COOLDOWN_MS, COMBO_BONUS_THRESHOLD, COMBO_WINDOW_MS,
     ENERGY_COST_PER_CLICK, MAX_ENERGY, MAX_UPGRADE_LEVEL, UPGRADE_COSTS;

describe('CatService', () => {
  let service: CatService;
  let sessionId: string;

  beforeEach(() => {
    service = new CatService();
    const state = service.initSession();
    sessionId = state.sessionId;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── initSession ──────────────────────────────────────────────────────────

  describe('initSession', () => {
    it('returns a GameStateDto with sessionId, full energy, and zero score', () => {
      const state = service.initSession();
      expect(state.sessionId).toBeTruthy();
      expect(state.energy).toBe(MAX_ENERGY);
      expect(state.score).toBe(0);
      expect(state.clicks).toBe(0);
    });

    it.todo('each call produces a unique sessionId');
    it.todo('purges expired sessions before creating a new one');
  });

  // ── getSession ───────────────────────────────────────────────────────────

  describe('getSession', () => {
    it('returns null for an unknown sessionId', () => {
      expect(service.getSession('does-not-exist')).toBeNull();
    });

    it('returns the current GameStateDto for a known session', () => {
      const state = service.getSession(sessionId);
      expect(state).not.toBeNull();
      expect(state?.sessionId).toBe(sessionId);
    });

    it.todo('applies energy regeneration based on elapsed time before returning');
  });

  // ── processClick — valid click ───────────────────────────────────────────

  describe('processClick — valid click', () => {
    it.todo('returns success: true and increments clicks by 1');
    it.todo('adds UPGRADE_POINTS[0] to score at upgrade level 0');
    it.todo('deducts ENERGY_COST_PER_CLICK from energy');
  });

  // ── processClick — guard: cooldown ───────────────────────────────────────

  describe('processClick — cooldown guard', () => {
    it.todo('rejects a second click made within CLICK_COOLDOWN_MS');
    it.todo('returns reason: "cooldown" on rejection');
    it.todo('accepts a click after CLICK_COOLDOWN_MS has elapsed');
  });

  // ── processClick — guard: no energy ─────────────────────────────────────

  describe('processClick — no-energy guard', () => {
    it.todo('rejects when energy is below ENERGY_COST_PER_CLICK');
    it.todo('returns reason: "no_energy" on rejection');
    it.todo('does not change score, clicks, or energy on rejection');
  });

  // ── processClick — guard: cat nap ────────────────────────────────────────

  describe('processClick — cat-nap guard', () => {
    it.todo('rejects while "cat_nap" is in activeEffects');
    it.todo('returns reason: "cat_nap" on rejection');
  });

  // ── processClick — guard: unknown session ────────────────────────────────

  describe('processClick — unknown session', () => {
    it.todo('returns success: false with reason "session_not_found"');
  });

  // ── processClick — combo streak ──────────────────────────────────────────

  describe('processClick — combo streak', () => {
    it.todo('increments comboStreak for consecutive clicks within COMBO_WINDOW_MS');
    it.todo('resets comboStreak to 1 when gap exceeds COMBO_WINDOW_MS');
    it.todo('doubles points once streak reaches COMBO_BONUS_THRESHOLD');
  });

  // ── processClick — random events ─────────────────────────────────────────

  describe('processClick — golden_paw event', () => {
    it.todo('multiplies pointsGained by 5 when Math.random() < GOLDEN_PAW_CHANCE');
    it.todo('sets event: "golden_paw" in the ClickResult');
  });

  describe('processClick — cat_nap event', () => {
    it.todo('drains energy to 0 and adds "cat_nap" to activeEffects');
    it.todo('removes "cat_nap" from activeEffects after CAT_NAP_DURATION_MS');
  });

  describe('processClick — frenzy event', () => {
    it.todo('adds "frenzy" to activeEffects and sets frenzyClicksRemaining');
    it.todo('frenzy clicks do not consume energy');
    it.todo('removes "frenzy" after all FRENZY_CLICK_COUNT charges are used');
  });

  // ── processUpgrade ───────────────────────────────────────────────────────

  describe('processUpgrade', () => {
    it.todo('deducts the upgrade cost and increments upgradeLevel on success');
    it.todo('returns success: true when score >= nextUpgradeCost');
    it.todo('returns success: false + reason "insufficient_score" when score is too low');
    it.todo('returns success: false + reason "max_level" at MAX_UPGRADE_LEVEL');
    it.todo('returns success: false + reason "session_not_found" for unknown sessionId');
  });
});
