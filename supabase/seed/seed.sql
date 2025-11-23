-- =====================================================
-- Seed Data for Testing
-- Chess Telegram Mini App
-- =====================================================

-- =====================================================
-- SEED USERS
-- =====================================================

INSERT INTO users (id, telegram_id, username, first_name, blitz_rating, bullet_rating, rapid_rating, games_played, games_won)
VALUES
  ('00000000-0000-0000-0000-000000000001', 123456789, 'magnus_bot', 'Magnus', 2800, 2750, 2850, 1000, 750),
  ('00000000-0000-0000-0000-000000000002', 987654321, 'hikaru_bot', 'Hikaru', 2750, 2800, 2700, 950, 700),
  ('00000000-0000-0000-0000-000000000003', 555555555, 'test_player', 'Test Player', 1500, 1500, 1500, 0, 0),
  ('00000000-0000-0000-0000-000000000004', 111111111, 'beginner', 'Beginner', 1200, 1150, 1250, 50, 10),
  ('00000000-0000-0000-0000-000000000005', 222222222, 'intermediate', 'Intermediate', 1800, 1750, 1850, 200, 100);

-- =====================================================
-- SEED OPENINGS
-- =====================================================

INSERT INTO openings (eco, name, variation, fen, pgn, white_wins, draws, black_wins, total_games, popularity)
VALUES
  -- Italian Game
  ('C50', 'Italian Game', NULL, 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
   '1. e4 e5 2. Nf3 Nc6 3. Bc4', 45000, 25000, 30000, 100000, 95),

  -- Sicilian Defense
  ('B20', 'Sicilian Defense', NULL, 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2',
   '1. e4 c5', 38000, 22000, 40000, 100000, 100),

  -- French Defense
  ('C00', 'French Defense', NULL, 'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
   '1. e4 e6', 42000, 28000, 30000, 100000, 85),

  -- Queen''s Gambit
  ('D06', 'Queen''s Gambit', 'Accepted', 'rnbqkbnr/ppp1pppp/8/8/2pP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3',
   '1. d4 d5 2. c4 dxc4', 48000, 27000, 25000, 100000, 90),

  -- King''s Indian Defense
  ('E60', 'King''s Indian Defense', NULL, 'rnbqkb1r/pppppp1p/5np1/8/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3',
   '1. d4 Nf6 2. c4 g6', 40000, 30000, 30000, 100000, 80),

  -- Ruy Lopez
  ('C60', 'Ruy Lopez', 'Spanish Opening', 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
   '1. e4 e5 2. Nf3 Nc6 3. Bb5', 43000, 29000, 28000, 100000, 92),

  -- Caro-Kann
  ('B10', 'Caro-Kann Defense', NULL, 'rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
   '1. e4 c6', 41000, 32000, 27000, 100000, 82);

-- =====================================================
-- SEED PUZZLES
-- =====================================================

INSERT INTO puzzles (fen, moves, rating, themes, popularity)
VALUES
  -- Mate in 1
  ('r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4',
   'e8f7', 1000, ARRAY['mate_in_1', 'back_rank'], 100),

  -- Fork
  ('rnbqkb1r/ppp2ppp/4pn2/3p4/2PP4/2N2N2/PP2PPPP/R1BQKB1R b KQkq - 0 4',
   'd5c4 d1a4 c6d7 a4c4', 1200, ARRAY['fork', 'knight'], 95),

  -- Pin
  ('r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
   'c4f7', 1300, ARRAY['pin', 'bishop'], 90),

  -- Discovered attack
  ('r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 5',
   'c4f7 e8f7 f3e5', 1500, ARRAY['discovered_attack', 'knight'], 85),

  -- Skewer
  ('r1bq1rk1/ppp2ppp/2n5/3np3/1b1P4/2NB1N2/PPP1QPPP/R1B2RK1 w - - 0 9',
   'd3h7 g8h7 d1d5', 1600, ARRAY['skewer', 'queen'], 80),

  -- Mate in 2
  ('r1bqkb1r/pppp1Bpp/2n2n2/4p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 4',
   'e8f7 d1d5 f7e7 d5f7', 1400, ARRAY['mate_in_2', 'queen'], 88);

-- =====================================================
-- SEED SAMPLE GAMES
-- =====================================================

-- Game 1: Finished game
INSERT INTO games (
  id, white_player_id, black_player_id, status, winner, end_reason,
  fen, pgn, move_number, time_control, time_limit, time_increment,
  white_rating_before, black_rating_before, is_rated, started_at, finished_at
)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'finished',
  'white',
  'checkmate',
  '1r4k1/5ppp/8/8/8/8/5PPP/4R1K1 b - - 10 30',
  '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7',
  30,
  'blitz',
  300,
  2,
  2800,
  2750,
  true,
  NOW() - INTERVAL '1 hour',
  NOW() - INTERVAL '30 minutes'
);

-- Moves for game 1
INSERT INTO moves (game_id, user_id, move_number, uci, san, fen, time_spent, clock_time)
VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 1, 'e2e4', 'e4',
   'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', 2000, 298000),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 2, 'e7e5', 'e5',
   'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2', 1500, 300500);

-- Game 2: Active game
INSERT INTO games (
  id, white_player_id, black_player_id, status,
  fen, move_number, time_control, time_limit, time_increment,
  white_rating_before, black_rating_before, is_rated,
  white_time_remaining, black_time_remaining, started_at, last_move_at
)
VALUES (
  '10000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004',
  'active',
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
  2,
  'rapid',
  600,
  5,
  1500,
  1200,
  true,
  595000,
  600000,
  NOW() - INTERVAL '2 minutes',
  NOW() - INTERVAL '10 seconds'
);

-- Game 3: Waiting for opponent
INSERT INTO games (
  id, white_player_id, status, time_control, time_limit, time_increment,
  invite_code, is_public
)
VALUES (
  '10000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000005',
  'waiting',
  'bullet',
  60,
  1,
  'INVITE123',
  true
);

-- =====================================================
-- SEED TOURNAMENT
-- =====================================================

INSERT INTO tournaments (
  id, name, description, type, time_control, time_limit, time_increment,
  start_time, duration, max_players, status, created_by
)
VALUES (
  '20000000-0000-0000-0000-000000000001',
  'Weekly Blitz Arena',
  'Weekly tournament for blitz enthusiasts',
  'arena',
  'blitz',
  180,
  2,
  NOW() + INTERVAL '1 day',
  60,
  100,
  'upcoming',
  '00000000-0000-0000-0000-000000000001'
);

-- Tournament participants
INSERT INTO tournament_participants (tournament_id, user_id, score, games_played, wins, draws, losses)
VALUES
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 0, 0, 0, 0, 0),
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 0, 0, 0, 0, 0),
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 0, 0, 0, 0, 0);

-- =====================================================
-- SEED ANALYSIS
-- =====================================================

INSERT INTO game_analysis (
  game_id, engine, depth, white_accuracy, black_accuracy,
  white_blunders, white_mistakes, white_inaccuracies,
  black_blunders, black_mistakes, black_inaccuracies,
  opening_eco, opening_name,
  analysis
)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  'stockfish',
  20,
  94.5,
  88.2,
  0, 1, 2,
  1, 2, 3,
  'C60',
  'Ruy Lopez',
  '[
    {
      "moveNumber": 1,
      "move": "e4",
      "evaluation": 35,
      "classification": "best",
      "bestMove": "e4"
    },
    {
      "moveNumber": 2,
      "move": "e5",
      "evaluation": -30,
      "classification": "best",
      "bestMove": "e5"
    }
  ]'::jsonb
);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE users IS 'Seed data includes test users with various skill levels';
COMMENT ON TABLE games IS 'Seed data includes finished, active, and waiting games';
COMMENT ON TABLE puzzles IS 'Seed data includes puzzles of varying difficulty';
COMMENT ON TABLE openings IS 'Seed data includes popular chess openings with statistics';
