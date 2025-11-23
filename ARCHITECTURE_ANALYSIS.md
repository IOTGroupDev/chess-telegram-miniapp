# Архитектурный Анализ: Chess Telegram Mini App
## Профессиональное Шахматное Приложение

**Дата анализа:** 23 ноября 2025
**Цель:** Трансформация в профессиональное шахматное приложение уровня Chess.com/Lichess

---

## 📊 Текущее Состояние

### Сильные Стороны ✅

1. **Архитектура:**
   - Четкое разделение frontend (React + TypeScript) / backend (NestJS)
   - Monorepo структура с отдельными workspace
   - Type-safety на всех уровнях
   - WebSocket для реального времени

2. **Базовая Функциональность:**
   - ✅ Игра с AI (Stockfish WASM на frontend)
   - ✅ Онлайн мультиплеер через WebSocket
   - ✅ Валидация ходов (chess.js)
   - ✅ Определение шах/мат/пат
   - ✅ Интеграция с Telegram Mini Apps SDK
   - ✅ История ходов (UCI/SAN notation)
   - ✅ PGN генерация

3. **Технологический Стек:**
   - Modern React 19 + Vite
   - NestJS (enterprise-grade framework)
   - Prisma ORM (type-safe DB)
   - PostgreSQL + Redis
   - Socket.io для WebSocket

### Критические Проблемы ❌

1. **Backend Stockfish - Mock Реализация**
   - Сейчас возвращает случайные ходы вместо анализа
   - Нет интеграции с реальным движком
   - Отсутствует анализ позиций

2. **Технический Долг:**
   - Смешение TypeORM + Prisma (миграция не завершена)
   - Дублирование сервисов (legacy + NestJS modules)
   - Неиспользуемые зависимости (react-chessboard, TensorFlow)

3. **Отсутствующая Функциональность:**
   - ❌ Временной контроль (blitz, rapid, classical)
   - ❌ Рейтинговая система (Elo/Glicko-2)
   - ❌ Анализ партий
   - ❌ Дебютная подготовка
   - ❌ Тактические пазлы
   - ❌ Турниры
   - ❌ Обучающие материалы
   - ❌ Эндшпильные таблицы (Syzygy)

---

## 🎯 Анализ Конкурентов

### Chess.com (Лидер Рынка)

**Ключевые Фичи:**
- 100M+ пользователей
- Послематчевый анализ с Stockfish (графики преимущества, ошибки)
- Тысячи тактических пазлов с прогрессией
- Обучающие курсы от гроссмейстеров
- Турниры (bullet, blitz, rapid, classical)
- Вариации времени: 1+0, 3+2, 5+5, 10+0, 15+10, 30+0
- Leaderboards и рейтинги по категориям
- Стримы и видео-контент
- Fair Play система (античит)

**Бизнес-модель:**
- Freemium (базовые функции бесплатны)
- Premium подписка ($5-15/месяц)

### Lichess (Open-Source Чемпион)

**Ключевые Фичи:**
- 100% бесплатно, без рекламы
- Интеграция Stockfish для анализа ВСЕХ партий
- База данных: 6 миллиардов партий
- Opening Explorer (статистика дебютов)
- Puzzle Rush, Puzzle Storm
- Поддержка 80+ языков
- Broadcasts профессиональных турниров
- Study режим для совместного изучения
- Варианты шахмат (Chess960, Crazyhouse, Atomic и т.д.)

**Технологии:**
- Scala + Play Framework (backend)
- MongoDB (база данных)
- Redis (кеширование)
- Stockfish (анализ)

---

## 🚀 Архитектурные Рекомендации

### 1. Система Шахматных Движков (КРИТИЧНО)

#### Текущая проблема:
Backend использует мок-реализацию Stockfish. Это неприемлемо для профессионального уровня.

#### Решение: Multi-Engine Architecture

```
┌─────────────────────────────────────────────────────┐
│           Chess Engine Manager Service             │
├─────────────────────────────────────────────────────┤
│  - Load balancing между движками                   │
│  - Priority queue для анализа                      │
│  - Кеширование позиций (Redis)                     │
│  - Rate limiting                                    │
└─────────────────────────────────────────────────────┘
           │            │              │
           ▼            ▼              ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │Stockfish │  │  Leela   │  │  Komodo  │
    │  16/17   │  │Chess Zero│  │  Dragon  │
    │(default) │  │  (LC0)   │  │(premium) │
    └──────────┘  └──────────┘  └──────────┘
         │             │              │
         └─────────────┴──────────────┘
                      │
              ┌───────▼────────┐
              │  Redis Cache   │
              │ (Position DB)  │
              └────────────────┘
```

**Рекомендуемые Движки:**

1. **Stockfish 17** (PRIMARY ENGINE)
   - Рейтинг: Elo 3759
   - Использование: Default для всех пользователей
   - Режимы:
     - Quick analysis (depth 15-18, 1-3 сек)
     - Deep analysis (depth 25-30, 10-60 сек, premium)
   - Реализация: UCI protocol через child_process
   - Версии: Stockfish AVX2, Stockfish NNUE

2. **Leela Chess Zero (LC0)** (PREMIUM ENGINE)
   - Рейтинг: Elo 3700+
   - Использование: Premium подписчики
   - Особенности:
     - Нейронная сеть (более "человеческая" игра)
     - Долгосрочное планирование
     - Позиционное понимание
   - Требования: GPU для оптимальной работы (опционально)

3. **Komodo Dragon** (PERSONALITY ENGINE)
   - Рейтинг: Elo 3634
   - Использование: Обучение, настраиваемые противники
   - Особенности:
     - Personality modes (агрессивный, позиционный, и т.д.)
     - Можно имитировать стили известных игроков
     - Multi-PV (несколько вариантов)

**Архитектура Backend Engine Service:**

```typescript
// backend/src/engine/engine.module.ts
@Module({
  providers: [
    EngineManagerService,
    StockfishEngineService,
    LeelaEngineService,
    KomodoEngineService,
    EngineCacheService,
  ],
  exports: [EngineManagerService],
})
export class EngineModule {}

// Интерфейс для всех движков
interface ChessEngine {
  initialize(): Promise<void>;
  analyzePosition(fen: string, options: AnalysisOptions): Promise<AnalysisResult>;
  getBestMove(fen: string, timeLimit: number): Promise<MoveResult>;
  evaluatePosition(fen: string): Promise<Evaluation>;
  stopAnalysis(): void;
  quit(): void;
}

// Результат анализа
interface AnalysisResult {
  bestMove: string;           // UCI notation
  evaluation: number;          // centipawns
  depth: number;
  nodes: number;
  nps: number;                 // nodes per second
  pv: string[];               // principal variation
  multipv?: string[][];       // multiple variations
  mate?: number;              // moves to mate
}
```

**Реализация:**

```typescript
// Stockfish через UCI
class StockfishEngineService implements ChessEngine {
  private process: ChildProcess;
  private queue: PriorityQueue<AnalysisJob>;

  async initialize() {
    this.process = spawn('stockfish', [], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    await this.sendCommand('uci');
    await this.sendCommand('setoption name Hash value 2048');
    await this.sendCommand('setoption name Threads value 4');
  }

  async analyzePosition(fen: string, options: AnalysisOptions) {
    const cacheKey = `analysis:${fen}:${options.depth}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    await this.sendCommand(`position fen ${fen}`);
    await this.sendCommand(`go depth ${options.depth}`);

    const result = await this.waitForBestMove();
    await this.cache.set(cacheKey, result, 3600); // 1 hour TTL
    return result;
  }
}
```

**Docker Compose для движков:**

```yaml
services:
  stockfish:
    image: niklasf/stockfish:latest
    container_name: stockfish-engine
    command: stockfish
    volumes:
      - ./engine-data:/data
    networks:
      - chess-network
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 4G

  lc0:
    image: lczero/lc0:latest
    container_name: leela-engine
    volumes:
      - ./lc0-weights:/weights
    runtime: nvidia  # Для GPU
    environment:
      - CUDA_VISIBLE_DEVICES=0
    networks:
      - chess-network
```

---

### 2. Рейтинговая Система

**Рекомендация: Glicko-2 Rating System**

Почему Glicko-2, а не классический Elo:
- ✅ Учитывает неопределенность рейтинга (RD - Rating Deviation)
- ✅ Адаптируется к активности игрока
- ✅ Более точен для онлайн-игр
- ✅ Используется Lichess, Chess.com

**Prisma Schema:**

```prisma
model User {
  id            String   @id @default(uuid())
  telegramId    Int      @unique
  username      String

  // Glicko-2 Ratings (по временному контролю)
  bulletRating  Int      @default(1500)
  bulletRD      Float    @default(350.0)  // Rating Deviation
  bulletVol     Float    @default(0.06)   // Volatility

  blitzRating   Int      @default(1500)
  blitzRD       Float    @default(350.0)
  blitzVol      Float    @default(0.06)

  rapidRating   Int      @default(1500)
  rapidRD       Float    @default(350.0)
  rapidVol      Float    @default(0.06)

  classicalRating Int    @default(1500)
  classicalRD    Float   @default(350.0)
  classicalVol   Float   @default(0.06)

  // AI ratings (отдельно)
  aiRating      Int      @default(1500)
  aiRD          Float    @default(350.0)

  lastRatingUpdate DateTime @default(now())
  gamesPlayed   Int      @default(0)

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model Game {
  // ... existing fields
  timeControl   String   // "bullet", "blitz", "rapid", "classical"
  timeLimit     Int      // seconds
  timeIncrement Int      // seconds per move

  whiteRatingBefore Int
  whiteRatingAfter  Int?
  blackRatingBefore Int
  blackRatingAfter  Int?

  isRated       Boolean  @default(true)
}
```

**Реализация:**

```typescript
// backend/src/rating/glicko2.service.ts
export class Glicko2Service {
  private readonly TAU = 0.5; // System constant

  calculateNewRating(
    player: GlickoRating,
    opponents: GlickoRating[],
    results: number[] // 1 = win, 0.5 = draw, 0 = loss
  ): GlickoRating {
    // Glicko-2 algorithm implementation
    // See: http://www.glicko.net/glicko/glicko2.pdf

    const mu = (player.rating - 1500) / 173.7178;
    const phi = player.rd / 173.7178;
    const sigma = player.volatility;

    // ... calculations

    return {
      rating: newRating,
      rd: newRD,
      volatility: newSigma
    };
  }

  async updateRatingsAfterGame(game: Game) {
    const white = await this.userRepo.findById(game.whitePlayerId);
    const black = await this.userRepo.findById(game.blackPlayerId);

    const timeControl = this.getTimeControl(game.timeLimit);
    const result = this.getGameResult(game);

    // Calculate new ratings
    const whiteNew = this.calculateNewRating(
      { rating: white[`${timeControl}Rating`], ... },
      [{ rating: black[`${timeControl}Rating`], ... }],
      [result]
    );

    // Update database
    await this.userRepo.update(white.id, {
      [`${timeControl}Rating`]: whiteNew.rating,
      [`${timeControl}RD`]: whiteNew.rd,
      [`${timeControl}Vol`]: whiteNew.volatility,
    });
  }
}
```

---

### 3. Временной Контроль (Time Controls)

**Стандартные категории (как Chess.com/Lichess):**

```typescript
enum TimeControl {
  BULLET = 'bullet',      // < 3 minutes
  BLITZ = 'blitz',        // 3-10 minutes
  RAPID = 'rapid',        // 10-30 minutes
  CLASSICAL = 'classical' // > 30 minutes
}

interface TimeControlPreset {
  name: string;
  category: TimeControl;
  initial: number;    // seconds
  increment: number;  // seconds per move
  display: string;
}

const TIME_CONTROLS: TimeControlPreset[] = [
  // Bullet
  { name: 'Bullet 1+0', category: TimeControl.BULLET, initial: 60, increment: 0, display: '1 min' },
  { name: 'Bullet 1+1', category: TimeControl.BULLET, initial: 60, increment: 1, display: '1+1' },
  { name: 'Bullet 2+1', category: TimeControl.BULLET, initial: 120, increment: 1, display: '2+1' },

  // Blitz
  { name: 'Blitz 3+0', category: TimeControl.BLITZ, initial: 180, increment: 0, display: '3 min' },
  { name: 'Blitz 3+2', category: TimeControl.BLITZ, initial: 180, increment: 2, display: '3+2' },
  { name: 'Blitz 5+0', category: TimeControl.BLITZ, initial: 300, increment: 0, display: '5 min' },
  { name: 'Blitz 5+3', category: TimeControl.BLITZ, initial: 300, increment: 3, display: '5+3' },

  // Rapid
  { name: 'Rapid 10+0', category: TimeControl.RAPID, initial: 600, increment: 0, display: '10 min' },
  { name: 'Rapid 15+10', category: TimeControl.RAPID, initial: 900, increment: 10, display: '15+10' },

  // Classical
  { name: 'Classical 30+0', category: TimeControl.CLASSICAL, initial: 1800, increment: 0, display: '30 min' },
];
```

**Реализация таймера:**

```typescript
// backend/src/game/game-clock.service.ts
export class GameClockService {
  private clocks = new Map<string, GameClock>();

  startClock(gameId: string, playerColor: 'white' | 'black') {
    const clock = this.clocks.get(gameId);
    clock.activePlayer = playerColor;
    clock.lastMoveTime = Date.now();

    // Проверка времени каждую секунду
    clock.interval = setInterval(() => {
      this.checkTimeRemaining(gameId);
    }, 1000);
  }

  async makeMove(gameId: string, playerColor: 'white' | 'black') {
    const clock = this.clocks.get(gameId);
    const elapsed = Date.now() - clock.lastMoveTime;

    // Вычитаем время
    clock[`${playerColor}Time`] -= elapsed / 1000;

    // Добавляем инкремент
    clock[`${playerColor}Time`] += clock.increment;

    // Проверка на просрочку
    if (clock[`${playerColor}Time`] <= 0) {
      await this.handleTimeout(gameId, playerColor);
    }

    // Переключаем часы
    this.startClock(gameId, playerColor === 'white' ? 'black' : 'white');
  }

  async handleTimeout(gameId: string, player: 'white' | 'black') {
    const game = await this.gameService.findById(gameId);

    // Проверка на недостаточный материал
    if (this.hasInsufficientMaterial(game, player === 'white' ? 'black' : 'white')) {
      await this.gameService.finish(gameId, 'draw', 'timeout_vs_insufficient_material');
    } else {
      await this.gameService.finish(gameId, player === 'white' ? 'black' : 'white', 'timeout');
    }
  }
}
```

**WebSocket события для синхронизации:**

```typescript
// Клиент получает обновления времени каждую секунду
@SubscribeMessage('clock-tick')
handleClockTick(gameId: string) {
  const clock = this.clockService.getClock(gameId);
  this.server.to(gameId).emit('clock-update', {
    whiteTime: clock.whiteTime,
    blackTime: clock.blackTime,
    activePlayer: clock.activePlayer
  });
}
```

---

### 4. Анализ Партий (Game Analysis)

**Ключевая фича профессионального приложения**

```typescript
// backend/src/analysis/analysis.service.ts
export class GameAnalysisService {
  async analyzeGame(gameId: string, depth = 20): Promise<GameAnalysis> {
    const game = await this.gameRepo.findWithMoves(gameId);
    const moves = game.moves;

    const analysis: MoveAnalysis[] = [];
    let currentFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];

      // Анализ позиции ДО хода
      const engineResult = await this.engineManager.analyzePosition(
        currentFen,
        { depth, multipv: 3 } // Top 3 moves
      );

      // Определение качества хода
      const classification = this.classifyMove(
        move.uci,
        engineResult.bestMove,
        engineResult.evaluation,
        moves[i-1]?.evaluation
      );

      analysis.push({
        moveNumber: i + 1,
        move: move.san,
        evaluation: engineResult.evaluation,
        bestMove: engineResult.pv[0],
        classification,
        alternatives: engineResult.multipv,
      });

      currentFen = move.fen;
    }

    return {
      gameId,
      analysis,
      summary: this.generateSummary(analysis),
      accuracyWhite: this.calculateAccuracy(analysis, 'white'),
      accuracyBlack: this.calculateAccuracy(analysis, 'black'),
    };
  }

  classifyMove(
    playedMove: string,
    bestMove: string,
    currentEval: number,
    previousEval?: number
  ): MoveClassification {
    if (playedMove === bestMove) return 'best';

    const evalDrop = Math.abs(currentEval - (previousEval || 0));

    if (evalDrop < 25) return 'excellent';
    if (evalDrop < 50) return 'good';
    if (evalDrop < 100) return 'inaccuracy';
    if (evalDrop < 300) return 'mistake';
    return 'blunder';
  }

  generateSummary(analysis: MoveAnalysis[]): GameSummary {
    const white = analysis.filter((_, i) => i % 2 === 0);
    const black = analysis.filter((_, i) => i % 2 === 1);

    return {
      whiteBlunders: white.filter(m => m.classification === 'blunder').length,
      whiteMistakes: white.filter(m => m.classification === 'mistake').length,
      whiteInaccuracies: white.filter(m => m.classification === 'inaccuracy').length,

      blackBlunders: black.filter(m => m.classification === 'blunder').length,
      blackMistakes: black.filter(m => m.classification === 'mistake').length,
      blackInaccuracies: black.filter(m => m.classification === 'inaccuracy').length,

      openingPhase: this.detectOpening(analysis.slice(0, 10)),
      criticalMoment: this.findCriticalMoment(analysis),
    };
  }
}
```

**Frontend визуализация:**

```typescript
// Компонент графика преимущества (как на Chess.com)
const AdvantageChart: React.FC<{ analysis: GameAnalysis }> = ({ analysis }) => {
  return (
    <div className="advantage-chart">
      <svg width="100%" height="200">
        {analysis.analysis.map((move, i) => (
          <rect
            key={i}
            x={i * 10}
            y={100 - move.evaluation / 10}
            width={10}
            height={Math.abs(move.evaluation / 10)}
            fill={move.classification === 'blunder' ? 'red' :
                  move.classification === 'mistake' ? 'orange' :
                  move.classification === 'best' ? 'green' : 'gray'}
          />
        ))}
      </svg>
    </div>
  );
};
```

---

### 5. Дебютная База Данных (Opening Book)

**Архитектура:**

```
┌────────────────────────────────────────┐
│      Opening Database Service         │
├────────────────────────────────────────┤
│  - ECO classification (500+ openings) │
│  - Master game statistics             │
│  - Win/Draw/Loss percentages          │
│  - Popularity trends                  │
└────────────────────────────────────────┘
          │
          ▼
┌────────────────────────────────────────┐
│  PostgreSQL + Full-Text Search        │
│  - opening_positions table            │
│  - opening_variations table           │
│  - master_games table (PGN import)    │
└────────────────────────────────────────┘
```

**Prisma Schema:**

```prisma
model Opening {
  id          String   @id @default(uuid())
  eco         String   // "E00", "B01", etc.
  name        String   // "King's Indian Defense"
  variation   String?  // "Classical Variation"
  fen         String   @unique
  pgn         String   // Moves in PGN
  popularity  Int      @default(0)

  // Statistics from master games
  whiteWins   Int      @default(0)
  draws       Int      @default(0)
  blackWins   Int      @default(0)
  totalGames  Int      @default(0)

  @@index([eco])
  @@index([name])
}

model MasterGame {
  id          String   @id @default(uuid())
  white       String
  black       String
  whiteElo    Int?
  blackElo    Int?
  result      String   // "1-0", "0-1", "1/2-1/2"
  date        DateTime
  event       String
  eco         String
  opening     String
  pgn         Text     // Full game in PGN

  @@index([eco])
  @@index([whiteElo, blackElo])
}
```

**Opening Explorer API:**

```typescript
// GET /api/openings/explore?fen=<fen>
@Get('explore')
async exploreOpening(@Query('fen') fen: string) {
  const position = await this.openingRepo.findByFen(fen);

  if (position) {
    // Найдена известная позиция
    return {
      opening: position.name,
      eco: position.eco,
      statistics: {
        whiteWins: position.whiteWins,
        draws: position.draws,
        blackWins: position.blackWins,
        total: position.totalGames,
      },
      nextMoves: await this.getPopularMoves(fen),
    };
  }

  return { opening: 'Unknown', nextMoves: [] };
}

async getPopularMoves(fen: string) {
  // Поиск в базе мастерских партий
  const games = await this.masterGameRepo.findByPosition(fen);
  const moveCounts = new Map<string, number>();

  for (const game of games) {
    const move = this.getNextMove(game.pgn, fen);
    moveCounts.set(move, (moveCounts.get(move) || 0) + 1);
  }

  return Array.from(moveCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([move, count]) => ({
      move,
      games: count,
      percentage: (count / games.length) * 100
    }));
}
```

**Импорт базы данных:**

```bash
# Скачать и импортировать PGN базу Lichess (6 billion games)
# https://database.lichess.org/

# Script для импорта
node scripts/import-pgn.js --file lichess_db_standard_rated_2025-01.pgn.zst
```

---

### 6. Тактические Пазлы (Tactical Puzzles)

**Источники пазлов:**

1. **Lichess Puzzle Database** (3+ million puzzles, open-source)
2. **Генерация из партий** (детектирование тактических мотивов)

```prisma
model Puzzle {
  id          String   @id @default(uuid())
  fen         String
  moves       String   // UCI moves (solution)
  rating      Int      // Puzzle difficulty (1000-3000)
  popularity  Int
  themes      String[] // ["pin", "fork", "skewer", "mate_in_2"]

  // Для адаптивного обучения
  attempts    Int      @default(0)
  solved      Int      @default(0)

  @@index([rating])
  @@index([themes])
}

model UserPuzzleAttempt {
  id          String   @id @default(uuid())
  userId      String
  puzzleId    String
  solved      Boolean
  timeSpent   Int      // seconds
  attempts    Int
  createdAt   DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id])
  puzzle      Puzzle   @relation(fields: [puzzleId], references: [id])

  @@index([userId, createdAt])
}
```

**Адаптивный алгоритм подбора:**

```typescript
export class PuzzleService {
  async getNextPuzzle(userId: string): Promise<Puzzle> {
    const user = await this.userRepo.findById(userId);
    const userPuzzleRating = user.puzzleRating || user.blitzRating;

    // Подбор пазла в диапазоне ±200 от рейтинга
    const puzzle = await this.puzzleRepo.findRandom({
      rating: {
        gte: userPuzzleRating - 200,
        lte: userPuzzleRating + 200,
      },
      // Исключаем недавно решенные
      id: {
        notIn: await this.getRecentlySolved(userId, 100)
      }
    });

    return puzzle;
  }

  async submitSolution(userId: string, puzzleId: string, moves: string[]) {
    const puzzle = await this.puzzleRepo.findById(puzzleId);
    const correct = this.checkSolution(moves, puzzle.moves);

    // Обновляем рейтинг пазлов (Glicko-2)
    if (correct) {
      await this.updatePuzzleRating(userId, puzzle.rating, 1);
    } else {
      await this.updatePuzzleRating(userId, puzzle.rating, 0);
    }

    await this.attemptRepo.create({
      userId,
      puzzleId,
      solved: correct,
      timeSpent: /* ... */,
    });

    return { correct, solution: puzzle.moves };
  }
}
```

**Тематическая тренировка:**

```typescript
// Пользователь выбирает тему
const PUZZLE_THEMES = [
  'fork',
  'pin',
  'skewer',
  'discovered_attack',
  'double_check',
  'mate_in_1',
  'mate_in_2',
  'mate_in_3',
  'endgame',
  'opening',
  'middlegame',
  'sacrifice',
  'zugzwang',
];

// GET /api/puzzles/theme/fork
@Get('theme/:theme')
async getPuzzlesByTheme(@Param('theme') theme: string) {
  return this.puzzleRepo.findByTheme(theme, { limit: 20 });
}
```

---

### 7. Турниры (Tournament System)

```prisma
enum TournamentType {
  ARENA       // Непрерывный, набор очков
  SWISS       // Швейцарская система
  KNOCKOUT    // На вылет
}

model Tournament {
  id            String          @id @default(uuid())
  name          String
  type          TournamentType
  timeControl   String
  timeLimit     Int
  timeIncrement Int

  startTime     DateTime
  duration      Int             // minutes

  minRating     Int?
  maxRating     Int?
  maxPlayers    Int

  status        String          // "upcoming", "active", "finished"

  participants  TournamentParticipant[]
  games         Game[]

  createdBy     String
  createdAt     DateTime        @default(now())
}

model TournamentParticipant {
  id            String      @id @default(uuid())
  tournamentId  String
  userId        String
  score         Int         @default(0)
  gamesPlayed   Int         @default(0)
  wins          Int         @default(0)
  draws         Int         @default(0)
  losses        Int         @default(0)

  tournament    Tournament  @relation(fields: [tournamentId], references: [id])
  user          User        @relation(fields: [userId], references: [id])

  @@unique([tournamentId, userId])
}
```

**Arena Tournament (как Lichess):**

```typescript
export class ArenaTournamentService {
  async runTournament(tournamentId: string) {
    const tournament = await this.repo.findById(tournamentId);
    const endTime = new Date(tournament.startTime.getTime() + tournament.duration * 60000);

    // Непрерывное создание паирингов
    while (Date.now() < endTime.getTime()) {
      const waitingPlayers = await this.getWaitingPlayers(tournamentId);

      if (waitingPlayers.length >= 2) {
        // Паирование по рейтингу (близкие соперники)
        const pairs = this.pairPlayers(waitingPlayers);

        for (const [white, black] of pairs) {
          await this.gameService.create({
            whitePlayerId: white.userId,
            blackPlayerId: black.userId,
            tournamentId,
            timeControl: tournament.timeControl,
          });
        }
      }

      await this.sleep(5000); // Проверка каждые 5 секунд
    }

    await this.finishTournament(tournamentId);
  }

  async updateScore(gameId: string) {
    const game = await this.gameService.findById(gameId);
    const points = {
      win: 2,
      draw: 1,
      loss: 0,
    };

    const whitePoints = game.winner === 'white' ? points.win :
                        game.winner === 'draw' ? points.draw : points.loss;

    await this.participantRepo.increment(
      game.whitePlayerId,
      { score: whitePoints, gamesPlayed: 1 }
    );
  }
}
```

---

### 8. Обучающие Материалы (Learning Resources)

```prisma
model Lesson {
  id          String   @id @default(uuid())
  title       String
  description Text
  category    String   // "opening", "middlegame", "endgame", "tactics"
  difficulty  String   // "beginner", "intermediate", "advanced"
  content     Text     // Markdown/HTML

  // Интерактивные позиции
  positions   LessonPosition[]

  isPremium   Boolean  @default(false)
  views       Int      @default(0)

  createdAt   DateTime @default(now())
}

model LessonPosition {
  id          String   @id @default(uuid())
  lessonId    String
  fen         String
  instruction Text
  solution    String   // UCI moves
  order       Int

  lesson      Lesson   @relation(fields: [lessonId], references: [id])
}
```

**Интерактивные уроки:**

```typescript
// Пользователь играет "правильные" ходы
export class InteractiveLessonService {
  async checkMove(lessonId: string, positionId: string, move: string) {
    const position = await this.positionRepo.findById(positionId);
    const correctMoves = position.solution.split(' ');

    if (correctMoves.includes(move)) {
      return {
        correct: true,
        feedback: position.feedback,
        nextPosition: await this.getNextPosition(lessonId, position.order + 1)
      };
    } else {
      const hint = await this.engineService.analyzeMove(position.fen, move);
      return {
        correct: false,
        feedback: `This move allows ${hint.refutation}`,
        hint: correctMoves[0]
      };
    }
  }
}
```

---

### 9. Эндшпильные Таблицы (Syzygy Tablebases)

**Syzygy Tablebases** - предвычисленные позиции для 7 фигур и менее.

```typescript
// backend/src/tablebase/tablebase.service.ts
import { execFile } from 'child_process';

export class TablebaseService {
  private syzygyPath = '/usr/share/syzygy'; // 6-man tablebases

  async probe(fen: string): Promise<TablebaseResult | null> {
    const pieceCount = this.countPieces(fen);

    if (pieceCount > 7) {
      return null; // Слишком много фигур
    }

    // Используем lichess API (онлайн) или локальные базы
    const result = await this.queryLichessTablebase(fen);

    return {
      dtm: result.dtm,        // Distance to mate
      dtz: result.dtz,        // Distance to zeroing move
      category: result.category, // "win", "loss", "draw"
      bestMove: result.moves[0].uci
    };
  }

  async queryLichessTablebase(fen: string) {
    // Lichess предоставляет бесплатный API для 7-man tablebases
    const response = await fetch(
      `https://tablebase.lichess.ovh/standard?fen=${encodeURIComponent(fen)}`
    );
    return response.json();
  }
}
```

**Интеграция в анализ:**

```typescript
// Автоматическое определение
if (pieceCount <= 7) {
  const tbResult = await this.tablebaseService.probe(fen);
  if (tbResult) {
    return {
      type: 'tablebase',
      evaluation: tbResult.category === 'win' ? 10000 :
                  tbResult.category === 'loss' ? -10000 : 0,
      dtm: tbResult.dtm,
      bestMove: tbResult.bestMove
    };
  }
}
```

---

## 🗂️ Рекомендуемая Архитектура Backend

```
backend/
├── src/
│   ├── modules/
│   │   ├── auth/                    # Аутентификация (Telegram)
│   │   ├── user/                    # Профили, статистика
│   │   ├── game/                    # Игровая логика
│   │   │   ├── game.service.ts
│   │   │   ├── game.controller.ts
│   │   │   ├── game-clock.service.ts
│   │   │   └── dto/
│   │   ├── engine/                  # Шахматные движки
│   │   │   ├── engine-manager.service.ts
│   │   │   ├── stockfish.service.ts
│   │   │   ├── leela.service.ts
│   │   │   ├── komodo.service.ts
│   │   │   └── engine-cache.service.ts
│   │   ├── analysis/                # Анализ партий
│   │   │   ├── game-analysis.service.ts
│   │   │   ├── opening-analysis.service.ts
│   │   │   └── evaluation.service.ts
│   │   ├── rating/                  # Рейтинговая система
│   │   │   ├── glicko2.service.ts
│   │   │   └── rating.controller.ts
│   │   ├── opening/                 # Дебюты
│   │   │   ├── opening.service.ts
│   │   │   ├── opening-explorer.service.ts
│   │   │   └── pgn-import.service.ts
│   │   ├── puzzle/                  # Пазлы
│   │   │   ├── puzzle.service.ts
│   │   │   ├── puzzle-generator.service.ts
│   │   │   └── adaptive-learning.service.ts
│   │   ├── tournament/              # Турниры
│   │   │   ├── tournament.service.ts
│   │   │   ├── arena.service.ts
│   │   │   ├── swiss.service.ts
│   │   │   └── pairing.service.ts
│   │   ├── lesson/                  # Обучение
│   │   │   ├── lesson.service.ts
│   │   │   └── interactive-lesson.service.ts
│   │   ├── tablebase/               # Эндшпильные базы
│   │   │   └── tablebase.service.ts
│   │   └── websocket/               # Real-time
│   │       ├── game.gateway.ts
│   │       ├── tournament.gateway.ts
│   │       └── chat.gateway.ts
│   ├── common/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   ├── filters/
│   │   └── decorators/
│   ├── config/
│   └── prisma/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── test/
```

---

## 📱 Рекомендуемая Архитектура Frontend

```
frontend/
├── src/
│   ├── features/                    # Feature-based structure
│   │   ├── game/
│   │   │   ├── components/
│   │   │   │   ├── ChessBoard.tsx
│   │   │   │   ├── MoveList.tsx
│   │   │   │   ├── GameClock.tsx
│   │   │   │   └── EvaluationBar.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useChess.ts
│   │   │   │   ├── useGameClock.ts
│   │   │   │   └── useOnlineGame.ts
│   │   │   ├── pages/
│   │   │   │   ├── GamePage.tsx
│   │   │   │   └── SpectatorPage.tsx
│   │   │   └── store/
│   │   │       └── gameSlice.ts
│   │   ├── analysis/
│   │   │   ├── components/
│   │   │   │   ├── AnalysisBoard.tsx
│   │   │   │   ├── AdvantageChart.tsx
│   │   │   │   ├── MoveClassification.tsx
│   │   │   │   └── OpeningExplorer.tsx
│   │   │   └── pages/
│   │   │       └── AnalysisPage.tsx
│   │   ├── puzzles/
│   │   │   ├── components/
│   │   │   │   ├── PuzzleBoard.tsx
│   │   │   │   ├── PuzzleHint.tsx
│   │   │   │   └── PuzzleRating.tsx
│   │   │   └── pages/
│   │   │       ├── PuzzlePage.tsx
│   │   │       ├── PuzzleRush.tsx
│   │   │       └── ThemePuzzles.tsx
│   │   ├── tournament/
│   │   │   ├── components/
│   │   │   │   ├── TournamentCard.tsx
│   │   │   │   ├── Leaderboard.tsx
│   │   │   │   └── TournamentBracket.tsx
│   │   │   └── pages/
│   │   │       ├── TournamentList.tsx
│   │   │       └── TournamentPage.tsx
│   │   ├── learn/
│   │   │   ├── components/
│   │   │   │   ├── LessonCard.tsx
│   │   │   │   └── InteractivePosition.tsx
│   │   │   └── pages/
│   │   │       ├── LessonPage.tsx
│   │   │       └── CoursePage.tsx
│   │   └── profile/
│   │       ├── components/
│   │       │   ├── RatingChart.tsx
│   │       │   ├── GameHistory.tsx
│   │       │   └── Statistics.tsx
│   │       └── pages/
│   │           └── ProfilePage.tsx
│   ├── shared/
│   │   ├── components/           # UI Kit
│   │   │   ├── Button.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Tabs.tsx
│   │   │   └── Spinner.tsx
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts
│   │   │   ├── useTelegram.ts
│   │   │   └── useAuth.ts
│   │   └── utils/
│   │       ├── chess.ts
│   │       ├── notation.ts
│   │       └── evaluation.ts
│   ├── services/
│   │   ├── api.ts
│   │   ├── websocket.ts
│   │   └── stockfish.ts
│   ├── store/
│   │   ├── index.ts
│   │   └── slices/
│   └── types/
└── public/
    └── engines/
        ├── stockfish.wasm
        └── stockfish.js
```

---

## 🚀 Приоритетный План Реализации

### Фаза 1: Критические Основы (2-3 недели)

1. **Реальный Stockfish Backend** ✅ КРИТИЧНО
   - Интеграция через UCI protocol
   - Docker контейнер
   - Queue система для запросов
   - Redis кеширование

2. **Временной Контроль** ✅ КРИТИЧНО
   - Игровые часы с инкрементом
   - WebSocket синхронизация
   - Обработка timeout

3. **Рейтинговая Система** ✅ КРИТИЧНО
   - Glicko-2 implementation
   - Разделение по time controls
   - Автоматический пересчет после партии

4. **Завершение Миграции TypeORM → Prisma**
   - Удалить legacy код
   - Единая ORM

### Фаза 2: Профессиональные Фичи (3-4 недели)

5. **Анализ Партий**
   - Полный анализ с классификацией ходов
   - График преимущества
   - Определение критических моментов
   - Альтернативные варианты

6. **Дебютная База**
   - Импорт ECO классификации
   - Opening Explorer
   - Статистика из мастерских партий
   - Популярные продолжения

7. **Тактические Пазлы**
   - Импорт Lichess puzzle database
   - Адаптивный подбор по рейтингу
   - Тематическая тренировка
   - Puzzle Rush режим

### Фаза 3: Продвинутые Функции (4-6 недель)

8. **Турнирная Система**
   - Arena tournaments
   - Swiss system
   - Автоматический паиринг
   - Real-time leaderboards

9. **Обучающие Материалы**
   - Интерактивные уроки
   - Видео-контент (опционально)
   - Прогресс трекинг

10. **Дополнительные Движки**
    - Leela Chess Zero (premium)
    - Komodo Dragon (personalities)
    - Multi-engine analysis

11. **Эндшпильные Таблицы**
    - Syzygy integration
    - Автоопределение в анализе

### Фаза 4: Монетизация и Масштабирование (ongoing)

12. **Premium Подписка**
    - Глубокий анализ (depth 30+)
    - Leela Chess Zero
    - Неограниченные пазлы
    - Без рекламы

13. **Performance Optimization**
    - CDN для статических ресурсов
    - Database indexing
    - WebSocket scaling (Redis adapter)
    - Caching strategy

14. **Analytics & Monitoring**
    - User behavior tracking
    - Performance metrics
    - Error tracking (Sentry)
    - A/B testing

---

## 💰 Бизнес-Модель

### Free Tier (Базовый)
- ✅ Неограниченные игры (все time controls)
- ✅ Базовый анализ (Stockfish depth 15)
- ✅ 10 пазлов в день
- ✅ Участие в турнирах
- ⚠️ Реклама (ненавязчивая)

### Premium ($4.99/месяц или $49.99/год)
- ✅ Глубокий анализ (depth 30+)
- ✅ Leela Chess Zero доступ
- ✅ Неограниченные пазлы
- ✅ Приоритет в турнирах
- ✅ Расширенная статистика
- ✅ Без рекламы
- ✅ Ранний доступ к новым функциям

### Pro ($9.99/месяц)
- ✅ Все из Premium
- ✅ Multi-engine analysis (сравнение движков)
- ✅ Cloud engine (мощные серверные расчеты)
- ✅ Персональные тренировки
- ✅ Приоритетная поддержка

---

## 📊 Метрики Успеха

### Технические KPI:
- Engine analysis latency < 2s (depth 20)
- WebSocket latency < 100ms
- 99.9% uptime
- Database query time < 50ms
- Page load time < 1s

### Бизнес KPI:
- DAU (Daily Active Users)
- Retention (1-day, 7-day, 30-day)
- Games per user per day
- Premium conversion rate (target: 5-10%)
- Churn rate

---

## 🔐 Безопасность

1. **Anti-Cheat System**
   - Детектирование использования внешних движков
   - Анализ времени на ход
   - Статистическая аномалия (accuracy > 95% подозрительна)
   - Blur/focus события (переключение окна)

2. **Rate Limiting**
   - API requests: 100 req/min
   - Analysis requests: 10 req/min (free), unlimited (premium)
   - Puzzle solving: 1 puzzle/10s

3. **Authentication**
   - Telegram auth (secure)
   - JWT tokens
   - Session management

---

## 📚 Источники и Библиотеки

### Рекомендуемые npm пакеты:

```json
{
  "backend": {
    "stockfish": "^16.0.0",
    "lc0": "^0.30.0",
    "@capacitor/filesystem": "^5.0.0",
    "pgn-parser": "^2.0.0",
    "chess.js": "^1.0.0",
    "@nestjs/bull": "^10.0.0",
    "bull": "^4.0.0",
    "ioredis": "^5.0.0"
  },
  "frontend": {
    "stockfish.wasm": "^0.11.0",
    "chessground": "^9.0.0",
    "react-chessboard": "^5.0.0",
    "recharts": "^2.0.0",
    "@tanstack/react-query": "^5.0.0"
  }
}
```

### Внешние ресурсы:

- **Lichess Puzzle DB**: https://database.lichess.org/#puzzles
- **Master Games**: https://database.lichess.org/
- **ECO Codes**: https://github.com/niklasf/eco
- **Syzygy Tablebases**: https://tablebase.lichess.ovh/
- **Stockfish**: https://stockfishchess.org/
- **Leela**: https://lczero.org/

---

## ✅ Итоговые Рекомендации

1. **Немедленно:** Исправить backend Stockfish (mock → real)
2. **Приоритет 1:** Временной контроль + рейтинги
3. **Приоритет 2:** Анализ партий + дебюты
4. **Приоритет 3:** Пазлы + турниры
5. **Долгосрочно:** Leela Chess Zero, обучающие материалы, монетизация

**Дифференциация от конкурентов:**
- ✨ Telegram-native experience (haptic, payments, inline)
- ✨ Уникальный AI тренер (персонализированные рекомендации)
- ✨ Социальные фичи (Telegram группы, каналы интеграция)
- ✨ Локализация для русскоязычной аудитории

---

## Источники

- [Best Chess Apps 2025](https://chesswatch.com/news/best-chess-training-services-and-tools-2025)
- [Chess.com vs Lichess Comparison](https://www.chess.com/blog/modipaduollemmers/which-of-the-apps-is-better-chess-com-or-lichess)
- [Top Chess Engines 2025](https://chessforsharks.co/top-chess-engines-in-2025/)
- [Stockfish vs Leela vs Komodo](https://www.attackingchess.com/top-10-strongest-chess-engines-in-2025/)
