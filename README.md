# TaskTrack — Ethara.AI Intelligence Platform

A full-stack team task management platform with role-based access for Project Leads, Quality Reviewers, and Taskers.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS v4 |
| State | Zustand + TanStack Query |
| Forms | React Hook Form + Zod |
| Animations | Framer Motion |
| DnD | @dnd-kit/core |
| Backend | Node.js + Express + TypeScript |
| Database | MongoDB Atlas (Mongoose) |
| Auth | JWT (7-day) + bcrypt (12 rounds) |
| Deploy | Railway |

## Project Structure

```
/task-track
  /client        ← React frontend (Vite)
  /server        ← Express backend
  /shared        ← Shared TypeScript types
  railway.json
  README.md
```

## Roles

| Role | Permissions |
|---|---|
| **PROJECT_LEAD** | Creates projects, TODO sessions, assigns tasks, manages buttons, approves leave |
| **QUALITY_REVIEWER** | Views team progress, manages attendance, submits leave |
| **TASKER** | Punches in/out, updates own task progress, applies for leave |

## Quick Start (Local)

### 1. Prerequisites
- Node.js 18+
- MongoDB Atlas account → get a connection string

### 2. Clone & install
```bash
git clone <your-repo>
npm run install:all
```

### 3. Configure environment
```bash
# Copy and fill in your MongoDB URI
cp .env.example server/.env
```

Edit `server/.env`:
```
MONGODB_URI=mongodb+srv://YOUR_USER:YOUR_PASS@cluster.mongodb.net/tasktrack
JWT_SECRET=run-openssl-rand-base64-32-to-generate
NODE_ENV=development
PORT=3000
CLIENT_URL=http://localhost:5173
```

### 4. Run development servers

**Terminal 1 — Backend:**
```bash
cd server
npm run dev
# → http://localhost:3000
```

**Terminal 2 — Frontend:**
```bash
cd client
npm run dev
# → http://localhost:5173
```

The client proxies `/api` calls to the backend automatically.

## Deploy to Railway

1. Push to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Set environment variables in Railway:
   ```
   MONGODB_URI   = your MongoDB Atlas URI
   JWT_SECRET    = (generate: openssl rand -base64 32)
   NODE_ENV      = production
   PORT          = 3000
   ```
4. Railway auto-builds using `railway.json` → starts `node dist/index.js`
5. The Express server serves the React build from `server/public/`

## API Overview

| Group | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Users | `GET /api/users/project-leads`, `GET /api/users/quality-reviewers`, `GET /api/users/my-team` |
| Projects | `GET/POST /api/projects`, `GET/PUT/DELETE /api/projects/:id` |
| TODO Sessions | `GET/POST /api/todo-sessions`, `GET/PUT/DELETE /api/todo-sessions/:id`, `POST /api/todo-sessions/:id/upload-stem`, `GET /api/todo-sessions/:id/progress` |
| Task Entries | `PUT /api/task-entries/:id/progress`, `PUT /api/task-entries/:id/stem-row`, `GET /api/task-entries` |
| Attendance | `POST /api/attendance/punch-in`, `POST /api/attendance/punch-out`, `GET /api/attendance/today`, `GET /api/attendance`, `GET /api/attendance/report` |
| Leave | `POST /api/leave`, `GET /api/leave`, `GET /api/leave/pending`, `PUT /api/leave/:id/approve`, `PUT /api/leave/:id/reject` |
| Dashboard | `GET /api/dashboard/today`, `GET /api/dashboard/team-progress` |

## Getting Started Workflow

1. **Register a Project Lead** → login
2. **Create a project** at `/projects`
3. **Register QR & Taskers** pointing to your PL account
4. **Create a TODO session** at `/create-todo` — select project, assign taskers, build buttons
5. **Taskers log in** → punch in → update task progress on dashboard
6. **PL/QR** monitor progress at `/team-progress` (auto-refreshes every 60s)

## Security

- All routes require JWT except `/api/auth/*` and `/api/users/project-leads`, `/api/users/quality-reviewers`  
- `scopeToTeam` middleware ensures data isolation — a tasker from Team A cannot access Team B data
- Punch-in gate: taskers cannot submit task progress without today's attendance record (enforced at API + UI level)
- Passwords hashed with bcrypt (12 rounds)

## Environment Variables Reference

| Variable | Description | Required |
|---|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string | ✅ |
| `JWT_SECRET` | Random secret for JWT signing | ✅ |
| `NODE_ENV` | `development` or `production` | ✅ |
| `PORT` | Server port (Railway sets automatically) | Optional |
| `CLIENT_URL` | Frontend URL for CORS | Optional |
| `MAX_FILE_SIZE` | Max upload size (default `10mb`) | Optional |
