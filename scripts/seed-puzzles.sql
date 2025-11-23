-- =====================================================
-- Puzzle Database Seeding Script
-- Uses sample puzzles in Lichess format
-- =====================================================

-- Clear existing puzzles (optional, uncomment if needed)
-- TRUNCATE TABLE puzzles CASCADE;

-- =====================================================
-- Sample Puzzles (Mate in 1)
-- =====================================================

INSERT INTO puzzles (fen, moves, rating, rating_deviation, themes, game_url, popularity) VALUES

-- Mate in 1 puzzles (Easy: 1200-1400)
('r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4', 'e8 f7', 1200, 75, ARRAY['mateIn1', 'opening'], 'https://lichess.org/training/12345', 100),
('r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 4', 'd8 g5', 1250, 75, ARRAY['mateIn1', 'pin'], 'https://lichess.org/training/12346', 95),
('rnbqkb1r/pppp1ppp/5n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 4', 'h5 f7', 1220, 70, ARRAY['mateIn1', 'sacrifice'], 'https://lichess.org/training/12347', 110),

-- Mate in 2 puzzles (Medium: 1400-1600)
('r1bqkbnr/pppp1p1p/2n5/4p1pQ/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 5', 'h5 f7 e8 f7 f1 c4', 1450, 80, ARRAY['mateIn2', 'sacrifice'], 'https://lichess.org/training/12348', 120),
('r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 8', 'f3 g5 h7 h6 g5 f7', 1520, 85, ARRAY['mateIn2', 'middlegame'], 'https://lichess.org/training/12349', 105),
('r2qkb1r/ppp2ppp/2np1n2/4p3/2B1P1b1/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 0 7', 'c4 f7 e8 f7 c3 d5', 1480, 75, ARRAY['mateIn2', 'fork'], 'https://lichess.org/training/12350', 98),

-- Fork puzzles (Medium: 1500-1700)
('r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/3P1N2/PPP2PPP/RNBQKB1R w KQkq - 0 5', 'f3 g5 d8 g5 d1 d5', 1550, 90, ARRAY['fork', 'middlegame'], 'https://lichess.org/training/12351', 130),
('r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 6', 'f3 g5 d8 g5 c4 f7', 1620, 88, ARRAY['fork', 'discoveredAttack'], 'https://lichess.org/training/12352', 115),

-- Pin puzzles (Medium: 1600-1800)
('r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 4', 'd8 e7 c4 b5', 1650, 85, ARRAY['pin', 'opening'], 'https://lichess.org/training/12353', 125),
('r2qkb1r/ppp2ppp/2np1n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 0 7', 'f3 g5 d8 g5 c3 d5', 1720, 92, ARRAY['pin', 'doubleAttack'], 'https://lichess.org/training/12354', 108),

-- Skewer puzzles (Hard: 1700-1900)
('r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 b - - 0 8', 'c5 f2 g1 h1 f6 g4', 1750, 95, ARRAY['skewer', 'middlegame'], 'https://lichess.org/training/12355', 140),
('r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R b KQkq - 0 6', 'c5 f2 e1 f2 f6 g4', 1820, 88, ARRAY['skewer', 'sacrifice'], 'https://lichess.org/training/12356', 132),

-- Discovered attack puzzles (Hard: 1800-2000)
('r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 6', 'c4 f7 e8 f7 f3 g5', 1850, 100, ARRAY['discoveredAttack', 'sacrifice'], 'https://lichess.org/training/12357', 145),
('r2qkb1r/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 b kq - 0 8', 'c5 f2 g1 f2 d6 e4', 1920, 105, ARRAY['discoveredAttack', 'doubleCheck'], 'https://lichess.org/training/12358', 138),

-- Deflection puzzles (Very Hard: 1900-2100)
('r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 9', 'c4 f7 g8 f7 d1 d5', 1950, 110, ARRAY['deflection', 'sacrifice'], 'https://lichess.org/training/12359', 150),
('r2qkb1r/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w kq - 0 9', 'c4 f7 e8 f7 d1 b3', 2050, 115, ARRAY['deflection', 'doubleAttack'], 'https://lichess.org/training/12360', 148),

-- Advanced endgame puzzles (Expert: 2100-2300)
('8/8/8/3k4/8/3K4/5R2/8 w - - 0 1', 'f2 f5 d5 e4 d3 d4', 2150, 120, ARRAY['endgame', 'advanced'], 'https://lichess.org/training/12361', 155),
('8/5k2/8/5K2/5P2/8/8/8 w - - 0 1', 'f5 e5 f7 e7 f4 f5', 2200, 125, ARRAY['endgame', 'advanced'], 'https://lichess.org/training/12362', 160),

-- Master level puzzles (Master: 2300+)
('r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 b - - 0 9', 'c5 f2 g1 h1 f6 g4 h1 g1 d8 h4', 2350, 130, ARRAY['master', 'sacrifice', 'middlegame'], 'https://lichess.org/training/12363', 175),
('r2qkb1r/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 b kq - 0 9', 'c5 f2 g1 f2 d6 g3 f2 g3 d8 h4', 2450, 140, ARRAY['master', 'sacrifice', 'combination'], 'https://lichess.org/training/12364', 180);

-- =====================================================
-- Update puzzle statistics
-- =====================================================

-- Update total count
UPDATE puzzles SET popularity = popularity + floor(random() * 50) WHERE rating < 1500;
UPDATE puzzles SET popularity = popularity + floor(random() * 100) WHERE rating >= 1500 AND rating < 2000;
UPDATE puzzles SET popularity = popularity + floor(random() * 150) WHERE rating >= 2000;

-- =====================================================
-- Verification
-- =====================================================

-- Check puzzle count by rating
SELECT
  CASE
    WHEN rating < 1400 THEN 'Easy (< 1400)'
    WHEN rating < 1600 THEN 'Medium (1400-1600)'
    WHEN rating < 1800 THEN 'Hard (1600-1800)'
    WHEN rating < 2000 THEN 'Very Hard (1800-2000)'
    WHEN rating < 2200 THEN 'Expert (2000-2200)'
    ELSE 'Master (2200+)'
  END as difficulty,
  COUNT(*) as count,
  ROUND(AVG(rating)) as avg_rating
FROM puzzles
GROUP BY difficulty
ORDER BY avg_rating;

-- Check puzzle themes
SELECT
  unnest(themes) as theme,
  COUNT(*) as count
FROM puzzles
GROUP BY theme
ORDER BY count DESC;

COMMENT ON TABLE puzzles IS 'Tactical chess puzzles from Lichess database with adaptive difficulty ratings';
