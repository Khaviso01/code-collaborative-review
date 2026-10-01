import { Router } from 'express';
import { getUser, updateUser, deleteUser } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { updateUserSchema } from '../utils/schemas';
import { asyncHandler } from '../utils/asyncHandler';

// Initialize the Express router for user profile management endpoints
const router = Router();

// Every route below requires the caller to be logged in.
router.use(authenticate);

// GET /users/:id - retrieve user profile details by ID
router.get('/:id', asyncHandler(getUser));

// PUT /users/:id - validate request body and update an existing user profile by ID
router.put('/:id', validate(updateUserSchema), asyncHandler(updateUser));

// DELETE /users/:id - delete a user account by ID
router.delete('/:id', asyncHandler(deleteUser));

export default router;