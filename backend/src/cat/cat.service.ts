import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  ActiveEffect,
  CAT_NAP_CHANCE,
  CAT_NAP_DURATION_MS,
  CLICK_COOLDOWN_MS,
  COMBO_BONUS_MULTIPLIER,
  COMBO_BONUS_THRESHOLD,
  COMBO_WINDOW_MS,
  ENERGY_COST_PER_CLICK,
  ENERGY_REGEN_PER_SECOND,
  FRENZY_CHANCE,
  FRENZY_CLICK_COUNT,
  GOLDEN_PAW_CHANCE,
  MAX_ENERGY,
  MAX_UPGRADE_LEVEL,
  PlayerSession,
  SESSION_EXPIRE_MS,
  UPGRADE_COSTS,
  UPGRADE_POINTS,
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
      clicks: 0,
      score: 0,
      energy: MAX_ENERGY,
      comboStreak: 0,
      lastClickTimestamp: 0,
      lastEnergyUpdateTimestamp: now,
      upgradeLevel: 0,
      activeEffects: [],
      frenzyClicksRemaining: 0,
      lastActivityTimestamp: now,
    };
    this.sessions.set(sessionId, session);
    return this.toDto(session);
  }

  getSession(sessionId: string): GameStateDto | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    this.regenEnergy(session);
    session.lastActivityTimestamp = Date.now();
    return this.toDto(session);
  }

  processClick(sessionId: string): { state: GameStateDto; result: ClickResult } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        state: this.emptyDto(),
        result: { success: false, pointsGained: 0, reason: 'session_not_found', comboStreak: 0 },
      };
    }

    const now = Date.now();
    session.lastActivityTimestamp = now;

    // Regenerate energy based on elapsed real time
    this.regenEnergy(session);

    // ── Guard: click cooldown ───────────────────────────────────────────────
    if (session.lastClickTimestamp > 0 && now - session.lastClickTimestamp < CLICK_COOLDOWN_MS) {
      return {
        state: this.toDto(session),
        result: { success: false, pointsGained: 0, reason: 'cooldown', comboStreak: session.comboStreak },
      };
    }

    // ── Guard: cat nap blocks all clicks ───────────────────────────────────
    if (session.activeEffects.includes('cat_nap')) {
      return {
        state: this.toDto(session),
        result: { success: false, pointsGained: 0, reason: 'cat_nap', comboStreak: session.comboStreak },
      };
    }

    // ── Guard: energy (waived during frenzy) ──────────────────────────────
    const hasFrenzy = session.frenzyClicksRemaining > 0;
    if (!hasFrenzy && session.energy < ENERGY_COST_PER_CLICK) {
      return {
        state: this.toDto(session),
        result: { success: false, pointsGained: 0, reason: 'no_energy', comboStreak: session.comboStreak },
      };
    }

    // ── Click is valid — compute outcome ───────────────────────────────────

    // Combo streak
    const timeSinceLast = session.lastClickTimestamp > 0 ? now - session.lastClickTimestamp : Infinity;
    session.comboStreak = timeSinceLast <= COMBO_WINDOW_MS ? session.comboStreak + 1 : 1;
    session.lastClickTimestamp = now;

    // Base points × combo bonus
    let points = UPGRADE_POINTS[session.upgradeLevel] ?? 1;
    if (session.comboStreak >= COMBO_BONUS_THRESHOLD) {
      points *= COMBO_BONUS_MULTIPLIER;
    }

    // Random event — roll once; at most one event fires per click
    let event: ActiveEffect | undefined;
    const roll = Math.random();

    if (roll < GOLDEN_PAW_CHANCE) {
      // Golden paw: this click scores 5×
      points *= 5;
      event = 'golden_paw';
    } else if (roll < GOLDEN_PAW_CHANCE + CAT_NAP_CHANCE) {
      // Cat nap: drain energy and block clicks for CAT_NAP_DURATION_MS
      session.energy = 0;
      session.activeEffects = this.addEffect(session.activeEffects, 'cat_nap');
      event = 'cat_nap';
      setTimeout(() => {
        const s = this.sessions.get(sessionId);
        if (s) s.activeEffects = s.activeEffects.filter((e) => e !== 'cat_nap');
      }, CAT_NAP_DURATION_MS);
    } else if (roll < GOLDEN_PAW_CHANCE + CAT_NAP_CHANCE + FRENZY_CHANCE) {
      // Frenzy: FRENZY_CLICK_COUNT free (zero-energy) clicks starting from the NEXT click
      session.frenzyClicksRemaining = FRENZY_CLICK_COUNT;
      session.activeEffects = this.addEffect(session.activeEffects, 'frenzy');
      event = 'frenzy';
    }

    // Consume energy or frenzy charge
    if (hasFrenzy) {
      session.frenzyClicksRemaining = Math.max(0, session.frenzyClicksRemaining - 1);
      if (session.frenzyClicksRemaining === 0) {
        session.activeEffects = session.activeEffects.filter((e) => e !== 'frenzy');
      }
    } else {
      session.energy = Math.max(0, session.energy - ENERGY_COST_PER_CLICK);
    }

    session.score += points;
    session.clicks += 1;

    const result: ClickResult = {
      success: true,
      pointsGained: points,
      comboStreak: session.comboStreak,
      event,
    };

    return { state: this.toDto(session, result), result };
  }

  processUpgrade(sessionId: string): { state: GameStateDto; success: boolean; reason?: string } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { state: this.emptyDto(), success: false, reason: 'session_not_found' };
    }

    const nextLevel = session.upgradeLevel + 1;
    if (nextLevel > MAX_UPGRADE_LEVEL) {
      return { state: this.toDto(session), success: false, reason: 'max_level' };
    }

    const cost = UPGRADE_COSTS[nextLevel] ?? Infinity;
    if (session.score < cost) {
      return { state: this.toDto(session), success: false, reason: 'insufficient_score' };
    }

    session.score -= cost;
    session.upgradeLevel = nextLevel;
    session.lastActivityTimestamp = Date.now();

    return { state: this.toDto(session), success: true };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private regenEnergy(session: PlayerSession): void {
    const now = Date.now();
    const elapsedSec = (now - session.lastEnergyUpdateTimestamp) / 1_000;
    session.energy = Math.min(MAX_ENERGY, session.energy + elapsedSec * ENERGY_REGEN_PER_SECOND);
    session.lastEnergyUpdateTimestamp = now;
  }

  private addEffect(effects: ActiveEffect[], next: ActiveEffect): ActiveEffect[] {
    return effects.includes(next) ? effects : [...effects, next];
  }

  private toDto(session: PlayerSession, lastClickResult?: ClickResult): GameStateDto {
    const nextLevel = session.upgradeLevel + 1;
    return {
      sessionId: session.sessionId,
      clicks: session.clicks,
      score: session.score,
      energy: Math.round(session.energy),
      maxEnergy: MAX_ENERGY,
      comboStreak: session.comboStreak,
      upgradeLevel: session.upgradeLevel,
      activeEffects: [...session.activeEffects],
      nextUpgradeCost: nextLevel <= MAX_UPGRADE_LEVEL ? (UPGRADE_COSTS[nextLevel] ?? null) : null,
      clicksPerPoint: UPGRADE_POINTS[session.upgradeLevel] ?? 1,
      lastClickResult,
    };
  }

  private emptyDto(): GameStateDto {
    return {
      sessionId: '',
      clicks: 0,
      score: 0,
      energy: 0,
      maxEnergy: MAX_ENERGY,
      comboStreak: 0,
      upgradeLevel: 0,
      activeEffects: [],
      nextUpgradeCost: UPGRADE_COSTS[1] ?? null,
      clicksPerPoint: 1,
    };
  }

  private purgeExpiredSessions(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - session.lastActivityTimestamp > SESSION_EXPIRE_MS) {
        this.sessions.delete(id);
      }
    }
  }
}
