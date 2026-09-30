
import { Request, Response } from 'express';
import pool from '../config/db';
import { ApiError } from '../utils/ApiError';

// Helper function to verify that a project exists in the database.
async function assertProjectExists(projectId: string) {
  const result = await pool.query('SELECT id FROM projects WHERE id = $1', [projectId]);
  if (result.rows.length === 0) {
    throw new ApiError(404, 'Project not found');
  }
}

// Calculates and returns aggregate analytics and metrics for a specific project.
export async function getProjectStats(req: Request, res: Response) {
  const { id: projectId } = req.params;
  await assertProjectExists(projectId);

// Measures interval between submission creation (created_at) and latest review decision (reviewed_at)
  const avgReviewTimeResult = await pool.query(
    `SELECT EXTRACT(EPOCH FROM AVG(reviewed_at - created_at)) AS avg_review_seconds
     FROM submissions
     WHERE project_id = $1 AND reviewed_at IS NOT NULL`,
    [projectId]
  );
  const avgSeconds = avgReviewTimeResult.rows[0].avg_review_seconds;

  // Aggregates status breakdown across all project submissions approval rate percentage
  const approvalRateResult = await pool.query(
    `SELECT
        COUNT(*) FILTER (WHERE status = 'approved') AS approved_count,
        COUNT(*) FILTER (WHERE status = 'changes_requested') AS changes_requested_count,
        COUNT(*) AS total_count
     FROM submissions
     WHERE project_id = $1`,
    [projectId]
  );

  const { approved_count, changes_requested_count, total_count } = approvalRateResult.rows[0]; // Destructure breakdown counts from query row
  const reviewedCount = Number(approved_count) + Number(changes_requested_count); // Sum total count of submissions that have received an explicit review decision
  const approvalRate = reviewedCount > 0 // Calculate approval percentage rounded to 1 decimal plac
    ? Number(((Number(approved_count) / reviewedCount) * 100).toFixed(1))
    : null;


    // Query Most Active Reviewers
  const activeReviewersResult = await pool.query(
    `SELECT u.id, u.name, COUNT(s.id) AS submissions_reviewed
     FROM submissions s
     JOIN users u ON u.id = s.reviewed_by
     WHERE s.project_id = $1
     GROUP BY u.id, u.name
     ORDER BY submissions_reviewed DESC
     LIMIT 5`,
    [projectId]
  );

  // Submission with the most comments
  const mostCommentedResult = await pool.query(
    `SELECT s.id, s.title, COUNT(c.id) AS comment_count
     FROM submissions s
     LEFT JOIN comments c ON c.submission_id = s.id
     WHERE s.project_id = $1
     GROUP BY s.id, s.title
     ORDER BY comment_count DESC
     LIMIT 1`,
    [projectId]
  );

  // Return computed metrics object response
  res.json({
    totalSubmissions: Number(total_count),
    approvalRatePercent: approvalRate, // null if nothing has been reviewed yet
    averageReviewSeconds: avgSeconds === null ? null : Number(Number(avgSeconds).toFixed(1)),
    mostActiveReviewers: activeReviewersResult.rows,
    submissionWithMostComments: mostCommentedResult.rows[0] || null,
  });
}
