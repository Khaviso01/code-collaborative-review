# Collaborative Code Review Platform

An API-driven service for teams to submit code snippets, request reviews, comment inline, track review status, and get real-time notifications.

## Tech Stack

- **Node.js + TypeScript + Express** — the web server
- **PostgreSQL** (via the `pg` library) — plain SQL, no ORM
- **JWT (jsonwebtoken)** — authentication
- **bcryptjs** — password hashing
- **Socket.IO** — real-time notifications
- **zod** — request body validation

## Database Schema

Four tables: **users**, **projects**, **submissions**, **comments** — plus one small join table, **project_members**, tracking who belongs to which project.

- **Review decisions** live directly on the submission row (`reviewed_by`, `review_action`, `review_comment`, `reviewed_at`). Only the *latest* decision is kept, not a full history.
- **Notifications** are pushed live over WebSocket only — nothing is saved to the database. There is no `GET /notifications` endpoint.

## Project Structure

```
src/
  config/db.ts          - shared PostgreSQL connection pool
  db/schema.sql           - all table definitions
  db/migrate.ts           - runs schema.sql
  types/index.ts          - shared TypeScript interfaces
  utils/                  - jwt helpers, ApiError, asyncHandler, zod schemas
  middleware/              - authenticate, authorize, validate, errorHandler
  controllers/            - one file per feature, talks to the DB directly
  routes/                  - maps URLs -> controller functions
  websocket/socket.ts      - Socket.IO setup; controllers call emitToUser() directly
  app.ts                   - builds the Express app
  server.ts                - starts the HTTP + WebSocket server
```

## Setup

Clone the repository and navigate into the project directory:

```bash
git clone [https://github.com/your-username/code-collborative-review.git](https://github.com/your-username/code-review-platform.git)
cd code-collaborative-review
```
Then
```
npm install
cp .env.example .env        # then fill in your PostgreSQL credentials
createdb code_review_platform
npm run migrate
npm run dev
```

The API is now at `http://localhost:4001/api` (check your terminal for the actual port).

## Authentication

Every route except `/api/auth/register` and `/api/auth/login` requires a JWT:

```
Authorization: Bearer <token>
```

Roles are `submitter` or `reviewer`, chosen at registration. Reviewers can comment, approve, and request changes. Submitters manage their own submissions but cannot comment.

## API Reference

| Method | Path | Description |
|---|---|---|
| POST | /api/auth/register | Create an account |
| POST | /api/auth/login | Log in, get a JWT |
| GET | /api/users/:id | View a profile |
| PUT | /api/users/:id | Update your own profile |
| DELETE | /api/users/:id | Delete your own account |
| POST | /api/projects | Create a project |
| GET | /api/projects | List projects you belong to |
| POST | /api/projects/:id/members | Add a member (owner only) |
| DELETE | /api/projects/:id/members/:userId | Remove a member (owner only) |
| GET | /api/projects/:id/submissions | List a project's submissions |
| GET | /api/projects/:id/stats | Analytics dashboard |
| POST | /api/submissions | Create a submission |
| GET | /api/submissions/:id | View one submission |
| PATCH | /api/submissions/:id/status | Manually change status |
| DELETE | /api/submissions/:id | Delete your own submission |
| POST | /api/submissions/:id/comments | Add a comment (reviewers only) |
| GET | /api/submissions/:id/comments | List comments |
| PUT | /api/comments/:id | Edit your own comment |
| DELETE | /api/comments/:id | Delete your own comment |
| POST | /api/submissions/:id/approve | Approve (reviewers only) |
| POST | /api/submissions/:id/request-changes | Request changes (reviewers only) |
| GET | /api/submissions/:id/reviews | Latest review decision |

---

## Manual Testing (Postman)

**Step 0:** Confirm your database has the current schema (ran `npm run migrate` against a fresh DB, or applied the matching `ALTER TABLE` statements), then run `npm run dev` and note the port it prints.

## Test 1 — Register a Reviewer

- **Method:** `POST`
- **URL:** `http://localhost:4001/api/auth/register` (use your actual port)
- **Body → raw → JSON:**
  ```json
  {"name":"Khaviso Reviewer","email":"rita@gmail.com","password":"secret123","role":"reviewer"}
  ```
- ✅ **Pass if:** you get a `user` and `token` back.
  Copy the token → label it **"Rita's token"**.
  Copy `user.id` → label it **"Rita's ID"**.

## Test 2 — Register a Submitter

Same request, new body:

```json
{"name":"Sam Submitter","email":"sam@test.com","password":"secret123","role":"submitter"}
```

- ✅ **Pass if:** you get a token and id.
Copy them → **"Sam's token"** and **"Sam's ID"**.

## Test 3 — Create a Project (as Sam)

- **Method:** `POST`
- **URL:** `.../api/projects`
- **Auth tab:** Bearer Token → Sam's token
- **Body:**
  ```json
  {"name":"Payments API","description":"Test project"}
  ```
- ✅ **Pass if:** you get a project with an `id`.
  Copy it → **"Project ID"**.

## Test 4 — Add Rita to the Project

- **Method:** `POST`
- **URL:** `.../api/projects/PROJECT_ID/members` (swap in the real ID)
- **Auth:** Sam's token
- **Body:**
  ```json
  {"userId":"RITA_ID"}
  ```
- ✅ **Pass if:** response says "Member added".

## Test 5 — Sam Submits Code

- **Method:** `POST`
- **URL:** `.../api/submissions`
- **Auth:** Sam's token
- **Body:**
  ```json
  {"projectId":"PROJECT_ID","title":"Add login helper","codeContent":"function login() { return true; }","language":"javascript"}
  ```
- ✅ **Pass if:** `"status":"pending"`.
  Copy the `id` → **"Submission ID"**.

## Test 6 — Sam Tries to Comment (Should Be Blocked)

- **Method:** `POST`
- **URL:** `.../api/submissions/SUBMISSION_ID/comments`
- **Auth:** Sam's token
- **Body:** `{"content":"testing"}`
- ✅ **Pass if:** you get **403**. This is *supposed* to fail — submitters can't comment.

## Test 7 — Rita Comments (Should Work)

Same request as Test 6, but **Auth → Rita's token**.

- ✅ **Pass if:** status `201`, comment comes back in the response.

## Test 8 — Rita Approves the Submission

- **Method:** `POST`
- **URL:** `.../api/submissions/SUBMISSION_ID/approve`
- **Auth:** Rita's token
- **Body:** `{"comment":"Looks good"}`
- ✅ **Pass if:** you get back the submission with `"status":"approved"` and `"review_action":"approved"`.

## Test 9 — Check the Latest Review Decision

- **Method:** `GET`
- **URL:** `.../api/submissions/SUBMISSION_ID/reviews`
- **Auth:** Sam's token
- ✅ **Pass if:** you see `"latestReview":{"action":"approved", ...}`.

> **Note:** this only shows the *latest* decision, not a full history — that's expected with the simplified schema.

## Test 10 — Check the Stats

- **Method:** `GET`
- **URL:** `.../api/projects/PROJECT_ID/stats`
- **Auth:** Sam's token
- ✅ **Pass if:** you get back numbers like `totalSubmissions`, `approvalRatePercent`, `mostActiveReviewers`.

---

If all 10 pass, every feature works end to end.

## Testing Real-Time Notifications (WebSocket)

Notifications fire on: new comment, review decision, project invite — pushed live only, nothing persisted. Connect with a JWT:

```js
import { io } from 'socket.io-client';
const socket = io('http://localhost:4001', { auth: { token: 'PASTE_YOUR_JWT_HERE' } });
socket.on('notification', (n) => console.log('New notification!', n));
```

Then, from another account, comment on or review that user's submission — it should print instantly.

## Automated Smoke Test

With `npm run dev` running, in a second terminal:

```
npm run smoke-test
```

Runs the whole flow automatically (register, project, submission, comments, review, permissions, live WebSocket) and prints/per step.
