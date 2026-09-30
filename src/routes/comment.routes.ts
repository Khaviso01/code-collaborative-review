import { Router } from 'express';
import { updateComment, deleteComment } from '../controllers/comment.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { updateCommentSchema } from '../utils/schemas';
import { asyncHandler } from '../utils/asyncHandler';

// Initialize the Express router for comment management endpoints
const router = Router();

// Apply the authenticate middleware globally to all routes in this router
router.use(authenticate);

// PUT /comments/:id - validate incoming update data and update an existing comment by ID
router.put('/:id', validate(updateCommentSchema), asyncHandler(updateComment));

// DELETE /comments/:id - delete an existing comment by ID
router.delete('/:id', asyncHandler(deleteComment));

export default router;