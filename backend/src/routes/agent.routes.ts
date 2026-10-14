import { Router } from 'express';
import { Role } from '@prisma/client';
import { UserController } from '../controllers/user.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const router = Router();

router.get('/performance', authenticate, requireRole(Role.ADMIN, Role.AGENT), UserController.getAgentPerformance);

export default router;
