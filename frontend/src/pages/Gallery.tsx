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

// ── Runtime constants ─────────────────────────────────────────────────────

const SESSION_KEY             = 'cat_clicker_session';
const ENERGY_REGEN_PER_SECOND = 5;

const BLOCKED_MESSAGES: Record<string, string> = {
  no_energy:         '😴 no energy! wait a moment...',
  cooldown:          '⏳ too fast!',
  cat_nap:           '💤 zzz... the cat is napping!',
  session_not_found: '🔄 session expired — reload!',
};

const UPGRADE_FAIL_MESSAGES: Record<string, string> = {
  insufficient_score: '💰 not enough score!',
  max_level:          '🏆 already maxed out!',
};

const EVENT_MESSAGES: Record<ActiveEffect, string> = {
  golden_paw: '✨ Golden Paw! 5× points this click!',
  cat_nap:    '💤 Cat Nap! Clicks are blocked briefly.',
  frenzy:     '⚡ Frenzy! Free clicks are active.',
};

const EFFECT_LABELS: Record<ActiveEffect, string> = {
  golden_paw: 'golden paw',
  cat_nap:    'cat nap',
  frenzy:     'frenzy',
};

// ── Upgrade panel data ────────────────────────────────────────────────────

interface ClickUpgradePlaceholder {
  id:          string;
  icon:        string;
  name:        string;
  description: string;
  previewCost: number;
}

interface AutoUpgrade {
  id:               string;
  icon:             string;
  name:             string;
  description:      string;
  previewCost:      number;
  previewPps:       number | null; // null = multiplier-type (e.g., ×1.5)
  previewPpsLabel?: string;        // custom label for multipliers
}

/** Click-side upgrades that are not yet wired to the backend. */
const CLICK_PLACEHOLDER_UPGRADES: ClickUpgradePlaceholder[] = [
  {
    id:          'combo_extender',
    icon:        '⏱️',
    name:        'combo extender',
    description: 'Widens the combo window, making streaks easier to maintain.',
    previewCost: 100,
  },
  {
    id:          'double_strike',
    icon:        '✌️',
    name:        'double strike',
    description: '25% chance for each click to count twice.',
    previewCost: 250,
  },
  {
    id:          'click_overflow',
    icon:        '💥',
    name:        'click overflow',
    description: 'Each click also deals 10% of your pets/sec as a bonus.',
    previewCost: 500,
  },
  {
    id:          'power_surge',
    icon:        '⚡',
    name:        'power surge',
    description: 'Every 10th click deals 5× normal score.',
    previewCost: 750,
  },
];

/** Passive upgrades that generate score without player input. */
const AUTO_UPGRADE_ITEMS: AutoUpgrade[] = [
  {
    id:          'sleepy_helper',
    icon:        '😴',
    name:        'sleepy helper',
    description: 'Autonomously pets the cat every 15 seconds.',
    previewCost: 75,
    previewPps:  0.07,
  },
  {
    id:          'purr_engine',
    icon:        '🔧',
    name:        'purr engine',
    description: 'Generates +2 pets per second, passively.',
    previewCost: 200,
    previewPps:  2,
  },
  {
    id:          'nap_buddy',
    icon:        '🛏️',
    name:        'nap buddy',
    description: 'Generates +5 pets per second even while you\'re away.',
    previewCost: 500,
    previewPps:  5,
  },
  {
    id:               'dream_factory',
    icon:             '🏭',
    name:             'dream factory',
    description:      'Multiplies the output of all pets/sec sources by 1.5×.',
    previewCost:      1200,
    previewPps:       null,
    previewPpsLabel:  '×1.5 pps',
  },
  {
    id:          'cat_cafe',
    icon:        '☕',
    name:        'cat café',
    description: 'A very cozy establishment. Generates +20 pets per second.',
    previewCost: 3000,
    previewPps:  20,
  },
];

// ── Local types ───────────────────────────────────────────────────────────

interface FloatingPoint {
  id:    number;
  value: number;
  x:     number;
  y:     number;
}

// ── Component ─────────────────────────────────────────────────────────────

function Gallery() {
  const [gameState,      setGameState]      = useState<GameState | null>(null);
  const [isLoading,      setIsLoading]      = useState(true);
  const [displayEnergy,  setDisplayEnergy]  = useState(100);
  const [statusMessage,  setStatusMessage]  = useState('');
  const [upgradeMessage, setUpgradeMessage] = useState('');
  const [floatingPoints, setFloatingPoints] = useState<FloatingPoint[]>([]);
  const [eventBanner,    setEventBanner]    = useState<ActiveEffect | null>(null);
  const [isClicking,     setIsClicking]     = useState(false);

  const floatIdRef        = useRef(0);
  const statusTimerRef    = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const bannerTimerRef    = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const energyIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Session init ──────────────────────────────────────────────────────

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

  // ── Client-side energy interpolation ─────────────────────────────────

  useEffect(() => {
    if (energyIntervalRef.current) clearInterval(energyIntervalRef.current);
    if (!gameState) return;

    setDisplayEnergy(gameState.energy);

    energyIntervalRef.current = setInterval(() => {
      setDisplayEnergy(prev =>
        Math.min(gameState.maxEnergy, prev + ENERGY_REGEN_PER_SECOND / 10),
      );
    }, 100);

    return () => {
      if (energyIntervalRef.current) clearInterval(energyIntervalRef.current);
    };
  }, [gameState?.energy, gameState?.maxEnergy]);

  // ── Helpers ───────────────────────────────────────────────────────────

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

  // ── Handlers ──────────────────────────────────────────────────────────

  async function handleCatClick(e: MouseEvent<HTMLButtonElement>) {
    if (!gameState) return;

    setIsClicking(true);
    setTimeout(() => setIsClicking(false), 100);

    const rect   = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    try {
      const { state, result } = await clickCat(gameState.sessionId);
      setGameState(state);
      setDisplayEnergy(state.energy);

      if (result.success) {
        spawnFloatingPoint(result.pointsGained, clickX, clickY);
        if (result.event) showBanner(result.event);
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

  // ── Render — loading ──────────────────────────────────────────────────

  if (isLoading) {
    return (
      <main className="gallery">
        <p className="gallery-loading">loading the cat...</p>
      </main>
    );
  }

  // ── Render — offline ──────────────────────────────────────────────────

  if (!gameState) {
    return (
      <main className="gallery">
        <p>the backend seems to be offline. start the NestJS server and reload!</p>
        <img src={lorenArt} height={400} alt="Loren character artwork" />
      </main>
    );
  }

  // ── Derived values ────────────────────────────────────────────────────

  const canUpgrade  = gameState.nextUpgradeCost !== null && gameState.score >= gameState.nextUpgradeCost;
  const energyPct   = (displayEnergy / gameState.maxEnergy) * 100;
  const energyColor = energyPct > 60 ? '#6ecf6e' : energyPct > 30 ? '#f0c040' : '#f06060';
  const totalPps    = 0; // placeholder — will come from gameState once auto-upgrades are backend-supported

  // ── Render — main game ────────────────────────────────────────────────

  return (
    <main className="gallery-game">

      {/* Full-width event banner */}
      {eventBanner && (
        <div className={`event-banner event-banner--${eventBanner}`}>
          {EVENT_MESSAGES[eventBanner]}
        </div>
      )}

      <div className="game-layout">

        {/* ════════════════════════════════════════════════════════════
            LEFT — Click augments
        ════════════════════════════════════════════════════════════ */}
        <aside className="upgrades-panel upgrades-panel--click">
          <h3 className="panel-title">click augments</h3>

          {/* ── Sharp Claws — wired to the existing backend upgrade ── */}
          <div className="upgrade-item">
            <div className="upgrade-item-header">
              <span className="upgrade-item-icon">🐾</span>
              <div className="upgrade-item-meta">
                <p className="upgrade-item-name">sharp claws</p>
                <p className="upgrade-item-level">lv. {gameState.upgradeLevel} / 3</p>
              </div>
            </div>
            <p className="upgrade-item-desc">
              Increases base score per click. Currently{' '}
              <strong>{gameState.clicksPerPoint}</strong> pt
              {gameState.clicksPerPoint !== 1 ? 's' : ''} per click.
            </p>
            <div className="upgrade-item-footer">
              {gameState.nextUpgradeCost !== null ? (
                <>
                  <span className="upgrade-item-cost">{gameState.nextUpgradeCost} pts</span>
                  <button
                    className="upgrade-buy-btn"
                    onClick={handleUpgrade}
                    disabled={!canUpgrade}
                  >
                    upgrade
                  </button>
                </>
              ) : (
                <span className="upgrade-item-cost upgrade-item-cost--maxed">maxed!</span>
              )}
            </div>
          </div>

          {/* ── Placeholder click upgrades ── */}
          {CLICK_PLACEHOLDER_UPGRADES.map(item => (
            <div key={item.id} className="upgrade-item upgrade-item--placeholder">
              <div className="upgrade-item-header">
                <span className="upgrade-item-icon">{item.icon}</span>
                <p className="upgrade-item-name">{item.name}</p>
              </div>
              <p className="upgrade-item-desc">{item.description}</p>
              <div className="upgrade-item-footer">
                <span className="upgrade-item-cost">{item.previewCost} pts</span>
                <span className="upgrade-coming-tag">coming soon</span>
              </div>
            </div>
          ))}

          {upgradeMessage && (
            <p className="upgrade-feedback" role="status">{upgradeMessage}</p>
          )}
        </aside>

        {/* ════════════════════════════════════════════════════════════
            CENTER — Main game content
        ════════════════════════════════════════════════════════════ */}
        <div className="game-center">

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
          <div
            className="energy-bar-wrapper"
            aria-label={`energy ${Math.round(displayEnergy)} of ${gameState.maxEnergy}`}
          >
            <span className="energy-label">energy</span>
            <div className="energy-bar-track">
              <div
                className="energy-bar-fill"
                style={{ width: `${energyPct}%`, background: energyColor }}
              />
            </div>
            <span className="energy-value">
              {Math.round(displayEnergy)}/{gameState.maxEnergy}
            </span>
          </div>

          {/* Active-effect pills */}
          {gameState.activeEffects.length > 0 && (
            <div className="effects-row">
              {gameState.activeEffects.map(effect => (
                <span key={effect} className={`effect-pill effect-pill--${effect}`}>
                  {EFFECT_LABELS[effect]}
                </span>
              ))}
            </div>
          )}

          {/* Cat — the main clickable */}
          <div className="cat-click-area">
            <button
              className={[
                'cat-btn',
                isClicking ? 'cat-btn--clicking' : '',
                gameState.activeEffects.includes('cat_nap') ? 'cat-btn--sleeping' : '',
              ].filter(Boolean).join(' ')}
              onClick={handleCatClick}
              aria-label="pet the cat"
            >
              <img
                src={lorenArt}
                alt="Loren character — click to pet!"
                draggable={false}
              />

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
        </div>

        {/* ════════════════════════════════════════════════════════════
            RIGHT — Auto upgrades (passive income)
        ════════════════════════════════════════════════════════════ */}
        <aside className="upgrades-panel upgrades-panel--auto">
          <h3 className="panel-title">auto upgrades</h3>

          <div className="panel-pps">
            <span className="panel-pps-value">{totalPps.toFixed(1)}</span>
            <span className="panel-pps-label">pets / sec</span>
          </div>

          {AUTO_UPGRADE_ITEMS.map(item => (
            <div key={item.id} className="upgrade-item upgrade-item--placeholder">
              <div className="upgrade-item-header">
                <span className="upgrade-item-icon">{item.icon}</span>
                <div className="upgrade-item-meta">
                  <p className="upgrade-item-name">{item.name}</p>
                  <p className="upgrade-item-pps">
                    {item.previewPps !== null
                      ? `+${item.previewPps} pps`
                      : (item.previewPpsLabel ?? '')}
                  </p>
                </div>
              </div>
              <p className="upgrade-item-desc">{item.description}</p>
              <div className="upgrade-item-footer">
                <span className="upgrade-item-cost">{item.previewCost} pts</span>
                <span className="upgrade-coming-tag">coming soon</span>
              </div>
            </div>
          ))}
        </aside>

      </div>
    </main>
  );
}

export default Gallery;
