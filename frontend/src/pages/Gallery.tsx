import { useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import lorenArt from '../assets/lorenrenn2.png';
import {
  initSession,
  fetchSession,
  clickCat,
  purchaseFeatureUnlock,
  purchaseAutoUpgrade,
  purchaseClickUpgrade,
  buyCatnip,
  useCatnip,
  type GameState,
  type ActiveEffect,
} from '../api/catApi';

// ── Constants (costs must match backend cat-types.ts) ─────────────────────

const SESSION_KEY             = 'cat_clicker_session';
const ENERGY_REGEN_PER_SECOND = 5;
const CATNIP_COST_DISPLAY     = 150;

const BLOCKED_MESSAGES: Record<string, string> = {
  no_energy:         '😴 no energy! wait a moment...',
  cooldown:          '⏳ too fast!',
  cat_bite:          '😾 ouch! the cat bit you!',
  session_not_found: '🔄 session expired — reload!',
};

const PURCHASE_FAIL_MESSAGES: Record<string, string> = {
  insufficient_score: '💰 not enough score!',
  already_owned:      '✓ already owned!',
  unknown_item:       '❓ unknown item',
  no_charges:         '🌿 no catnip charges!',
  session_not_found:  '🔄 session expired — reload!',
};

const EVENT_MESSAGES: Record<ActiveEffect, string> = {
  golden_paw: '✨ Golden Paw! 5× points this click!',
  cat_bite:   '😾 Cat Bite! Clicks blocked for 15s.',
  frenzy:     '⚡ Frenzy! Free clicks are active.',
};

const EFFECT_LABELS: Record<ActiveEffect, string> = {
  golden_paw: 'golden paw',
  cat_bite:   'cat bite',
  frenzy:     'frenzy',
};

const POWER_SURGE_MESSAGE = '🔋 Power Surge! 5× score this click!';

// ── Panel data ────────────────────────────────────────────────────────────

interface AchievementDef {
  id:             string;
  icon:           string;
  name:           string;
  effect:         string; // one-line description of what it unlocks
  clicksRequired: number;
}

const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    id:             'sharp_claws',
    icon:           '🐾',
    name:           'sharp claws',
    effect:         'base click score increases to 2',
    clicksRequired: 100,
  },
  {
    id:             'combo_bonus',
    icon:           '🔥',
    name:           'combo bonus',
    effect:         'at ×5 streak, clicks deal 2× damage',
    clicksRequired: 1_000,
  },
  {
    id:             'golden_paw',
    icon:           '✨',
    name:           'golden paw',
    effect:         '5% chance per click for 5× points',
    clicksRequired: 10_000,
  },
];

interface FeatureUnlockDef {
  id: string; icon: string; name: string; description: string; cost: number;
}

// Only frenzy remains purchasable — combo & golden paw became achievements
const FEATURE_UNLOCK_DEFS: FeatureUnlockDef[] = [
  {
    id:          'frenzy',
    icon:        '⚡',
    name:        'frenzy mode',
    description: '7% chance per click to activate 10 free (zero-energy) clicks.',
    cost:        300,
  },
];

interface ClickUpgradeUiDef {
  id: string; icon: string; name: string; description: string; cost: number;
}

const CLICK_UPGRADE_UI_DEFS: ClickUpgradeUiDef[] = [
  {
    id: 'double_strike', icon: '✌️', name: 'double strike',
    description: '25% chance for each click to count twice.',
    cost: 500,
  },
  {
    id: 'click_overflow', icon: '💥', name: 'click overflow',
    description: 'Each click also adds 10% of your pets/sec as bonus score.',
    cost: 750,
  },
  {
    id: 'power_surge', icon: '🔋', name: 'power surge',
    description: 'Every 10th click since purchase deals 5× normal score.',
    cost: 1_000,
  },
];

interface AutoUpgradeUiDef {
  id: string; icon: string; name: string; description: string;
  cost: number; previewPps: number | null; previewPpsLabel?: string;
}

const AUTO_UPGRADE_UI_DEFS: AutoUpgradeUiDef[] = [
  { id: 'sleepy_helper', icon: '😴', name: 'sleepy helper',
    description: 'Autonomously pets the cat every 15 seconds.',
    cost: 75, previewPps: 0.07 },
  { id: 'purr_engine', icon: '🔧', name: 'purr engine',
    description: 'Generates +2 pets per second passively.',
    cost: 200, previewPps: 2 },
  { id: 'nap_buddy', icon: '🛏️', name: 'nap buddy',
    description: "Generates +5 pets per second even while you're away.",
    cost: 500, previewPps: 5 },
  { id: 'dream_factory', icon: '🏭', name: 'dream factory',
    description: 'Multiplies the output of all pets/sec sources by 1.5×.',
    cost: 1_200, previewPps: null, previewPpsLabel: '×1.5 pps' },
  { id: 'cat_cafe', icon: '☕', name: 'cat café',
    description: 'A very cozy establishment. Generates +20 pets per second.',
    cost: 3_000, previewPps: 20 },
];

// ── Local types ───────────────────────────────────────────────────────────

interface FloatingPoint { id: number; value: number; x: number; y: number; }

// ── Component ─────────────────────────────────────────────────────────────

function Gallery() {
  const [gameState,        setGameState]        = useState<GameState | null>(null);
  const [isLoading,        setIsLoading]        = useState(true);
  const [displayEnergy,    setDisplayEnergy]    = useState(100);
  const [statusMessage,    setStatusMessage]    = useState('');
  const [leftMessage,      setLeftMessage]      = useState(''); // left-panel purchase feedback
  const [rightMessage,     setRightMessage]     = useState(''); // right-panel purchase feedback
  const [catnipMessage,    setCatnipMessage]    = useState(''); // active-items feedback
  const [floatingPoints,   setFloatingPoints]   = useState<FloatingPoint[]>([]);
  const [eventBanner,      setEventBanner]      = useState<{ message: string; variant: string } | null>(null);
  const [isClicking,       setIsClicking]       = useState(false);
  const [catnipSecondsLeft, setCatnipSecondsLeft] = useState(0);

  const floatIdRef        = useRef(0);
  const statusTimerRef    = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const bannerTimerRef    = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const energyIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const catnipIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Session init ──────────────────────────────────────────────────────

  useEffect(() => {
    async function loadOrInit() {
      try {
        const storedId = localStorage.getItem(SESSION_KEY);
        let state: GameState | null = null;
        if (storedId) state = await fetchSession(storedId);
        if (!state)   state = await initSession();
        localStorage.setItem(SESSION_KEY, state.sessionId);
        setGameState(state);
        setDisplayEnergy(state.energy);
      } catch {
        // backend offline
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
      setDisplayEnergy(prev => Math.min(gameState.maxEnergy, prev + ENERGY_REGEN_PER_SECOND / 10));
    }, 100);
    return () => { if (energyIntervalRef.current) clearInterval(energyIntervalRef.current); };
  }, [gameState?.energy, gameState?.maxEnergy]);

  // ── Catnip countdown ──────────────────────────────────────────────────

  useEffect(() => {
    if (catnipIntervalRef.current) clearInterval(catnipIntervalRef.current);
    const until = gameState?.catnipActiveUntil ?? 0;
    const remaining = until - Date.now();
    if (remaining <= 0) { setCatnipSecondsLeft(0); return; }

    setCatnipSecondsLeft(Math.ceil(remaining / 1_000));
    catnipIntervalRef.current = setInterval(() => {
      const left = (gameState?.catnipActiveUntil ?? 0) - Date.now();
      if (left <= 0) {
        setCatnipSecondsLeft(0);
        if (catnipIntervalRef.current) clearInterval(catnipIntervalRef.current);
      } else {
        setCatnipSecondsLeft(Math.ceil(left / 1_000));
      }
    }, 1_000);
    return () => { if (catnipIntervalRef.current) clearInterval(catnipIntervalRef.current); };
  }, [gameState?.catnipActiveUntil]);

  // ── Helpers ───────────────────────────────────────────────────────────

  function showStatus(msg: string, ms = 2_500) {
    setStatusMessage(msg);
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    statusTimerRef.current = setTimeout(() => setStatusMessage(''), ms);
  }

  function showBanner(message: string, variant: string, ms = 3_000) {
    setEventBanner({ message, variant });
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = setTimeout(() => setEventBanner(null), ms);
  }

  function showEffectBanner(effect: ActiveEffect) {
    showBanner(EVENT_MESSAGES[effect], effect);
  }

  function spawnFloatingPoint(points: number, x: number, y: number) {
    const id = ++floatIdRef.current;
    setFloatingPoints(prev => [...prev, { id, value: points, x, y }]);
    setTimeout(() => setFloatingPoints(prev => prev.filter(fp => fp.id !== id)), 1_000);
  }

  function flashLeft(msg: string)   { setLeftMessage(msg);   setTimeout(() => setLeftMessage(''),   2_000); }
  function flashRight(msg: string)  { setRightMessage(msg);  setTimeout(() => setRightMessage(''),  2_000); }
  function flashCatnip(msg: string) { setCatnipMessage(msg); setTimeout(() => setCatnipMessage(''), 2_000); }

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
        if (result.event)       showEffectBanner(result.event);
        else if (result.isPowerSurge) showBanner(POWER_SURGE_MESSAGE, 'power_surge');
        return;
      }
      if (result.reason === 'session_not_found') {
        const fresh = await initSession();
        localStorage.setItem(SESSION_KEY, fresh.sessionId);
        setGameState(fresh);
        setDisplayEnergy(fresh.energy);
      }
      showStatus(BLOCKED_MESSAGES[result.reason ?? ''] ?? '❌ blocked');
    } catch {
      showStatus('🌐 connection hiccup, try again!');
    }
  }

  async function handleUnlock(featureId: string) {
    if (!gameState) return;
    try {
      const { state, success, reason } = await purchaseFeatureUnlock(gameState.sessionId, featureId);
      setGameState(state);
      setDisplayEnergy(state.energy);
      flashLeft(success ? '🔓 unlocked!' : (PURCHASE_FAIL_MESSAGES[reason ?? ''] ?? '❌ failed'));
    } catch { flashLeft('❌ purchase failed'); }
  }

  async function handleClickUpgrade(upgradeId: string) {
    if (!gameState) return;
    try {
      const { state, success, reason } = await purchaseClickUpgrade(gameState.sessionId, upgradeId);
      setGameState(state);
      setDisplayEnergy(state.energy);
      flashLeft(success ? '🔓 unlocked!' : (PURCHASE_FAIL_MESSAGES[reason ?? ''] ?? '❌ failed'));
    } catch { flashLeft('❌ purchase failed'); }
  }

  async function handleAutoPurchase(upgradeId: string) {
    if (!gameState) return;
    try {
      const { state, success, reason } = await purchaseAutoUpgrade(gameState.sessionId, upgradeId);
      setGameState(state);
      setDisplayEnergy(state.energy);
      flashRight(success ? '✅ purchased!' : (PURCHASE_FAIL_MESSAGES[reason ?? ''] ?? '❌ failed'));
    } catch { flashRight('❌ purchase failed'); }
  }

  async function handleBuyCatnip() {
    if (!gameState) return;
    try {
      const { state, success, reason } = await buyCatnip(gameState.sessionId);
      setGameState(state);
      setDisplayEnergy(state.energy);
      flashCatnip(success ? '🌿 catnip stocked!' : (PURCHASE_FAIL_MESSAGES[reason ?? ''] ?? '❌ failed'));
    } catch { flashCatnip('❌ purchase failed'); }
  }

  async function handleUseCatnip() {
    if (!gameState) return;
    try {
      const { state, success, reason } = await useCatnip(gameState.sessionId);
      setGameState(state);
      flashCatnip(success ? '🌿 catnip active!' : (PURCHASE_FAIL_MESSAGES[reason ?? ''] ?? '❌ failed'));
    } catch { flashCatnip('❌ use failed'); }
  }

  // ── Loading / offline ────────────────────────────────────────────────

  if (isLoading) {
    return <main className="gallery"><p className="gallery-loading">loading the cat...</p></main>;
  }

  if (!gameState) {
    return (
      <main className="gallery">
        <p>the backend seems to be offline. start the NestJS server and reload!</p>
        <img src={lorenArt} height={400} alt="Loren character artwork" />
      </main>
    );
  }

  // ── Derived values ────────────────────────────────────────────────────

  const energyPct   = (displayEnergy / gameState.maxEnergy) * 100;
  const energyColor = energyPct > 60 ? '#6ecf6e' : energyPct > 30 ? '#f0c040' : '#f06060';
  const pps         = gameState.totalPps;
  const ppsDisplay  = pps < 0.1 ? pps.toFixed(2) : pps < 10 ? pps.toFixed(1) : pps.toFixed(0);
  const isCatnipActive = catnipSecondsLeft > 0;

  // ── Main render ───────────────────────────────────────────────────────

  return (
    <main className="gallery-game">

      {eventBanner && (
        <div className={`event-banner event-banner--${eventBanner.variant}`}>
          {eventBanner.message}
        </div>
      )}

      <div className="game-layout">

        {/* ═══════════════════════════════════════════════════
            LEFT — Click augments
        ═══════════════════════════════════════════════════ */}
        <aside className="upgrades-panel upgrades-panel--click">
          <h3 className="panel-title">click augments</h3>

          {/* Frenzy — only remaining purchasable feature unlock */}
          {FEATURE_UNLOCK_DEFS.map(item => {
            const isOwned   = gameState.unlockedFeatures.includes(item.id);
            const canAfford = !isOwned && gameState.score >= item.cost;
            return (
              <div key={item.id} className={`upgrade-item${isOwned ? ' upgrade-item--owned' : ''}`}>
                <div className="upgrade-item-header">
                  <span className="upgrade-item-icon">{item.icon}</span>
                  <div className="upgrade-item-meta">
                    <p className="upgrade-item-name">{item.name}</p>
                    {isOwned && <p className="upgrade-item-level">active ✓</p>}
                  </div>
                </div>
                <p className="upgrade-item-desc">{item.description}</p>
                <div className="upgrade-item-footer">
                  {isOwned
                    ? <span className="upgrade-item-cost upgrade-item-cost--owned">owned</span>
                    : <>
                        <span className="upgrade-item-cost">{item.cost} pts</span>
                        <button className="upgrade-buy-btn" onClick={() => void handleUnlock(item.id)} disabled={!canAfford}>
                          unlock
                        </button>
                      </>
                  }
                </div>
              </div>
            );
          })}

          {/* Click upgrades */}
          {CLICK_UPGRADE_UI_DEFS.map(item => {
            const isOwned   = gameState.ownedClickUpgrades.includes(item.id);
            const canAfford = !isOwned && gameState.score >= item.cost;
            return (
              <div key={item.id} className={`upgrade-item${isOwned ? ' upgrade-item--owned' : ''}`}>
                <div className="upgrade-item-header">
                  <span className="upgrade-item-icon">{item.icon}</span>
                  <div className="upgrade-item-meta">
                    <p className="upgrade-item-name">{item.name}</p>
                    {isOwned && <p className="upgrade-item-level">active ✓</p>}
                  </div>
                </div>
                <p className="upgrade-item-desc">{item.description}</p>
                <div className="upgrade-item-footer">
                  {isOwned
                    ? <span className="upgrade-item-cost upgrade-item-cost--owned">owned</span>
                    : <>
                        <span className="upgrade-item-cost">{item.cost} pts</span>
                        <button className="upgrade-buy-btn" onClick={() => void handleClickUpgrade(item.id)} disabled={!canAfford}>
                          unlock
                        </button>
                      </>
                  }
                </div>
              </div>
            );
          })}

          {leftMessage && <p className="upgrade-feedback" role="status">{leftMessage}</p>}
        </aside>

        {/* ═══════════════════════════════════════════════════
            CENTER — Game content
        ═══════════════════════════════════════════════════ */}
        <div className="game-center">

          {/* Stats */}
          <div className="game-stats">
            <div className="stat-block">
              <span className="stat-label">score</span>
              <span className="stat-value">{gameState.score}</span>
            </div>
            <div className="stat-block">
              <span className="stat-label">clicks</span>
              <span className="stat-value">{gameState.clicks}</span>
            </div>
            <div className={`stat-block${gameState.comboStreak >= 5 && gameState.unlockedFeatures.includes('combo_bonus') ? ' stat-block--hot' : ''}`}>
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
              <div className="energy-bar-fill" style={{ width: `${energyPct}%`, background: energyColor }} />
            </div>
            <span className="energy-value">{Math.round(displayEnergy)}/{gameState.maxEnergy}</span>
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

          {/* ── Active items ── */}
          <div className="active-items">
            <h3 className="panel-title" style={{ textAlign: 'left', marginBottom: 4 }}>active items</h3>
            <div className={`active-item${isCatnipActive ? ' active-item--live' : ''}`}>
              <span className="active-item-icon">🌿</span>
              <div className="active-item-info">
                <p className="active-item-name">catnip</p>
                <p className={`active-item-status${isCatnipActive ? ' active-item-status--active' : ''}`}>
                  {isCatnipActive
                    ? `bite immunity — ${catnipSecondsLeft}s remaining`
                    : `×${gameState.catnipCharges} charge${gameState.catnipCharges !== 1 ? 's' : ''}`
                  }
                </p>
              </div>
              <div className="active-item-actions">
                <button
                  className="active-item-btn"
                  onClick={() => void handleBuyCatnip()}
                  disabled={gameState.score < CATNIP_COST_DISPLAY}
                >
                  buy ({CATNIP_COST_DISPLAY} pts)
                </button>
                <button
                  className="active-item-btn active-item-btn--use"
                  onClick={() => void handleUseCatnip()}
                  disabled={gameState.catnipCharges === 0 || isCatnipActive}
                >
                  use
                </button>
              </div>
            </div>
            {catnipMessage && <p className="upgrade-feedback" role="status">{catnipMessage}</p>}
          </div>

          {/* Cat */}
          <div className="cat-click-area">
            <button
              className={[
                'cat-btn',
                isClicking ? 'cat-btn--clicking' : '',
                gameState.activeEffects.includes('cat_bite') ? 'cat-btn--sleeping' : '',
              ].filter(Boolean).join(' ')}
              onClick={handleCatClick}
              aria-label="pet the cat"
            >
              <img src={lorenArt} alt="Loren character — click to pet!" draggable={false} />
              {floatingPoints.map(fp => (
                <span key={fp.id} className="floating-point" style={{ left: fp.x, top: fp.y }}>
                  +{fp.value}
                </span>
              ))}
            </button>
          </div>

          {statusMessage && <p className="status-msg" role="status">{statusMessage}</p>}
        </div>

        {/* ═══════════════════════════════════════════════════
            RIGHT — Auto upgrades
        ═══════════════════════════════════════════════════ */}
        <aside className="upgrades-panel upgrades-panel--auto">
          <h3 className="panel-title">auto upgrades</h3>
          <div className="panel-pps">
            <span className="panel-pps-value">{ppsDisplay}</span>
            <span className="panel-pps-label">pets / sec</span>
          </div>

          {AUTO_UPGRADE_UI_DEFS.map(item => {
            const isOwned   = gameState.ownedAutoUpgrades.includes(item.id);
            const canAfford = !isOwned && gameState.score >= item.cost;
            return (
              <div key={item.id} className={`upgrade-item${isOwned ? ' upgrade-item--owned' : ''}`}>
                <div className="upgrade-item-header">
                  <span className="upgrade-item-icon">{item.icon}</span>
                  <div className="upgrade-item-meta">
                    <p className="upgrade-item-name">{item.name}</p>
                    <p className="upgrade-item-pps">
                      {item.previewPps !== null ? `+${item.previewPps} pps` : (item.previewPpsLabel ?? '')}
                    </p>
                  </div>
                </div>
                <p className="upgrade-item-desc">{item.description}</p>
                <div className="upgrade-item-footer">
                  {isOwned
                    ? <span className="upgrade-item-cost upgrade-item-cost--owned">active</span>
                    : <>
                        <span className="upgrade-item-cost">{item.cost} pts</span>
                        <button className="upgrade-buy-btn" onClick={() => void handleAutoPurchase(item.id)} disabled={!canAfford}>
                          buy
                        </button>
                      </>
                  }
                </div>
              </div>
            );
          })}

          {rightMessage && <p className="upgrade-feedback" role="status">{rightMessage}</p>}
        </aside>

      </div>

      {/* ═══════════════════════════════════════════════════
          ACHIEVEMENTS — full-width below the three panels
      ═══════════════════════════════════════════════════ */}
      <section className="achievements-section">
        <h3 className="panel-title">achievements</h3>
        <div className="achievements-grid">
          {ACHIEVEMENT_DEFS.map(achv => {
            const isUnlocked = gameState.unlockedFeatures.includes(achv.id);
            const progress   = Math.min(gameState.clicks / achv.clicksRequired, 1);
            return (
              <div key={achv.id} className={`achievement-card${isUnlocked ? ' achievement-card--unlocked' : ''}`}>
                <span className="achievement-icon">{achv.icon}</span>
                <div className="achievement-body">
                  <p className="achievement-name">{achv.name}</p>
                  <p className="achievement-effect">{achv.effect}</p>
                  {!isUnlocked && (
                    <div className="achievement-progress-track">
                      <div className="achievement-progress-fill" style={{ width: `${progress * 100}%` }} />
                    </div>
                  )}
                  <p className="achievement-meta">
                    {isUnlocked
                      ? 'unlocked ✓'
                      : `${Math.min(gameState.clicks, achv.clicksRequired).toLocaleString()} / ${achv.clicksRequired.toLocaleString()} pets`
                    }
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

    </main>
  );
}

export default Gallery;
