import { Router } from 'express';
import { GameController } from '../controllers/GameController';

const router = Router();
const gameController = new GameController();

// Game routes
router.post('/', (req, res) => gameController.createGame(req, res));
router.get('/:id', (req, res) => gameController.getGame(req, res));
router.post('/:id/moves', (req, res) => gameController.makeMove(req, res));
router.post('/:id/ai-move', (req, res) => gameController.getAiMove(req, res));

export default router;
