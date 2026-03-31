import express, { Router } from 'express';
import authController, { registerValidation, loginValidation } from '@controllers/AuthController';
import { validate } from '@middleware/validation';
import { authMiddleware } from '@middleware/auth';

const router: Router = express.Router();

router.post('/register', validate(registerValidation), authController.register);
router.post('/login', validate(loginValidation), authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authMiddleware, authController.logout);
router.get('/me', authMiddleware, authController.getMe);

export default router;