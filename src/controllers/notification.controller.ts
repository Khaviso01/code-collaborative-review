import { Request, Response } from 'express';
import pool from '../config/db';
import { ApiError } from '../utils/ApiError';
import { Notification } from '../types';

// GET /api/users/:id/notifications
export async function getUserNotifications(req: Request, res: Response) {
  const { id } = req.params;

  // Ensuring A user can only view their own notification feed.
  if (req.user!.id !== id) {
    throw new ApiError(403, "You can only view your own notifications");
  }

  const result = await pool.query<Notification>(
    'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
    [id]
  );

  res.json(result.rows);
}
