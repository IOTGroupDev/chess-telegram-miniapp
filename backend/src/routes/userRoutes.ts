import { Router } from 'express';
import { UserController } from '../controllers/UserController';

const router = Router();
const userController = new UserController();

// User routes
router.get('/:id', (req, res) => userController.getUser(req, res));
router.get('/:id/history', (req, res) => userController.getUserHistory(req, res));
router.post('/', (req, res) => userController.createOrUpdateUser(req, res));

export default router;
