import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { CatService } from './cat.service';
import { ClickResult, GameStateDto } from './cat-types';

interface ClickBody {
  sessionId?: string;
}

interface UpgradeBody {
  sessionId?: string;
}

interface ClickResponse {
  state: GameStateDto;
  result: ClickResult;
}

interface UpgradeResponse {
  state: GameStateDto;
  success: boolean;
  reason?: string;
}

@Controller('api/cat')
export class CatController {
  constructor(private readonly catService: CatService) {}

  /** POST /api/cat/session — creates a fresh session; 201 Created. */
  @Post('session')
  @HttpCode(201)
  initSession(): GameStateDto {
    return this.catService.initSession();
  }

  /** GET /api/cat/session/:sessionId — retrieves live state, regen included. */
  @Get('session/:sessionId')
  getSession(@Param('sessionId') sessionId: string): GameStateDto | { error: string } {
    const state = this.catService.getSession(sessionId);
    if (!state) return { error: 'Session not found' };
    return state;
  }

  /** POST /api/cat/click { sessionId } — processes one click action. */
  @Post('click')
  @HttpCode(200)
  click(@Body() body: ClickBody): ClickResponse {
    return this.catService.processClick(body.sessionId ?? '');
  }

  /** POST /api/cat/upgrade { sessionId } — purchases the next upgrade tier. */
  @Post('upgrade')
  @HttpCode(200)
  upgrade(@Body() body: UpgradeBody): UpgradeResponse {
    return this.catService.processUpgrade(body.sessionId ?? '');
  }
}
