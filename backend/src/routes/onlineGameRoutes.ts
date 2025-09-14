import { Router } from 'express';
import { OnlineGameController } from '../controllers/OnlineGameController';

const router = Router();
const onlineGameController = new OnlineGameController();

// Online game routes
router.post('/', (req, res) => onlineGameController.createGame(req, res));
router.get('/:id', (req, res) => onlineGameController.getGame(req, res));
router.get('/:id/history', (req, res) => onlineGameController.getUserHistory(req, res));
router.get('/waiting/list', (req, res) => onlineGameController.getWaitingGames(req, res));

export default router;
