import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Gallery from './Gallery';
import * as catApi from '../api/catApi';

// ── Module mock ───────────────────────────────────────────────────────────────

vi.mock('../api/catApi');

// ── Fixtures ──────────────────────────────────────────────────────────────────

const baseState: catApi.GameState = {
  sessionId:      'test-session-id',
  clicks:         0,
  score:          0,
  energy:         100,
  maxEnergy:      100,
  comboStreak:    0,
  upgradeLevel:   0,
  activeEffects:  [],
  nextUpgradeCost: 50,
  clicksPerPoint: 1,
};

const successClick = {
  state:  { ...baseState, score: 1, clicks: 1 },
  result: { success: true, pointsGained: 1, comboStreak: 1 } satisfies catApi.ClickResult,
};

const noEnergyClick = {
  state:  { ...baseState, energy: 0 },
  result: { success: false, reason: 'no_energy', pointsGained: 0, comboStreak: 0 } satisfies catApi.ClickResult,
};

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('Gallery', () => {
  let mockInitSession:  MockedFunction<typeof catApi.initSession>;
  let mockFetchSession: MockedFunction<typeof catApi.fetchSession>;
  let mockClickCat:     MockedFunction<typeof catApi.clickCat>;
  let mockUpgradeCat:   MockedFunction<typeof catApi.upgradeCat>;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    mockInitSession  = vi.mocked(catApi.initSession);
    mockFetchSession = vi.mocked(catApi.fetchSession);
    mockClickCat     = vi.mocked(catApi.clickCat);
    mockUpgradeCat   = vi.mocked(catApi.upgradeCat);

    // Default: backend is healthy, session starts fresh
    mockInitSession.mockResolvedValue(baseState);
    mockFetchSession.mockResolvedValue(null); // no stored session by default
    mockClickCat.mockResolvedValue(successClick);
    mockUpgradeCat.mockResolvedValue({ state: baseState, success: true });

    // Keep "defined but not yet used" warnings quiet until tests are written
    void mockFetchSession;
  });

  // ── Loading state ────────────────────────────────────────────────────────

  describe('loading state', () => {
    it('shows "loading the cat..." while the session request is in flight', async () => {
      // Never-resolving promise keeps the component in loading state
      mockInitSession.mockReturnValue(new Promise(() => {}));
      render(<Gallery />);
      expect(screen.getByText(/loading the cat/i)).toBeInTheDocument();
    });

    it.todo('loading indicator disappears once the session resolves');
  });

  // ── Session initialisation ───────────────────────────────────────────────

  describe('session init — no stored session', () => {
    it.todo('calls initSession when localStorage has no stored sessionId');
    it.todo('stores the returned sessionId in localStorage under SESSION_KEY');
  });

  describe('session init — stored session', () => {
    it.todo('calls fetchSession(storedId) when localStorage has a sessionId');
    it.todo('falls back to initSession when fetchSession returns null (expired)');
    it.todo('does NOT call initSession when fetchSession returns a valid state');
  });

  // ── Offline / error state ────────────────────────────────────────────────

  describe('offline / error state', () => {
    it('shows an offline message when initSession throws', async () => {
      mockInitSession.mockRejectedValue(new Error('Network error'));
      render(<Gallery />);
      await waitFor(() =>
        expect(screen.getByText(/backend seems to be offline/i)).toBeInTheDocument(),
      );
    });

    it.todo('still renders the cat image in offline mode');
  });

  // ── Game stats display ───────────────────────────────────────────────────

  describe('game stats display', () => {
    it.todo('renders the score value from gameState');
    it.todo('renders the click count from gameState');
    it.todo('renders the combo streak from gameState');
    it.todo('adds the stat-block--hot class when comboStreak >= 5');
  });

  // ── Clicking the cat — success ───────────────────────────────────────────

  describe('clicking the cat — success', () => {
    it.todo('calls clickCat with the current sessionId');
    it.todo('updates the displayed score after a successful click');
    it.todo('spawns a floating +N label at the approximate click position');
    it.todo('shows the event banner when result.event is set');
  });

  // ── Clicking the cat — blocked ───────────────────────────────────────────

  describe('clicking the cat — blocked', () => {
    it.todo('shows the no-energy message for reason: no_energy');
    it.todo('shows the cooldown message for reason: cooldown');
    it.todo('shows the cat-nap message for reason: cat_nap');
    it.todo('status message disappears after the timeout');
  });

  // ── Clicking the cat — network error ────────────────────────────────────

  describe('clicking the cat — network error', () => {
    it.todo('shows a connection error message when clickCat rejects');
  });

  // ── Upgrade panel ────────────────────────────────────────────────────────

  describe('upgrade panel', () => {
    it('upgrade button is disabled when score < nextUpgradeCost', async () => {
      mockInitSession.mockResolvedValue({ ...baseState, score: 0, nextUpgradeCost: 50 });
      render(<Gallery />);
      const btn = await screen.findByRole('button', { name: /upgrade/i });
      expect(btn).toBeDisabled();
    });

    it('upgrade button is enabled when score >= nextUpgradeCost', async () => {
      mockInitSession.mockResolvedValue({ ...baseState, score: 100, nextUpgradeCost: 50 });
      render(<Gallery />);
      const btn = await screen.findByRole('button', { name: /upgrade/i });
      expect(btn).not.toBeDisabled();
    });

    it.todo('calls upgradeCat with sessionId and updates displayed state on success');
    it.todo('shows "max level!" when nextUpgradeCost is null');
    it.todo('shows the insufficient-score message on upgrade failure');

    // Keep userEvent import alive until the interaction tests are written
    it.todo(`uses userEvent.click — import: ${typeof userEvent}`);
  });

  // ── noEnergyClick fixture reference ─────────────────────────────────────
  // (used by blocked-click tests above — kept here so TS doesn't prune it)
  it.todo(`noEnergyClick fixture ready: ${JSON.stringify(noEnergyClick.result.reason)}`);

  // ── mockClickCat fixture reference ──────────────────────────────────────
  it.todo(`mockClickCat wired: ${typeof mockClickCat}`);
});
