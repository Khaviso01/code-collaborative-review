// The two platform-wide roles used for basic RBAC.
export type UserRole = 'submitter' | 'reviewer';

// Possible states a code submission can be in.
export type SubmissionStatus = 'pending' | 'in_review' | 'approved' | 'changes_requested';

// The two possible outcomes of a review decision.
export type ReviewAction = 'approved' | 'changes_requested';

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: Date;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: Date;
}

export interface Submission {
  id: string;
  project_id: string;
  submitter_id: string;
  title: string;
  code_content: string;
  language: string;
  status: SubmissionStatus;

  reviewed_by: string | null;
  review_action: ReviewAction | null;
  review_comment: string | null;
  reviewed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface Comment {
  id: string;
  submission_id: string;
  author_id: string;
  content: string;
  line_number: number | null;
  created_at: Date;
  updated_at: Date;
}

// The payload we store inside every JWT token.
export interface JwtPayload {
  userId: string;
  role: UserRole;
}
