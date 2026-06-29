import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { CatService } from './cat.service';
import { ClickResult, GameStateDto } from './cat-types';

// ── Request body shapes ───────────────────────────────────────────────────

interface SessionBody     { sessionId?: string; }
interface UnlockBody      { sessionId?: string; featureId?: string; }
interface AutoUpgradeBody { sessionId?: string; upgradeId?: string; }

// ── Response shapes ───────────────────────────────────────────────────────

interface ClickResponse   { state: GameStateDto; result: ClickResult; }
interface PurchaseResponse { state: GameStateDto; success: boolean; reason?: string; }

// ── Controller ────────────────────────────────────────────────────────────

@Controller('api/cat')
export class CatController {
  constructor(private readonly catService: CatService) {}

  /** POST /api/cat/session — creates a fresh session. */
  @Post('session')
  @HttpCode(201)
  initSession(): GameStateDto {
    return this.catService.initSession();
  }

  /** GET /api/cat/session/:sessionId — live state with energy regen applied. */
  @Get('session/:sessionId')
  getSession(@Param('sessionId') sessionId: string): GameStateDto | { error: string } {
    const state = this.catService.getSession(sessionId);
    if (!state) return { error: 'Session not found' };
    return state;
  }

  /** POST /api/cat/click { sessionId } — processes one click action. */
  @Post('click')
  @HttpCode(200)
  click(@Body() body: SessionBody): ClickResponse {
    return this.catService.processClick(body.sessionId ?? '');
  }

  /** POST /api/cat/upgrade { sessionId } — purchases the next sharp-claws tier. */
  @Post('upgrade')
  @HttpCode(200)
  upgrade(@Body() body: SessionBody): PurchaseResponse {
    return this.catService.processUpgrade(body.sessionId ?? '');
  }

  /**
   * POST /api/cat/unlock { sessionId, featureId }
   * Purchases a one-time feature unlock: combo_bonus | golden_paw | frenzy.
   */
  @Post('unlock')
  @HttpCode(200)
  unlock(@Body() body: UnlockBody): PurchaseResponse {
    return this.catService.purchaseFeatureUnlock(
      body.sessionId ?? '',
      body.featureId ?? '',
    );
  }

  /**
   * POST /api/cat/auto { sessionId, upgradeId }
   * Purchases a one-time auto upgrade (passive PPS income).
   */
  @Post('auto')
  @HttpCode(200)
  purchaseAuto(@Body() body: AutoUpgradeBody): PurchaseResponse {
    return this.catService.purchaseAutoUpgrade(
      body.sessionId ?? '',
      body.upgradeId ?? '',
    );
  }
}
