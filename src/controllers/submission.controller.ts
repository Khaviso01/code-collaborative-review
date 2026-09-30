
import { Request, Response } from 'express';
import pool from '../config/db';
import { ApiError } from '../utils/ApiError';
import { Submission } from '../types';

// helper to confirm the user is a member of a project.
async function assertIsProjectMember(projectId: string, userId: string) {
  const result = await pool.query(
    'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
    [projectId, userId]
  );
  if (result.rows.length === 0) {
    throw new ApiError(403, 'You must be a member of this project to do that');
  }
}

// Helper function to fetch a submission by its unique ID.
async function getSubmissionOrThrow(id: string): Promise<Submission> {
  const result = await pool.query<Submission>('SELECT * FROM submissions WHERE id = $1', [id]);
  if (result.rows.length === 0) {
    throw new ApiError(404, 'Submission not found');
  }
  return result.rows[0];
}

// POST /api/submissions which creates a new code submission under a specific project.
export async function createSubmission(req: Request, res: Response) {
  const { projectId, title, codeContent, language } = req.body;
  // Get authenticated user ID from request context
  const submitterId = req.user!.id;

  // Authorization Check to Ensure the user belongs to the target project
  await assertIsProjectMember(projectId, submitterId);

  // Insert new submission into PostgreSQL
  const result = await pool.query<Submission>(
    `INSERT INTO submissions (project_id, submitter_id, title, code_content, language)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [projectId, submitterId, title, codeContent, language || 'plaintext']
  );

  // Return HTTP 201 Created with the inserted submission
  res.status(201).json(result.rows[0]);
}

// GET /api/projects/:id/submissions
// Retrieves all code submissions for a specific project in descending order of creation.
export async function listSubmissionsForProject(req: Request, res: Response) {
    // Extract project ID from route parameters
  const { id: projectId } = req.params;

// Authorization Check to Ensure requesting user belongs to the target project
  await assertIsProjectMember(projectId, req.user!.id);

  // Fetch project submissions sorted newest first
  const result = await pool.query<Submission>(
    'SELECT * FROM submissions WHERE project_id = $1 ORDER BY created_at DESC',
    [projectId]
  );

  res.json(result.rows);
}

// GET /api/submissions/:id
// Fetches details of a single submission by its ID then returns submission payload
export async function getSubmission(req: Request, res: Response) {
  const submission = await getSubmissionOrThrow(req.params.id);
  await assertIsProjectMember(submission.project_id, req.user!.id);
  res.json(submission);
}

// Updates the status state of an existing code submission.
export async function updateSubmissionStatus(req: Request, res: Response) {
  const { status } = req.body;
  const submission = await getSubmissionOrThrow(req.params.id);

  // Authorization Check to Verify requesting user is a project member
  await assertIsProjectMember(submission.project_id, req.user!.id);

  // Persist updated status and refresh updated_at timestamp
  const result = await pool.query<Submission>(
    `UPDATE submissions SET status = $1, updated_at = now() WHERE id = $2 RETURNING *`,
    [status, submission.id]
  );

  res.json(result.rows[0]);
}

// Deletes a submission permanently.
export async function deleteSubmission(req: Request, res: Response) {
  const submission = await getSubmissionOrThrow(req.params.id);

  // Ownership Check to Ensure only the original submitter can delete the submission
  if (submission.submitter_id !== req.user!.id) {
    throw new ApiError(403, 'Only the original submitter can delete this submission');
  }

  await pool.query('DELETE FROM submissions WHERE id = $1', [submission.id]);
  res.status(204).send();
}
