# Collaborative Kanban Board

A real-time collaborative Kanban board built with **React, TypeScript, Node.js, Express, and PostgreSQL**. Multiple users can create, edit, delete, search, filter, and move tasks across columns while changes are synchronized without refreshing the page.

## Features

### Kanban Board
- Four columns: Backlog, Todo, In Progress, and Done.
- Create, edit, and delete tasks.
- Drag and drop tasks between columns.
- Reorder tasks within the same column.
- Persistent task ordering using position values.

### Task Management
Each task contains:
- Title
- Description
- Priority: Low, Medium, or High
- Assignee
- Status
- Position
- Last updated timestamp

### Search and Filters
- Search tasks by title.
- Filter by priority.
- Filter by assignee.
- Combine multiple filters.
- Persist search and filter state in URL query parameters so the board state can be restored after refreshing.

### Real-Time Collaboration
- Server-Sent Events (SSE) notify connected clients about task creation, updates, and deletion.
- Changes made by another user are synchronized without a page reload.
- Events received during an active local interaction are queued and processed afterward.

### Optimistic Updates and Error Handling
- The UI updates immediately when a user creates, edits, deletes, or moves a task.
- If an API request fails, the relevant optimistic change is rolled back.
- Errors are surfaced to the user.
- Drag-and-drop changes are restored if persistence fails.

## Tech Stack

**Frontend**
- React
- TypeScript
- Vite
- TanStack Query
- dnd-kit
- CSS

**Backend**
- Node.js
- Express.js
- PostgreSQL
- Server-Sent Events (SSE)

## Project Structure

```text
KAN-BAN/
├── src/
│   ├── components/
│   │   ├── board/
│   │   ├── filters/
│   │   └── tasks/
│   ├── hooks/
│   ├── lib/
│   ├── types/
│   └── App.tsx
│
├── server/
│   └── src/
│       ├── controllers/
│       ├── db/
│       ├── routes/
│       ├── services/
│       └── index.js
│
├── public/
├── .env.local
└── README.md
```

## Getting Started

### Prerequisites
- Node.js
- pnpm
- PostgreSQL

### 1. Clone the repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd Kan-ban
```

### 2. Install frontend dependencies

```bash
pnpm install
```

### 3. Configure the frontend

Create `.env.local` in the project root:

```env
VITE_API_URL=http://localhost:5001
```

### 4. Set up PostgreSQL

Create a database:

```sql
CREATE DATABASE kanban_db;
```

Connect to the database and create the tasks table:

```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    priority VARCHAR(10) NOT NULL
        CHECK (priority IN ('low', 'medium', 'high')),
    assignee VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL
        CHECK (status IN ('Backlog', 'Todo', 'In Progress', 'Done')),
    position INTEGER NOT NULL DEFAULT 0
        CHECK (position >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_status_position
ON tasks(status, position);
```

### 5. Configure the backend

Create `server/.env`:

```env
PORT=5001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kanban_db
DB_USER=your_postgres_user
DB_PASSWORD=your_postgres_password
```

Replace the database credentials with your local PostgreSQL configuration.

### 6. Install backend dependencies

```bash
cd server
pnpm install
```

### 7. Start the backend

From the `server` directory:

```bash
node src/index.js
```

The backend runs at:

`http://localhost:5001`

### 8. Start the frontend

Open another terminal in the project root:

```bash
pnpm dev
```

Open the local URL printed by Vite, usually:

`http://localhost:5173`

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/board` | Fetch all board tasks |
| POST | `/api/tasks` | Create a task |
| PATCH | `/api/tasks/:id` | Update a task |
| DELETE | `/api/tasks/:id` | Delete a task |
| GET | `/api/events` | Subscribe to real-time events |

## Handling Optimistic Updates

TanStack Query manages the client-side server state.

When a user performs an action:

1. The query cache is updated immediately.
2. The corresponding API request is sent.
3. On success, the server response is used to reconcile the client state.
4. On failure, the relevant optimistic change is rolled back and the error is surfaced.

Create, update, and delete operations use operation-aware rollback logic. Drag-and-drop also preserves the previous board state so a failed persistence request can restore the original ordering.

## Real-Time Synchronization and Conflict Handling

The backend uses Server-Sent Events to broadcast:

- `TASK_CREATED`
- `TASK_UPDATED`
- `TASK_DELETED`

When an event arrives, the frontend refreshes its board data through TanStack Query.

To avoid overwriting local changes, incoming refreshes are deferred while a user is actively interacting with a task or dragging it. Pending events are processed when the interaction or relevant mutation finishes.

The backend also uses database transactions and table locking while updating task positions. This keeps column ordering consistent when multiple users modify the board.

## Completion Status

The core assignment requirements have been implemented:

- [x] Four-column Kanban board
- [x] Task creation, editing, and deletion
- [x] Drag-and-drop across columns
- [x] Reordering within columns
- [x] Persistent task positions
- [x] Search and combined filters
- [x] URL query parameter persistence
- [x] Task details modal
- [x] Optimistic updates and rollback
- [x] Server-Sent Events
- [x] Deferred synchronization during local interactions
- [x] PostgreSQL persistence

**Deployment:** Add the deployed application URL here after deployment.

## AI Assistance

ChatGPT was used as a development assistant for implementation guidance, debugging, architecture discussions, and understanding concepts during development. Code was reviewed, integrated, and tested as part of the implementation process.
