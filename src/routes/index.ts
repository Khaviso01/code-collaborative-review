import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import projectRoutes from './project.routes';
import submissionRoutes from './submission.routes';
import commentRoutes from './comment.routes';

const router = Router();
// Mounting every router onto main /api path
router.use('/auth', authRoutes);             // /api/auth/
router.use('/users', userRoutes);            // /api/users/
router.use('/projects', projectRoutes);      // /api/projects/
router.use('/submissions', submissionRoutes);// /api/submissions/
router.use('/comments', commentRoutes);      // /api/comments/

export default router;
