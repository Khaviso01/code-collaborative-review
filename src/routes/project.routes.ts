import { Router } from 'express';
import { createProject, listProjects, addMember, removeMember } from '../controllers/project.controller';
import { listSubmissionsForProject } from '../controllers/submission.controller';
import { getProjectStats } from '../controllers/stats.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createProjectSchema, addMemberSchema } from '../utils/schemas';
import { asyncHandler } from '../utils/asyncHandler';

// Initialize the Express router for project management endpoints
const router = Router();

// Apply the authenticate middleware globally to all routes in this router
router.use(authenticate);

// POST /projects - validate request body and create a new project
router.post('/', validate(createProjectSchema), asyncHandler(createProject));

// GET /projects - retrieve a list of all accessible projects
router.get('/', asyncHandler(listProjects));

// POST /projects/:id/members - add a new member to a specific project after validation
router.post('/:id/members', validate(addMemberSchema), asyncHandler(addMember));

// DELETE /projects/:id/members/:userId - remove a member from a specific project by user ID
router.delete('/:id/members/:userId', asyncHandler(removeMember));

// Nested submissions-by-project route - retrieve all submissions belonging to a project
router.get('/:id/submissions', asyncHandler(listSubmissionsForProject));

// Analytics dashboard route - retrieve statistics and metrics for a specific project
router.get('/:id/stats', asyncHandler(getProjectStats));

export default router;