import { Router } from 'express';
import { register, login } from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { registerSchema, loginSchema } from '../utils/schemas';
import { asyncHandler } from '../utils/asyncHandler';

// Initialize the Express router for authentication endpoints
const router = Router();

// POST /auth/register - validate incoming user registration data and create a new account
router.post('/register', validate(registerSchema), asyncHandler(register));

// POST /auth/login - validate login credentials and issue an authentication token
router.post('/login', validate(loginSchema), asyncHandler(login));

export default router;