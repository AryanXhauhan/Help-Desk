import { Router } from 'express';
import { Role } from '@prisma/client';
import { UserController } from '../controllers/user.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createUserSchema, updateUserSchema } from '../validators/user.validator.js';

const router = Router();

// Agents dropdown list (accessible by authenticated users, e.g. for ticket filtering)
router.get('/agents', authenticate, UserController.getAgents);

// Admin-only user management
router.get('/', authenticate, requireRole(Role.ADMIN), UserController.getUsers);
router.post('/', authenticate, requireRole(Role.ADMIN), validate({ body: createUserSchema }), UserController.createUser);
router.patch('/:id', authenticate, requireRole(Role.ADMIN), validate({ body: updateUserSchema }), UserController.updateUser);

export default router;
