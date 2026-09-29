import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/db';
import { signToken } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';
import { User, PublicUser } from '../types';

// Removing the password hash before sending a user object back to the client.
function toPublicUser(user: User): PublicUser {
  const { password_hash, ...publicUser } = user;
  return publicUser;
}

//handling new user registration and hashing passsword to return an auth token
export async function register(req: Request, res: Response) {
  const { name, email, password, role } = req.body;

  // Checking if account already exists with provided email
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  // Hashing password using bcrypt
  const passwordHash = await bcrypt.hash(password, 10);

  // inserting new user into PostgreSQL, defaulting role to submmitter
  const result = await pool.query<User>(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [name, email, passwordHash, role || 'submitter']
  );

  const user = result.rows[0];
  const token = signToken({ userId: user.id, role: user.role }); // Generates JWT token containing essential user claims

  // Responding with 201 Created status, sanitized user data, and JWT token
  res.status(201).json({ user: toPublicUser(user), token });
}

// Validating credentials and to return an auth token upon success.
export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  // Query database for user by email using parameterized query to prevent SQL injection
  const result = await pool.query<User>('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];

  // 401 error message prevents user enumeration attacks
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  // // Comparing submitted plain-text password with stored hash
  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    throw new ApiError(401, 'Invalid email or password');
  }

  // issuing JWT token
  const token = signToken({ userId: user.id, role: user.role });
  // Returning sanitized user object and token
  res.json({ user: toPublicUser(user), token });
}
