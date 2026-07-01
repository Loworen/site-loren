import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { CatService } from './cat.service';
import { ClickResult, GameStateDto } from './cat-types';

interface SessionBody      { sessionId?: string; }
interface UnlockBody       { sessionId?: string; featureId?: string; }
interface AutoUpgradeBody  { sessionId?: string; upgradeId?: string; }
interface ClickUpgradeBody { sessionId?: string; upgradeId?: string; }

interface ClickResponse    { state: GameStateDto; result: ClickResult; }
interface PurchaseResponse { state: GameStateDto; success: boolean; reason?: string; }

@Controller('api/cat')
export class CatController {
  constructor(private readonly catService: CatService) {}

  @Post('session')
  @HttpCode(201)
  initSession(): GameStateDto {
    return this.catService.initSession();
  }

  @Get('session/:sessionId')
  getSession(@Param('sessionId') sessionId: string): GameStateDto | { error: string } {
    const state = this.catService.getSession(sessionId);
    if (!state) return { error: 'Session not found' };
    return state;
  }

  @Post('click')
  @HttpCode(200)
  click(@Body() body: SessionBody): ClickResponse {
    return this.catService.processClick(body.sessionId ?? '');
  }

  /** POST /api/cat/unlock { sessionId, featureId } — frenzy only now */
  @Post('unlock')
  @HttpCode(200)
  unlock(@Body() body: UnlockBody): PurchaseResponse {
    return this.catService.purchaseFeatureUnlock(body.sessionId ?? '', body.featureId ?? '');
  }

  /** POST /api/cat/auto { sessionId, upgradeId } — passive PPS upgrade */
  @Post('auto')
  @HttpCode(200)
  purchaseAuto(@Body() body: AutoUpgradeBody): PurchaseResponse {
    return this.catService.purchaseAutoUpgrade(body.sessionId ?? '', body.upgradeId ?? '');
  }

  /** POST /api/cat/click-upgrade { sessionId, upgradeId } */
  @Post('click-upgrade')
  @HttpCode(200)
  purchaseClickUpgrade(@Body() body: ClickUpgradeBody): PurchaseResponse {
    return this.catService.purchaseClickUpgrade(body.sessionId ?? '', body.upgradeId ?? '');
  }

  /** POST /api/cat/catnip/buy { sessionId } — add one catnip charge */
  @Post('catnip/buy')
  @HttpCode(200)
  buyCatnip(@Body() body: SessionBody): PurchaseResponse {
    return this.catService.buyCatnip(body.sessionId ?? '');
  }

  /** POST /api/cat/catnip/use { sessionId } — activate one catnip charge */
  @Post('catnip/use')
  @HttpCode(200)
  useCatnip(@Body() body: SessionBody): PurchaseResponse {
    return this.catService.useCatnip(body.sessionId ?? '');
  }
}
