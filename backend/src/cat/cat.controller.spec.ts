import { Test, TestingModule } from '@nestjs/testing';
import { CatController } from './cat.controller';
import { CatService } from './cat.service';
import { ClickResult, GameStateDto } from './cat-types';

// ── Shared fixtures ──────────────────────────────────────────────────────────

const mockGameState: GameStateDto = {
  sessionId: 'mock-session-id',
  clicks: 0,
  score: 0,
  energy: 100,
  maxEnergy: 100,
  comboStreak: 0,
  upgradeLevel: 0,
  activeEffects: [],
  nextUpgradeCost: 50,
  clicksPerPoint: 1,
};

const mockClickResult: ClickResult = {
  success: true,
  pointsGained: 1,
  comboStreak: 1,
};

// ── Test suite ────────────────────────────────────────────────────────────────

describe('CatController', () => {
  let controller: CatController;
  let service: jest.Mocked<CatService>;

  beforeEach(async () => {
    const mockService: Partial<jest.Mocked<CatService>> = {
      initSession:     jest.fn().mockReturnValue(mockGameState),
      getSession:      jest.fn().mockReturnValue(mockGameState),
      processClick:    jest.fn().mockReturnValue({ state: mockGameState, result: mockClickResult }),
      processUpgrade:  jest.fn().mockReturnValue({ state: mockGameState, success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CatController],
      providers: [{ provide: CatService, useValue: mockService }],
    }).compile();

    controller = module.get<CatController>(CatController);
    service    = module.get(CatService);
  });

  // suppress "defined but never read" until tests are implemented
  afterEach(() => void service);

  // ── POST /api/cat/session ────────────────────────────────────────────────

  describe('initSession', () => {
    it.todo('calls service.initSession and returns the result');
    it.todo('delegates entirely — no additional logic in the controller');
  });

  // ── GET /api/cat/session/:sessionId ─────────────────────────────────────

  describe('getSession', () => {
    it.todo('returns the GameStateDto for a known sessionId');
    it.todo('returns { error: "Session not found" } for an unknown sessionId');
    it.todo('passes the sessionId param directly to service.getSession');
  });

  // ── POST /api/cat/click ──────────────────────────────────────────────────

  describe('click', () => {
    it.todo('passes body.sessionId to service.processClick');
    it.todo('falls back to empty string when body.sessionId is absent');
    it.todo('returns the { state, result } object from the service unchanged');
  });

  // ── POST /api/cat/upgrade ────────────────────────────────────────────────

  describe('upgrade', () => {
    it.todo('passes body.sessionId to service.processUpgrade');
    it.todo('falls back to empty string when body.sessionId is absent');
    it.todo('returns the { state, success, reason? } object from the service unchanged');
  });
});
