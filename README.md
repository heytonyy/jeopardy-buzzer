# Jeopardy Buzzer

A real-time classroom buzzer system built with React, Node.js, Socket.IO, and SQLite.

## Prerequisites

- Node.js 18+
- npm 9+

## Setup

1. **Clone / enter the project directory**

2. **Install all dependencies**

   ```bash
   npm run install:all
   ```

   Or manually:
   ```bash
   npm install
   cd server && npm install && cd ..
   cd client && npm install && cd ..
   ```

3. **Configure environment**

   ```bash
   cp .env.example server/.env
   ```

   Edit `server/.env` if you want to change the teacher username/password or JWT secret.

4. **Start the dev servers**

   ```bash
   npm run dev
   ```

   This runs both the backend (port 3001) and frontend (port 5173) concurrently.

## Usage

### Teacher

1. Open [http://localhost:5173/login](http://localhost:5173/login)
2. Log in with:
   - **Username:** `teacher` (or whatever you set in `server/.env`)
   - **Password:** `jeopardy123` (or whatever you set in `server/.env`)
3. Click **Create New Room** — a 6-character room code will be generated
4. Read the room code to students
5. Use the control panel to:
   - **OPEN BUZZERS** — lets students buzz in
   - **RESET BUZZERS** — clears rankings and reopens
   - **CLOSE BUZZERS** — disables buzzing
6. Click a team in the rankings to select them to answer — a 5-second timer starts on all screens
7. Click **Kick** next to a team name to remove them
8. Click **End Room** to close the session

### Participants (Students)

1. Open [http://localhost:5173/join](http://localhost:5173/join) on any device
2. Enter the room code and a team name
3. Tap the big **BUZZ!** button when buzzers are open
4. Your rank appears immediately after buzzing

## Testing with Multiple Browser Tabs

1. Open the teacher screen in one tab (log in at `/login`)
2. Create a room and note the code
3. Open 2–3 more tabs at `/join`, use different team names (e.g. "Team A", "Team B")
4. Open buzzers on the teacher screen and click buzz in each participant tab
5. Watch rankings update in real-time across all tabs

## Project Structure

```
jeopardy-buzzer/
├── client/              # Vite + React frontend
│   └── src/
│       ├── pages/       # LoginPage, DashboardPage, TeacherGamePage, JoinPage, ParticipantGamePage
│       ├── components/  # ProtectedRoute
│       ├── api.js       # Axios instance
│       ├── socket.js    # Socket.IO client instances
│       └── sounds.js    # Web Audio API sound effects
├── server/              # Express + Socket.IO backend
│   └── src/
│       ├── routes/      # auth.js, rooms.js
│       ├── middleware/  # auth.js (JWT)
│       ├── db.js        # SQLite setup
│       ├── socket.js    # All Socket.IO event handlers
│       └── index.js     # Server entry point
└── package.json         # Root — runs both with concurrently
```
