import { Request, Response } from 'express';
import pool from '../config/db';
import { ApiError } from '../utils/ApiError';
import { Comment, Submission } from '../types';
import { emitToUser } from '../websocket/socket';

// Helper function to retrieve a code submission by its ID. Throws a 404 ApiError if the submission does not exist in the database.
async function getSubmissionOrThrow(id: string): Promise<Submission> {
  const result = await pool.query<Submission>('SELECT * FROM submissions WHERE id = $1', [id]);
  if (result.rows.length === 0) {
    throw new ApiError(404, 'Submission not found');
  }
  return result.rows[0];
}

// Helper function to retrieve a comment by its ID. Throws a 404 ApiError if the comment does not exist in the database.
async function getCommentOrThrow(id: string): Promise<Comment> {
  const result = await pool.query<Comment>('SELECT * FROM comments WHERE id = $1', [id]);
  if (result.rows.length === 0) {
    throw new ApiError(404, 'Comment not found');
  }
  return result.rows[0];
}

// Creates a new comment or code inline feedback on a submission.
// Restricts comment creation to users with the 'reviewer' role.
// validates that the reviewer is a member of the parent project.
export async function createComment(req: Request, res: Response): Promise<void> {
  const { id: submissionId } = req.params;
  const { content, lineNumber } = req.body;
  const authorId = req.user!.id;

  // Authorization Check: Only users with the 'reviewer' role can create comments
  if (req.user!.role !== 'reviewer') {
    throw new ApiError(403, 'Only reviewers are allowed to add comments');
  }

  // Ensure target submission exists
  const submission = await getSubmissionOrThrow(submissionId);

  // Authorization Check: Ensure the reviewer is a member of the project
  const membership = await pool.query(
    'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
    [submission.project_id, authorId]
  );
  if (membership.rows.length === 0) {
    throw new ApiError(403, 'You must be a member of this project to comment');
  }

  // Insert the new comment record into PostgreSQL
  const result = await pool.query<Comment>(
    `INSERT INTO comments (submission_id, author_id, content, line_number)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [submissionId, authorId, content, lineNumber ?? null]
  );

  const comment = result.rows[0];

  // Send a real-time socket event notification to the original submitter if they aren't the author
  if (submission.submitter_id !== authorId) {
    emitToUser(submission.submitter_id, 'notification', {
      type: 'new_comment',
      message: `New comment on your submission "${submission.title}"`,
    });
  }

  // Return 201 Created with the new comment payload
  res.status(201).json(comment);
}

// Listing all comments associated with a specific code submission in chronological order.
export async function listComments(req: Request, res: Response): Promise<void> {
  const { id: submissionId } = req.params;

  // Validate existence of the submission before querying comments
  await getSubmissionOrThrow(submissionId);

  // Retrieve comments ordered from oldest to newest
  const result = await pool.query<Comment>(
    'SELECT * FROM comments WHERE submission_id = $1 ORDER BY created_at ASC',
    [submissionId]
  );

  res.json(result.rows);
}

// PUT /api/comments/:id
//
// Updates the text content of an existing comment.
// - Only the original comment author is permitted to update content.
export async function updateComment(req: Request, res: Response): Promise<void> {
  const { content } = req.body;
  const comment = await getCommentOrThrow(req.params.id);

  // Ownership Check: Ensure the user modifying the comment is the author
  if (comment.author_id !== req.user!.id) {
    throw new ApiError(403, 'You can only edit your own comments');
  }

  // Updating content and touch the updated_at timestamp
  const result = await pool.query<Comment>(
    `UPDATE comments SET content = $1, updated_at = now() WHERE id = $2 RETURNING *`,
    [content, comment.id]
  );

  res.json(result.rows[0]);
}

// Permanently removes a comment ,Only the comment's original author is allowed to delete it.
export async function deleteComment(req: Request, res: Response): Promise<void> {
  const comment = await getCommentOrThrow(req.params.id);

  // Ownership Check to Ensure only the original comment author can delete
  if (comment.author_id !== req.user!.id) {
    throw new ApiError(403, 'You can only delete your own comments');
  }

  // Deletes the comment record from PostgreSQL
  await pool.query('DELETE FROM comments WHERE id = $1', [comment.id]);

  // Returns 204 No Content upon successful deletion
  res.status(204).send();
}