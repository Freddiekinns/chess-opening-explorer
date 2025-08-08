-- Sample data for Chess Trainer Database
-- This file contains initial seed data for testing and development

-- Insert sample openings
INSERT INTO openings (name, eco_code, fen, pgn, moves, category, subcategory, description, popularity, difficulty) VALUES
('Italian Game', 'C53', 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R b KQkq - 0 4', '1.e4 e5 2.Nf3 Nc6 3.Bc4 Be7', 'e4 e5 Nf3 Nc6 Bc4 Be7', 'King Pawn', 'Italian Game', 'A classical opening that develops pieces quickly and controls the center.', 85, 2),
('Sicilian Defense', 'B20', 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', '1.e4 c5', 'e4 c5', 'Sicilian', 'Open Sicilian', 'The most popular response to 1.e4, creating imbalanced positions.', 95, 3),
('Queen\'s Gambit', 'D06', 'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq - 0 2', '1.d4 d5 2.c4', 'd4 d5 c4', 'Queen Pawn', 'Queen\'s Gambit', 'A solid opening that offers a pawn to gain central control.', 75, 2),
('Ruy Lopez', 'C60', 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3', '1.e4 e5 2.Nf3 Nc6 3.Bb5', 'e4 e5 Nf3 Nc6 Bb5', 'King Pawn', 'Spanish Opening', 'One of the oldest and most respected openings in chess.', 80, 3),
('French Defense', 'C00', 'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', '1.e4 e6', 'e4 e6', 'French', 'French Defense', 'A solid defense that leads to closed positions with strategic complexity.', 70, 3),
('Caro-Kann Defense', 'B10', 'rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', '1.e4 c6', 'e4 c6', 'Caro-Kann', 'Caro-Kann Defense', 'A reliable defense that avoids the cramped positions of the French Defense.', 65, 2),
('English Opening', 'A10', 'rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq - 0 1', '1.c4', 'c4', 'English', 'English Opening', 'A flexible opening that can transpose into many different pawn structures.', 60, 2),
('Nimzo-Indian Defense', 'E20', 'rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 4', '1.d4 Nf6 2.c4 e6 3.Nc3 Bb4', 'd4 Nf6 c4 e6 Nc3 Bb4', 'Indian', 'Nimzo-Indian', 'A hypermodern defense that aims to control the center with pieces.', 70, 4),
('King\'s Indian Defense', 'E60', 'rnbqkb1r/pppppp1p/5np1/8/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 0 4', '1.d4 Nf6 2.c4 g6 3.Nc3 Bg7', 'd4 Nf6 c4 g6 Nc3 Bg7', 'Indian', 'King\'s Indian', 'A dynamic defense that allows White to occupy the center before counterattacking.', 75, 4),
('Scandinavian Defense', 'B01', 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', '1.e4 d5', 'e4 d5', 'Scandinavian', 'Center Counter', 'An aggressive defense that immediately challenges White\'s central pawn.', 45, 2);

-- Insert sample positions for Italian Game
INSERT INTO positions (opening_id, fen, move_number, side_to_move, san_move, uci_move, comment, evaluation, is_critical) VALUES
(1, 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', 1, 'black', NULL, NULL, 'Starting position', 0.0, false),
(1, 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', 2, 'white', 'e5', 'e7e5', 'Black mirrors White\'s central pawn move', 0.0, false),
(1, 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2', 2, 'black', 'Nf3', 'g1f3', 'Develops knight and attacks the e5 pawn', 0.2, true),
(1, 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', 3, 'white', 'Nc6', 'b8c6', 'Defends the e5 pawn and develops a piece', 0.2, false),
(1, 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3', 3, 'black', 'Bc4', 'f1c4', 'Develops bishop to an active square, targeting f7', 0.3, true),
(1, 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', 4, 'white', 'Nf6', 'g8f6', 'Develops knight and prepares to castle', 0.3, false);

-- Insert sample positions for Sicilian Defense
INSERT INTO positions (opening_id, fen, move_number, side_to_move, san_move, uci_move, comment, evaluation, is_critical) VALUES
(2, 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', 1, 'black', NULL, NULL, 'Starting position', 0.0, false),
(2, 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', 2, 'white', 'c5', 'c7c5', 'The Sicilian Defense - asymmetrical and sharp', -0.1, true),
(2, 'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2', 2, 'black', 'Nf3', 'g1f3', 'Most popular continuation, developing with tempo', 0.2, true);

-- Insert sample games
INSERT INTO games (white_player, black_player, white_elo, black_elo, result, date, event, site, opening_id, pgn, eco_code, time_control, termination) VALUES
('Kasparov, Garry', 'Anand, Viswanathan', 2812, 2725, '1-0', '1995-10-15', 'World Championship', 'New York', 1, '1.e4 e5 2.Nf3 Nc6 3.Bc4 Be7 4.d3 f5 5.Ng5 Nh6 6.f4 exf4 7.Bxf4 d6 8.Nf3 Bg4 9.Nc3 Qd7 10.h3 Bh5 11.Qd2 0-0-0 12.g4 Bg6 13.0-0-0 f4 14.Bb5 Nf7 15.Bxc6 bxc6 16.Rde1 Rde8 17.Re2 Bd8 18.Rfe1 Rxe4 19.Rxe4 Bxe4 20.Rxe4 Re8 21.Rxe8+ Qxe8 22.Qxf4 Qe1+ 23.Kh2 Qe5 24.Qxe5 Nxe5 25.Kg3 Kd7 26.Kf4 Ng6+ 27.Kf5 Ne7+ 28.Kf4 Ng6+ 29.Kg5 Ne5 30.Kf5 Ng6 31.h4 h6 32.Kg5 Ke6 33.Kh5 Kf6 34.Kh6 Kg8 35.Kg5 Kh7 36.Kf5 Kg8 37.Ke6 Kh7 38.Kf7 Kh8 39.Kg6 Kg8 40.Kxh6 Kh8 41.Kg5 Kg7 42.h5 Kf7 43.h6 Kg8 44.Kg6 Kh8 45.h7 Ne7+ 46.Kf7 Ng6 47.Kg7 1-0', 'C53', '40/2h+30min', 'Normal'),
('Carlsen, Magnus', 'Nakamura, Hikaru', 2830, 2780, '1/2-1/2', '2019-06-20', 'Norway Chess', 'Stavanger', 2, '1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Be3 e5 7.f3 Be7 8.Qd2 0-0 9.0-0-0 Nbd7 10.g4 b5 11.g5 Nh5 12.Kb1 Bb7 13.Rg1 Nf4 14.Bxf4 exf4 15.Qxf4 Nc5 16.h4 Rc8 17.Be2 Qc7 18.Rd2 Rfe8 19.Rgd1 Bf8 20.Qg3 Red8 21.f4 Be7 22.Nf5 Bf8 23.Rd4 Qb6 24.R4d2 Qc7 25.Rd4 Qb6 26.R4d2 1/2-1/2', 'B90', '100min+30sec', 'Normal'),
('Kramnik, Vladimir', 'Topalov, Veselin', 2743, 2813, '0-1', '2006-10-10', 'World Championship', 'Elista', 3, '1.d4 d5 2.c4 c6 3.Nf3 Nf6 4.Nc3 e6 5.Bg5 h6 6.Bxf6 Qxf6 7.e3 Nd7 8.Bd3 dxc4 9.Bxc4 g6 10.0-0 Bg7 11.Re1 0-0 12.e4 e5 13.d5 Nb6 14.Bb3 cxd5 15.exd5 Bg4 16.h3 Bxf3 17.Qxf3 Qxf3 18.gxf3 f5 19.Kg2 Kh7 20.Rh1 Rac8 21.Rac1 Rxc3 22.Rxc3 Rc8 23.Rxc8 Nxc8 24.Rc1 Nd6 25.Rc6 Nf7 26.Bd1 Bd4 27.Rc2 Kg7 28.Kf1 Kf6 29.Ke2 g5 30.Kd3 Bb6 31.Rc6 Kg6 32.Rc2 f4 33.Rf2 Kf5 34.Ke2 g4 35.hxg4+ Kxg4 36.Kf1 Kg3 37.Rg2+ Kh3 38.Rg1 Bd4 39.Rg2 Bxf2 40.Rxf2 Kg3 41.Rg2+ Kh3 42.Rg1 Ne5 43.Ke2 Kg2 44.Rg7 Kf2 45.Rg1 Ng6 46.Rg2+ Kf1 47.Rg1+ Ke3 48.Re1+ Kf2 49.Re2+ Kg1 50.Re1+ Kf2 51.Re2+ Kg3 52.Re1 Nh4 53.Rg1+ Kh2 54.Rg7 Nxf3 55.Kf2 Kh3 56.Rg1 Ng5 57.Rg3+ Kh2 58.Rg1 Kh3 59.Rg3+ Kh4 60.Rg1 f3 61.Rf1 Kg4 62.Bxf3+ Kh3 63.Rh1+ Kg2 64.Rh2+ Kg1 65.Rh1+ Kf2 66.Rh2+ Ke3 67.Re2+ Kd3 68.Re1 Nxf3 69.Re3+ Kd2 70.Rxe5 Nd4 71.Re4 Nf5 72.Re5 Nd6 73.Re6 Nf7 74.Re4 Kd3 75.Re1 Ng5 76.Rd1+ Ke4 77.Re1+ Kf4 78.Rf1+ Ke5 79.Re1+ Kf6 80.Rf1+ Kg6 81.Rg1 Kf5 82.Rf1+ Ke4 83.Re1+ Kd3 84.Rd1+ Ke2 85.Re1+ Kf2 86.Re4 Nf3 87.Re3 Ng1 88.Re1 Nf3 89.Re3 Ng5 90.Re5 Nf7 91.Re4 Ng5 92.Re5 Nf3 93.Re3 Ng1 94.Re1 Nf3 95.Re3 Ng5 96.Re5 Nf7 97.Re2+ Kg3 98.Re3+ Kf4 99.Re4+ Kg3 100.Re3+ Kf2 101.Re2+ Kg1 102.Re1+ Kf2 103.Re2+ Kg3 104.Re3+ Kf4 105.Re4+ Kg3 106.Re3+ Kf2 107.Re2+ Kg1 108.Re1+ Kf2 109.Re4 Ng5 110.Re5 Nf7 111.Re2+ Kg3 112.Re3+ Kf4 113.Re4+ Kg3 114.Re3+ Kf2 115.Re2+ Kg1 116.Re1+ Kf2 117.Re2+ Kg3 118.Re3+ Kf4 119.Re4+ Kg3 120.Re3+ Kf2 121.Re2+ Kg1 122.Re1+ Kf2 123.Re4 Ng5 124.Re5 Nf7 125.Re2+ Kg3 126.Re3+ Kf4 127.Re4+ Kg3 128.Re3+ Kf2 129.Re2+ Kg1 130.Re1+ Kf2 131.Re2+ Kg3 132.Re3+ Kf4 133.Re4+ Kg3 134.Re3+ Kf2 135.Re2+ Kg1 136.Re1+ Kf2 137.Re4 Ng5 138.Re5 Nf7 0-1', 'D06', '120min+30sec', 'Normal');

-- Insert sample training sessions
INSERT INTO training_sessions (user_id, opening_id, session_type, score, total_questions, correct_answers, time_spent, difficulty_level, completed, started_at, completed_at) VALUES
('user123', 1, 'study', 85, 10, 9, 1200, 2, 1, '2024-01-15 10:00:00', '2024-01-15 10:20:00'),
('user123', 2, 'drill', 75, 20, 15, 1800, 3, 1, '2024-01-16 14:30:00', '2024-01-16 15:00:00'),
('user456', 1, 'test', 90, 15, 14, 2100, 2, 1, '2024-01-17 09:15:00', '2024-01-17 09:50:00'),
('user456', 3, 'study', 70, 8, 6, 960, 2, 1, '2024-01-18 16:45:00', '2024-01-18 17:01:00'),
('user789', 2, 'drill', 80, 25, 20, 2400, 3, 1, '2024-01-19 11:20:00', '2024-01-19 12:00:00');

-- Insert sample training progress
INSERT INTO training_progress (session_id, position_id, user_response, correct_response, is_correct, time_taken, hint_used, attempt_number) VALUES
(1, 3, 'Nf3', 'Nf3', 1, 15, 0, 1),
(1, 5, 'Bc4', 'Bc4', 1, 12, 0, 1),
(1, 6, 'Be7', 'Nf6', 0, 18, 0, 1),
(1, 6, 'Nf6', 'Nf6', 1, 8, 1, 2),
(2, 7, 'c5', 'c5', 1, 10, 0, 1),
(2, 8, 'Nf3', 'Nf3', 1, 14, 0, 1);

-- Update opening popularity based on usage
UPDATE openings SET popularity = popularity + 5 WHERE id IN (1, 2, 3);
