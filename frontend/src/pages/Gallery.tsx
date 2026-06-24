import { useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import lorenArt from '../assets/lorenrenn2.png';
import {
  initSession,
  fetchSession,
  clickCat,
  upgradeCat,
  type GameState,
  type ActiveEffect,
} from '../api/catApi';

// ── Constants ─────────────────────────────────────────────────────────────

const SESSION_KEY = 'cat_clicker_session';
const ENERGY_REGEN_PER_SECOND = 5;

const BLOCKED_MESSAGES: Record<string, string> = {
  no_energy: '😴 no energy! wait a moment...',
  cooldown: '⏳ too fast!',
  cat_nap: '💤 zzz... the cat is napping!',
  session_not_found: '🔄 session expired — reload!',
};

const UPGRADE_FAIL_MESSAGES: Record<string, string> = {
  insufficient_score: '💰 not enough score!',
  max_level: '🏆 already maxed out!',
};

const EVENT_MESSAGES: Record<ActiveEffect, string> = {
  golden_paw: '✨ Golden Paw! 5x points this click!',
  cat_nap: '💤 Cat Nap! Clicks are blocked briefly.',
  frenzy: '⚡ Frenzy! Free clicks are active.',
};

const EFFECT_LABELS: Record<ActiveEffect, string> = {
  golden_paw: 'golden paw',
  cat_nap: 'cat nap',
  frenzy: 'frenzy',
};

// ── Types ─────────────────────────────────────────────────────────────────

interface FloatingPoint {
  id: number;
  value: number;
  x: number;
  y: number;
}

// ── Component ─────────────────────────────────────────────────────────────

function Gallery() {
  const [gameState, setGameState]         = useState<GameState | null>(null);
  const [isLoading, setIsLoading]         = useState(true);
  const [displayEnergy, setDisplayEnergy] = useState(100); // client-side interpolation
  const [statusMessage, setStatusMessage] = useState('');
  const [upgradeMessage, setUpgradeMessage] = useState('');
  const [floatingPoints, setFloatingPoints] = useState<FloatingPoint[]>([]);
  const [eventBanner, setEventBanner]     = useState<ActiveEffect | null>(null);
  const [isClicking, setIsClicking]       = useState(false);

  const floatIdRef       = useRef(0);
  const statusTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bannerTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const energyIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Session init (TODO: implement) ───────────────────────────────────

  useEffect(() => {
    async function loadOrInit() {
      try {
        const storedId = localStorage.getItem(SESSION_KEY);
        let state: GameState | null = null;

        if (storedId) {
          state = await fetchSession(storedId);
        }

        if (!state) {
          state = await initSession();
        }

        localStorage.setItem(SESSION_KEY, state.sessionId);
        setGameState(state);
        setDisplayEnergy(state.energy);
      } catch {
        // backend offline — gameState stays null → offline render branch
      } finally {
        setIsLoading(false);
      }
    }
    void loadOrInit();
  }, []);

  // ── Client-side energy interpolation (TODO: implement) ───────────────

  useEffect(() => {
    if (energyIntervalRef.current) clearInterval(energyIntervalRef.current);
    if (!gameState) return;

    setDisplayEnergy(gameState.energy);

    energyIntervalRef.current = setInterval(() => {
      setDisplayEnergy((prev) =>
        Math.min(gameState.maxEnergy, prev + ENERGY_REGEN_PER_SECOND / 10),
      );
    }, 100);

    return () => {
      if (energyIntervalRef.current) clearInterval(energyIntervalRef.current);
    };
  }, [gameState?.energy, gameState?.maxEnergy]);

  // ── Helpers (complete — no changes needed) ───────────────────────────

  function showStatus(msg: string, ms = 2_500) {
    setStatusMessage(msg);
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    statusTimerRef.current = setTimeout(() => setStatusMessage(''), ms);
  }

  function showBanner(effect: ActiveEffect, ms = 3_000) {
    setEventBanner(effect);
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = setTimeout(() => setEventBanner(null), ms);
  }

  function spawnFloatingPoint(points: number, x: number, y: number) {
    const id = ++floatIdRef.current;
    setFloatingPoints(prev => [...prev, { id, value: points, x, y }]);
    setTimeout(() => setFloatingPoints(prev => prev.filter(fp => fp.id !== id)), 1_000);
  }

  // ── Click handler (TODO: wire up API call) ────────────────────────────

  async function handleCatClick(e: MouseEvent<HTMLButtonElement>) {
    if (!gameState) return;

    // Click press animation (complete)
    setIsClicking(true);
    setTimeout(() => setIsClicking(false), 100);

    // Capture position for floating-point label (complete)
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    try {
      const { state, result } = await clickCat(gameState.sessionId);
      setGameState(state);
      setDisplayEnergy(state.energy);

      if (result.success) {
        spawnFloatingPoint(result.pointsGained, clickX, clickY);
        if (result.event) {
          showBanner(result.event);
        }
        return;
      }

      if (result.reason === 'session_not_found') {
        const freshState = await initSession();
        localStorage.setItem(SESSION_KEY, freshState.sessionId);
        setGameState(freshState);
        setDisplayEnergy(freshState.energy);
      }

      showStatus(BLOCKED_MESSAGES[result.reason ?? ''] ?? '❌ blocked');
    } catch {
      showStatus('🌐 connection hiccup, try again!');
    }
  }

  // ── Upgrade handler (TODO: wire up API call) ──────────────────────────

  async function handleUpgrade() {
    if (!gameState) return;

    try {
      const { state, success, reason } = await upgradeCat(gameState.sessionId);
      setGameState(state);
      setDisplayEnergy(state.energy);

      if (!success && reason === 'session_not_found') {
        const freshState = await initSession();
        localStorage.setItem(SESSION_KEY, freshState.sessionId);
        setGameState(freshState);
        setDisplayEnergy(freshState.energy);
      }

      setUpgradeMessage(
        success
          ? '⬆️ upgraded!'
          : (UPGRADE_FAIL_MESSAGES[reason ?? ''] ?? '❌ upgrade failed'),
      );
      setTimeout(() => setUpgradeMessage(''), 2_000);
    } catch {
      setUpgradeMessage('❌ upgrade failed');
    }
  }

  // ── Render branches ───────────────────────────────────────────────────

  if (isLoading) {
    return (
      <main className="gallery">
        <p className="gallery-loading">loading the cat...</p>
      </main>
    );
  }

  if (!gameState) {
    return (
      <main className="gallery">
        <p>the backend seems to be offline. start the NestJS server and reload!</p>
        <img src={lorenArt} height={400} alt="Loren character artwork" />
      </main>
    );
  }

  const canUpgrade =
    gameState.nextUpgradeCost !== null && gameState.score >= gameState.nextUpgradeCost;

  const upgradeLabel =
    gameState.nextUpgradeCost !== null
      ? `upgrade (${gameState.nextUpgradeCost} pts)`
      : 'max level!';

  const energyPct = (displayEnergy / gameState.maxEnergy) * 100;
  const energyColor = energyPct > 60 ? '#6ecf6e' : energyPct > 30 ? '#f0c040' : '#f06060';

  return (
    <main className="gallery">
      {/* Event banner — shown on golden_paw / cat_nap / frenzy */}
      {eventBanner && (
        <div className={`event-banner event-banner--${eventBanner}`}>
          {EVENT_MESSAGES[eventBanner]}
        </div>
      )}

      {/* Stats row */}
      <div className="game-stats">
        <div className="stat-block">
          <span className="stat-label">score</span>
          <span className="stat-value">{gameState.score}</span>
        </div>
        <div className="stat-block">
          <span className="stat-label">clicks</span>
          <span className="stat-value">{gameState.clicks}</span>
        </div>
        <div className={`stat-block${gameState.comboStreak >= 5 ? ' stat-block--hot' : ''}`}>
          <span className="stat-label">combo</span>
          <span className="stat-value">×{gameState.comboStreak}</span>
        </div>
        <div className="stat-block">
          <span className="stat-label">pts/click</span>
          <span className="stat-value">{gameState.clicksPerPoint}</span>
        </div>
      </div>

      {/* Energy bar */}
      <div className="energy-bar-wrapper" aria-label={`energy ${Math.round(displayEnergy)} of ${gameState.maxEnergy}`}>
        <span className="energy-label">energy</span>
        <div className="energy-bar-track">
          <div
            className="energy-bar-fill"
            style={{ width: `${energyPct}%`, background: energyColor }}
          />
        </div>
        <span className="energy-value">{Math.round(displayEnergy)}/{gameState.maxEnergy}</span>
      </div>

      {gameState.activeEffects.length > 0 && (
        <div className="effects-row">
          {gameState.activeEffects.map((effect) => (
            <span key={effect} className={`effect-pill effect-pill--${effect}`}>
              {EFFECT_LABELS[effect]}
            </span>
          ))}
        </div>
      )}

      {/* Cat image — the clickable target */}
      <div className="cat-click-area">
        <button
          className={[
            'cat-btn',
            isClicking                                    ? 'cat-btn--clicking'  : '',
            gameState.activeEffects.includes('cat_nap')  ? 'cat-btn--sleeping'  : '',
          ].filter(Boolean).join(' ')}
          onClick={handleCatClick}
          aria-label="pet the cat"
        >
          <img src={lorenArt} alt="Loren character — click to pet!" draggable={false} />

          {floatingPoints.map(fp => (
            <span
              key={fp.id}
              className="floating-point"
              style={{ left: fp.x, top: fp.y }}
            >
              +{fp.value}
            </span>
          ))}
        </button>
      </div>

      {statusMessage && (
        <p className="status-msg" role="status">{statusMessage}</p>
      )}

      {/* Upgrade panel */}
      <div className="upgrade-panel">
        <p className="upgrade-level">
          upgrade level: <strong>{gameState.upgradeLevel}</strong> / 3
        </p>
        <button
          className={`upgrade-btn${canUpgrade ? ' upgrade-btn--ready' : ''}`}
          onClick={handleUpgrade}
          disabled={!canUpgrade}
        >
          {upgradeLabel}
        </button>
        {upgradeMessage && <p className="upgrade-status">{upgradeMessage}</p>}
      </div>
    </main>
  );
}

export default Gallery;
