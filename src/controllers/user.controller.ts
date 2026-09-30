import { Request, Response } from 'express';
import pool from '../config/db';
import { ApiError } from '../utils/ApiError';
import { User, PublicUser } from '../types';

// Helper function to strip sensitive data (like the password hash) from a user object before returning it to the client
function toPublicUser(user: User): PublicUser {
  const { password_hash, ...publicUser } = user;
  return publicUser;
}

// GET /api/users/:id to retrieve a user profile by their unique ID, omitting sensitive fields
export async function getUser(req: Request, res: Response) {
  const { id } = req.params;

  // Query the database for the user matching the requested ID
  const result = await pool.query<User>('SELECT * FROM users WHERE id = $1', [id]);
  const user = result.rows[0];

  // Throw a 404 error if no user exists with the given ID
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Send the sanitized public user object as a JSON response
  res.json(toPublicUser(user));
}

// PUT /api/users/:id, allowing authenticated users to update their own profile information
export async function updateUser(req: Request, res: Response) {
  const { id } = req.params;
  const { name, avatar_url } = req.body;

  // Enforce authorization: verify that the logged-in user matches the profile ID being updated
  if (req.user!.id !== id) {
    throw new ApiError(403, 'You can only update your own profile');
  }

  // Update user fields in the database using COALESCE to keep existing values if fields are omitted, then return the updated row
  const result = await pool.query<User>(
    `UPDATE users
     SET name = COALESCE($1, name),
         avatar_url = COALESCE($2, avatar_url),
         updated_at = now()
     WHERE id = $3
     RETURNING *`,
    [name, avatar_url, id]
  );

  // Throw a 404 error if the user record was not found during the update operation
  if (result.rows.length === 0) {
    throw new ApiError(404, 'User not found');
  }

  // Return the updated public user profile
  res.json(toPublicUser(result.rows[0]));
}

// DELETE /api/users/:id - allows authenticated users to delete their own account
export async function deleteUser(req: Request, res: Response) {
  const { id } = req.params;

  // Enforce authorization that verify that the logged-in user matches the account ID being deleted
  if (req.user!.id !== id) {
    throw new ApiError(403, 'You can only delete your own account');
  }

  // Delete the user record from the database by ID
  await pool.query('DELETE FROM users WHERE id = $1', [id]);
  
  // Return a successful 204 No Content response
  res.status(204).send();
}