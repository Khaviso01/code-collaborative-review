import { z } from 'zod';

// Schema for validating user registration requests
export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Must be a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['submitter', 'reviewer']).optional(),
});

// Schema for validating user login credentials
export const loginSchema = z.object({
  email: z.string().email('Must be a valid email'),
  password: z.string().min(1, 'Password is required'),
});

// Schema for validating user profile update requests
export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  avatar_url: z.string().url().optional(),
});

// Schema for validating new project creation requests
export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
});

// Schema for validating project member addition payloads
export const addMemberSchema = z.object({
  userId: z.string().uuid('userId must be a valid UUID'),
});

// Schema for validating code submission creation requests
export const createSubmissionSchema = z.object({
  projectId: z.string().uuid('projectId must be a valid UUID'),
  title: z.string().min(1, 'Title is required'),
  codeContent: z.string().min(1, 'codeContent is required'),
  language: z.string().optional(),
});

// Schema for validating submission status modification requests
export const updateStatusSchema = z.object({
  status: z.enum(['pending', 'in_review', 'approved', 'changes_requested']),
});

// Schema for validating new comment creation requests on a submission
export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required'),
  lineNumber: z.number().int().positive().optional(),
});

// Schema for validating comment update requests
export const updateCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required'),
});

// Schema for validating review decision submissions (approvals or change requests)
export const reviewDecisionSchema = z.object({
  comment: z.string().optional(),
});