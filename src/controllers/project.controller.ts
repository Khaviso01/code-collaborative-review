import { Request, Response } from 'express';
import pool from '../config/db';
import { ApiError } from '../utils/ApiError';
import { emitToUser } from '../websocket/socket';

// Creating a new project and sets the logged-in user as the owner.
export async function createProject(req: Request, res: Response): Promise<void> {
  // Extracting project payload from the request body
  const { name, description } = req.body;
  // Gets authenticated user ID from request context
  const ownerId = req.user!.id;

  // Inserting project record into the database
  const result = await pool.query(
    `INSERT INTO projects (name, description, owner_id)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [name, description || null, ownerId]
  );

  const project = result.rows[0];

  // Auto registers creator in project_members table
  await pool.query(
    `INSERT INTO project_members (project_id, user_id) VALUES ($1, $2)`,
    [project.id, ownerId]
  );

  // Return HTTP 201 Created with project payload
  res.status(201).json(project);
}

// Retrieving all projects where the authenticated user is a registered member.
export async function listProjects(req: Request, res: Response): Promise<void> {
  // Get authenticated user ID
  const userId = req.user!.id;

  // Query matching user membership, ordered newest first
  const result = await pool.query(
    `SELECT p.*
     FROM projects p
     JOIN project_members pm ON pm.project_id = p.id
     WHERE pm.user_id = $1
     ORDER BY p.created_at DESC`,
    [userId]
  );

  // Return project array response
  res.json(result.rows);
}

// Helper function to retrieve a project by ID. Throws a 404 ApiError if the project does not exist.
async function getProjectOrThrow(projectId: string) {
  const result = await pool.query('SELECT * FROM projects WHERE id = $1', [projectId]);
  if (result.rows.length === 0) {
    throw new ApiError(404, 'Project not found');
  }
  return result.rows[0];
}

// Adding a new user to a project.
export async function addMember(req: Request, res: Response): Promise<void> {
  // Extracting project ID from URL params and target user ID from body
  const { id: projectId } = req.params;
  const { userId } = req.body;

  // Ensure project exists
  const project = await getProjectOrThrow(projectId);

  // Authorization Check Only project owner can invite/add new members
  if (project.owner_id !== req.user!.id) {
    throw new ApiError(403, 'Only the project owner can add members');
  }

  // Ensuring target user exists in database
  const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
  if (userCheck.rows.length === 0) {
    throw new ApiError(404, 'User not found');
  }

  // Inserting membership record, ignoring duplicate entries
  await pool.query(
    `INSERT INTO project_members (project_id, user_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [projectId, userId]
  );

  // Sending real-time notification to target user if currently online
  emitToUser(userId, 'notification', {
    type: 'project_invite',
    message: `You were added to the project "${project.name}"`,
  });

  // Returning HTTP 201 Created with confirmation status
  res.status(201).json({ message: 'Member added', projectId, userId });
}

// Removing a member from a project.
export async function removeMember(req: Request, res: Response): Promise<void> {
  // Extract project ID and target user ID from URL params
  const { id: projectId, userId } = req.params;

  // Ensure project exists
  const project = await getProjectOrThrow(projectId);

  // Authorization Check: Only project owner can remove members
  if (project.owner_id !== req.user!.id) {
    throw new ApiError(403, 'Only the project owner can remove members');
  }

  // Delete project membership record
  await pool.query(
    'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2',
    [projectId, userId]
  );

  // Return HTTP 204 No Content upon successful removal
  res.status(204).send();
}