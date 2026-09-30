import { Request, Response } from 'express';
import pool from '../config/db';
import { ApiError } from '../utils/ApiError';
import { Submission, ReviewAction } from '../types';
import { emitToUser } from '../websocket/socket';

// Helper function to fetch a submission by its unique ID throws error when not found
async function getSubmissionOrThrow(id: string): Promise<Submission> {
  const result = await pool.query<Submission>('SELECT * FROM submissions WHERE id = $1', [id]);
  if (result.rows.length === 0) {
    throw new ApiError(404, 'Submission not found');
  }
  return result.rows[0];
}

// Internal shared controller logic for both approval and change requests.
// Handles role verification, project membership check, database update, and live notification.
async function recordReviewDecision(
  req: Request,
  res: Response,
  action: ReviewAction,
  newStatus: 'approved' | 'changes_requested'
) {
 
  const { id: submissionId } = req.params;  // Extract submission ID from route parameters
  const { comment } = req.body; // Extract optional comment feedback from the request body
  const reviewerId = req.user!.id; // Get authenticated user ID from request context

  // Authorization Check with Only users with the 'reviewer' role can evaluate submissions
  if (req.user!.role !== 'reviewer') {
    throw new ApiError(403, 'Only reviewers can approve or request changes');
  }

  // Ensure target submission exists
  const submission = await getSubmissionOrThrow(submissionId);

  // Authorization Check to Confirm reviewer belongs to the project hosting this submission
  const membership = await pool.query(
    'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
    [submission.project_id, reviewerId]
  );
  if (membership.rows.length === 0) {
    throw new ApiError(403, 'You must be a member of this project to review its submissions');
  }

  // Update submission status and persist the latest review metadata directly on the row
  const result = await pool.query<Submission>(
    `UPDATE submissions
     SET status = $1,
         reviewed_by = $2,
         review_action = $3,
         review_comment = $4,
         reviewed_at = now(),
         updated_at = now()
     WHERE id = $5
     RETURNING *`,
    [newStatus, reviewerId, action, comment || null, submissionId]
  );

  // Push a real-time WebSocket notification event to the code submitter
  emitToUser(submission.submitter_id, 'notification', {
    type: 'review_decision',
    message: `Your submission "${submission.title}" was ${action === 'approved' ? 'approved' : 'sent back for changes'}`,
  });

  // Return HTTP 201 Created with the updated submission payload
  res.status(201).json(result.rows[0]);
}

// Approves a submission, updating its state and storing the review decision.
export async function approveSubmission(req: Request, res: Response) {
  await recordReviewDecision(req, res, 'approved', 'approved');
}

// Requests modifications on a submission, sending it back to the submitter.
export async function requestChanges(req: Request, res: Response) {
  await recordReviewDecision(req, res, 'changes_requested', 'changes_requested');
}

// Fetches the most recent review decision and reviewer feedback for a submission.
export async function getReviewHistory(req: Request, res: Response) {
  // Ensure submission exists
  const submission = await getSubmissionOrThrow(req.params.id);

  // Return null payload if the submission has not received a review yet
  if (!submission.review_action) {
    return res.json({ message: 'No review has been submitted yet', latestReview: null });
  }

  // Return formatted review metadata payload
  res.json({
    latestReview: {
      action: submission.review_action,
      comment: submission.review_comment,
      reviewedBy: submission.reviewed_by,
      reviewedAt: submission.reviewed_at,
    },
  });
}