import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  ACHIEVEMENT_THRESHOLDS,
  ActiveEffect,
  AUTO_UPGRADE_DEFS,
  BASE_CLICK_SCORE,
  BASE_CLICK_SCORE_ENHANCED,
  CAT_BITE_CHANCE,
  CAT_BITE_DURATION_MS,
  CATNIP_COST,
  CATNIP_DURATION_MS,
  CLICK_COOLDOWN_MS,
  CLICK_OVERFLOW_PPS_PERCENT,
  CLICK_UPGRADE_DEFS,
  COMBO_BONUS_MULTIPLIER,
  COMBO_BONUS_THRESHOLD,
  COMBO_WINDOW_MS,
  DOUBLE_STRIKE_CHANCE,
  ENERGY_COST_PER_CLICK,
  ENERGY_REGEN_PER_SECOND,
  FEATURE_UNLOCK_COSTS,
  FRENZY_CHANCE,
  FRENZY_CLICK_COUNT,
  GOLDEN_PAW_CHANCE,
  MAX_AUTO_TICK_ELAPSED_SEC,
  MAX_ENERGY,
  PlayerSession,
  POWER_SURGE_CLICK_INTERVAL,
  SESSION_EXPIRE_MS,
  ClickResult,
  GameStateDto,
} from './cat-types';

@Injectable()
export class CatService {
  private readonly sessions = new Map<string, PlayerSession>();

  // ── Public API ────────────────────────────────────────────────────────────

  initSession(): GameStateDto {
    this.purgeExpiredSessions();
    const now = Date.now();
    const sessionId = randomUUID();
    const session: PlayerSession = {
      sessionId,
      clicks:                    0,
      score:                     0,
      energy:                    MAX_ENERGY,
      comboStreak:               0,
      lastClickTimestamp:        0,
      lastEnergyUpdateTimestamp: now,
      activeEffects:             [],
      frenzyClicksRemaining:     0,
      lastActivityTimestamp:     now,
      unlockedFeatures:          [],
      ownedAutoUpgrades:         [],
      lastAutoTickTimestamp:     now,
      ownedClickUpgrades:        [],
      powerSurgeClickCounter:    0,
      catnipCharges:             0,
      catnipActiveUntil:         0,
    };
    this.sessions.set(sessionId, session);
    return this.toDto(session);
  }

  getSession(sessionId: string): GameStateDto | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    this.applyAutoTick(session);
    this.regenEnergy(session);
    session.lastActivityTimestamp = Date.now();
    return this.toDto(session);
  }

  processClick(sessionId: string): { state: GameStateDto; result: ClickResult } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        state:  this.emptyDto(),
        result: { success: false, pointsGained: 0, reason: 'session_not_found', comboStreak: 0 },
      };
    }

    const now = Date.now();
    session.lastActivityTimestamp = now;
    this.applyAutoTick(session);
    this.regenEnergy(session);

    // ── Guards ─────────────────────────────────────────────────────────────

    if (session.lastClickTimestamp > 0 && now - session.lastClickTimestamp < CLICK_COOLDOWN_MS) {
      return {
        state:  this.toDto(session),
        result: { success: false, pointsGained: 0, reason: 'cooldown', comboStreak: session.comboStreak },
      };
    }

    if (session.activeEffects.includes('cat_bite')) {
      return {
        state:  this.toDto(session),
        result: { success: false, pointsGained: 0, reason: 'cat_bite', comboStreak: session.comboStreak },
      };
    }

    const hasFrenzy = session.frenzyClicksRemaining > 0;
    if (!hasFrenzy && session.energy < ENERGY_COST_PER_CLICK) {
      return {
        state:  this.toDto(session),
        result: { success: false, pointsGained: 0, reason: 'no_energy', comboStreak: session.comboStreak },
      };
    }

    // ── Click is valid ──────────────────────────────────────────────────────

    // Combo streak
    const timeSinceLast = session.lastClickTimestamp > 0
      ? now - session.lastClickTimestamp
      : Infinity;
    session.comboStreak        = timeSinceLast <= COMBO_WINDOW_MS ? session.comboStreak + 1 : 1;
    session.lastClickTimestamp = now;

    // Base score — doubles once sharp_claws achievement is earned
    let points = session.unlockedFeatures.includes('sharp_claws')
      ? BASE_CLICK_SCORE_ENHANCED
      : BASE_CLICK_SCORE;

    // Combo bonus (only if combo_bonus achievement is unlocked)
    if (session.comboStreak >= COMBO_BONUS_THRESHOLD && session.unlockedFeatures.includes('combo_bonus')) {
      points *= COMBO_BONUS_MULTIPLIER;
    }

    // Click overflow — flat bonus equal to a % of current PPS
    if (session.ownedClickUpgrades.includes('click_overflow')) {
      points += this.computeTotalPps(session) * CLICK_OVERFLOW_PPS_PERCENT;
    }

    // Power surge — every Nth click since purchase deals 5×
    let isPowerSurgeClick = false;
    if (session.ownedClickUpgrades.includes('power_surge')) {
      session.powerSurgeClickCounter += 1;
      if (session.powerSurgeClickCounter % POWER_SURGE_CLICK_INTERVAL === 0) {
        points *= 5;
        isPowerSurgeClick = true;
      }
    }

    // Double strike — 25% chance to count the click twice
    if (session.ownedClickUpgrades.includes('double_strike') && Math.random() < DOUBLE_STRIKE_CHANCE) {
      points *= 2;
    }

    // Random event — fixed probability ranges; golden_paw and frenzy gated by unlocks
    let event: ActiveEffect | undefined;
    const roll = Math.random();

    if (roll < GOLDEN_PAW_CHANCE) {
      if (session.unlockedFeatures.includes('golden_paw')) {
        points *= 5;
        event = 'golden_paw';
      }
    } else if (roll < GOLDEN_PAW_CHANCE + CAT_BITE_CHANCE) {
      // Cat bite always fires unless catnip is active
      if (session.catnipActiveUntil <= now) {
        session.energy        = 0;
        session.activeEffects = this.addEffect(session.activeEffects, 'cat_bite');
        event = 'cat_bite';
        setTimeout(() => {
          const s = this.sessions.get(sessionId);
          if (s) s.activeEffects = s.activeEffects.filter(e => e !== 'cat_bite');
        }, CAT_BITE_DURATION_MS);
      }
    } else if (roll < GOLDEN_PAW_CHANCE + CAT_BITE_CHANCE + FRENZY_CHANCE) {
      if (session.unlockedFeatures.includes('frenzy')) {
        session.frenzyClicksRemaining = FRENZY_CLICK_COUNT;
        session.activeEffects         = this.addEffect(session.activeEffects, 'frenzy');
        event = 'frenzy';
      }
    }

    // Consume energy or frenzy charge
    if (hasFrenzy) {
      session.frenzyClicksRemaining = Math.max(0, session.frenzyClicksRemaining - 1);
      if (session.frenzyClicksRemaining === 0) {
        session.activeEffects = session.activeEffects.filter(e => e !== 'frenzy');
      }
    } else {
      session.energy = Math.max(0, session.energy - ENERGY_COST_PER_CLICK);
    }

    session.score  += points;
    session.clicks += 1;

    // Check whether any achievement thresholds were just crossed
    this.checkAchievements(session);

    const result: ClickResult = {
      success:      true,
      pointsGained: Math.round(points),
      comboStreak:  session.comboStreak,
      event,
      isPowerSurge: isPowerSurgeClick || undefined,
    };

    return { state: this.toDto(session, result), result };
  }

  purchaseFeatureUnlock(
    sessionId: string,
    featureId: string,
  ): { state: GameStateDto; success: boolean; reason?: string } {
    const session = this.sessions.get(sessionId);
    if (!session) return { state: this.emptyDto(), success: false, reason: 'session_not_found' };

    const cost = FEATURE_UNLOCK_COSTS[featureId];
    if (cost === undefined)
      return { state: this.toDto(session), success: false, reason: 'unknown_item' };
    if (session.unlockedFeatures.includes(featureId))
      return { state: this.toDto(session), success: false, reason: 'already_owned' };
    if (session.score < cost)
      return { state: this.toDto(session), success: false, reason: 'insufficient_score' };

    this.applyAutoTick(session);
    session.score -= cost;
    session.unlockedFeatures.push(featureId);
    session.lastActivityTimestamp = Date.now();
    return { state: this.toDto(session), success: true };
  }

  purchaseAutoUpgrade(
    sessionId: string,
    upgradeId: string,
  ): { state: GameStateDto; success: boolean; reason?: string } {
    const session = this.sessions.get(sessionId);
    if (!session) return { state: this.emptyDto(), success: false, reason: 'session_not_found' };

    const def = AUTO_UPGRADE_DEFS[upgradeId];
    if (!def) return { state: this.toDto(session), success: false, reason: 'unknown_item' };
    if (session.ownedAutoUpgrades.includes(upgradeId))
      return { state: this.toDto(session), success: false, reason: 'already_owned' };
    if (session.score < def.cost)
      return { state: this.toDto(session), success: false, reason: 'insufficient_score' };

    this.applyAutoTick(session);
    session.score -= def.cost;
    session.ownedAutoUpgrades.push(upgradeId);
    session.lastActivityTimestamp = Date.now();
    return { state: this.toDto(session), success: true };
  }

  purchaseClickUpgrade(
    sessionId: string,
    upgradeId: string,
  ): { state: GameStateDto; success: boolean; reason?: string } {
    const session = this.sessions.get(sessionId);
    if (!session) return { state: this.emptyDto(), success: false, reason: 'session_not_found' };

    const def = CLICK_UPGRADE_DEFS[upgradeId];
    if (!def) return { state: this.toDto(session), success: false, reason: 'unknown_item' };
    if (session.ownedClickUpgrades.includes(upgradeId))
      return { state: this.toDto(session), success: false, reason: 'already_owned' };
    if (session.score < def.cost)
      return { state: this.toDto(session), success: false, reason: 'insufficient_score' };

    this.applyAutoTick(session);
    session.score -= def.cost;
    session.ownedClickUpgrades.push(upgradeId);
    if (upgradeId === 'power_surge') session.powerSurgeClickCounter = 0;
    session.lastActivityTimestamp = Date.now();
    return { state: this.toDto(session), success: true };
  }

  /** Purchase one catnip charge (costs CATNIP_COST score). */
  buyCatnip(sessionId: string): { state: GameStateDto; success: boolean; reason?: string } {
    const session = this.sessions.get(sessionId);
    if (!session) return { state: this.emptyDto(), success: false, reason: 'session_not_found' };
    if (session.score < CATNIP_COST)
      return { state: this.toDto(session), success: false, reason: 'insufficient_score' };

    this.applyAutoTick(session);
    session.score -= CATNIP_COST;
    session.catnipCharges += 1;
    session.lastActivityTimestamp = Date.now();
    return { state: this.toDto(session), success: true };
  }

  /** Use one catnip charge — grants cat-bite immunity for CATNIP_DURATION_MS. */
  useCatnip(sessionId: string): { state: GameStateDto; success: boolean; reason?: string } {
    const session = this.sessions.get(sessionId);
    if (!session) return { state: this.emptyDto(), success: false, reason: 'session_not_found' };
    if (session.catnipCharges <= 0)
      return { state: this.toDto(session), success: false, reason: 'no_charges' };

    const now = Date.now();
    session.catnipCharges -= 1;
    // Stack with any remaining duration so back-to-back uses don't waste overlap
    session.catnipActiveUntil = Math.max(session.catnipActiveUntil, now) + CATNIP_DURATION_MS;
    session.lastActivityTimestamp = now;
    return { state: this.toDto(session), success: true };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /** Auto-unlock features when click-count milestones are reached. */
  private checkAchievements(session: PlayerSession): void {
    for (const [feature, threshold] of Object.entries(ACHIEVEMENT_THRESHOLDS)) {
      if (session.clicks >= threshold && !session.unlockedFeatures.includes(feature)) {
        session.unlockedFeatures.push(feature);
      }
    }
  }

  private applyAutoTick(session: PlayerSession): void {
    const now     = Date.now();
    const elapsed = Math.min(
      (now - session.lastAutoTickTimestamp) / 1_000,
      MAX_AUTO_TICK_ELAPSED_SEC,
    );
    const pps = this.computeTotalPps(session);
    if (pps > 0 && elapsed > 0) session.score += pps * elapsed;
    session.lastAutoTickTimestamp = now;
  }

  private computeTotalPps(session: PlayerSession): number {
    let base = 0, multiplier = 1;
    for (const id of session.ownedAutoUpgrades) {
      const def = AUTO_UPGRADE_DEFS[id];
      if (!def) continue;
      if (def.pps !== null) base += def.pps;
      else if (def.multiplier !== undefined) multiplier *= def.multiplier;
    }
    return base * multiplier;
  }

  private regenEnergy(session: PlayerSession): void {
    const now        = Date.now();
    const elapsedSec = (now - session.lastEnergyUpdateTimestamp) / 1_000;
    session.energy   = Math.min(MAX_ENERGY, session.energy + elapsedSec * ENERGY_REGEN_PER_SECOND);
    session.lastEnergyUpdateTimestamp = now;
  }

  private addEffect(effects: ActiveEffect[], next: ActiveEffect): ActiveEffect[] {
    return effects.includes(next) ? effects : [...effects, next];
  }

  private toDto(session: PlayerSession, lastClickResult?: ClickResult): GameStateDto {
    return {
      sessionId:          session.sessionId,
      clicks:             session.clicks,
      score:              Math.floor(session.score),
      energy:             Math.round(session.energy),
      maxEnergy:          MAX_ENERGY,
      comboStreak:        session.comboStreak,
      activeEffects:      [...session.activeEffects],
      unlockedFeatures:   [...session.unlockedFeatures],
      ownedAutoUpgrades:  [...session.ownedAutoUpgrades],
      totalPps:           Math.round(this.computeTotalPps(session) * 100) / 100,
      ownedClickUpgrades: [...session.ownedClickUpgrades],
      clicksPerPoint:     session.unlockedFeatures.includes('sharp_claws')
                            ? BASE_CLICK_SCORE_ENHANCED
                            : BASE_CLICK_SCORE,
      lastClickResult,
      catnipCharges:      session.catnipCharges,
      catnipActiveUntil:  session.catnipActiveUntil,
    };
  }

  private emptyDto(): GameStateDto {
    return {
      sessionId: '', clicks: 0, score: 0, energy: 0, maxEnergy: MAX_ENERGY,
      comboStreak: 0, activeEffects: [], unlockedFeatures: [],
      ownedAutoUpgrades: [], totalPps: 0, ownedClickUpgrades: [],
      clicksPerPoint: BASE_CLICK_SCORE, catnipCharges: 0, catnipActiveUntil: 0,
    };
  }

  private purgeExpiredSessions(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - session.lastActivityTimestamp > SESSION_EXPIRE_MS) this.sessions.delete(id);
    }
  }
}
