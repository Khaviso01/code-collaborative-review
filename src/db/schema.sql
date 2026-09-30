-- Enable the uuid-ossp extension to support automated UUID generation functions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the users table to store profile info, authentication hashes, and roles
CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          VARCHAR(120) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          VARCHAR(20) NOT NULL DEFAULT 'submitter'
                  CHECK (role IN ('submitter', 'reviewer')),
    avatar_url    TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create the projects table to group code submissions under specific project ownership
CREATE TABLE IF NOT EXISTS projects (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(150) NOT NULL,
    description TEXT,
    owner_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create a junction table to manage many-to-many user memberships within projects
CREATE TABLE IF NOT EXISTS project_members (
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    added_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (project_id, user_id)
);

-- Create the submissions table to track code uploads, review statuses, and review feedback
CREATE TABLE IF NOT EXISTS submissions (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    submitter_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title         VARCHAR(200) NOT NULL,
    code_content  TEXT NOT NULL,
    language      VARCHAR(50) DEFAULT 'plaintext',
    status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'in_review', 'approved', 'changes_requested')),
    reviewed_by    UUID REFERENCES users(id),
    review_action  VARCHAR(20) CHECK (review_action IN ('approved', 'changes_requested')),
    review_comment TEXT,
    reviewed_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create the comments table to store line-specific or general feedback on code submissions
CREATE TABLE IF NOT EXISTS comments (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    author_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content       TEXT NOT NULL,
    line_number   INTEGER, -- NULL = general comment, not tied to one specific line
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create performance indexes for foreign key lookups on submissions and comments
CREATE INDEX IF NOT EXISTS idx_submissions_project ON submissions(project_id);
CREATE INDEX IF NOT EXISTS idx_comments_submission ON comments(submission_id);