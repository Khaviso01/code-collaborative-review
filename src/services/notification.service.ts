import pool from '../config/db';
import { emitToUser } from '../websocket/socket';
import { Notification } from '../types';

// Asynchronous utility function to create a new notification record in the database and broadcast it live
export async function createNotification(
  userId: string,
  type: string,
  message: string
): Promise<Notification> {
  // Insert the notification record into the database and return the newly created row
  const result = await pool.query<Notification>(
    `INSERT INTO notifications (user_id, type, message)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, type, message]
  );

  // Extract the created notification object from the query result rows
  const notification = result.rows[0];

  // Push it live to the user if they currently have an active WebSocket connection open.
  emitToUser(userId, 'notification', notification);

  // Return the newly created notification object
  return notification;
}