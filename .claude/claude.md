Build me a real-time "Jeopardy Buzzer" web application for classroom use.
This is a local-first app (runs on localhost) that will later be deployed
to AWS with a custom domain and SSL. Focus on clean, working code now.

---

## TECH STACK

- **Frontend:** React (Vite)
- **Backend:** Node.js + Express
- **Real-time:** Socket.IO (WebSockets for buzzer events)
- **Auth:** Simple JWT-based teacher login (no OAuth needed)
- **Database:** SQLite via better-sqlite3 (lightweight, no setup needed locally)
- **Styling:** Tailwind CSS
- **Monorepo structure:** /client (React) and /server (Express) folders in one repo

---

## PROJECT STRUCTURE
/jeopardy-buzzer
/client          ← Vite + React frontend
/server          ← Express + Socket.IO backend
.env.example
README.md

---

## FEATURES

### TEACHER SIDE

**Authentication**
- Single hardcoded teacher account stored in .env:
  TEACHER_USERNAME and TEACHER_PASSWORD (hashed with bcrypt on first boot,
  stored in SQLite)
- JWT issued on login, stored in localStorage, sent as Bearer token on API calls
- A simple /login page with username + password fields

**Room Management**
- After login, teacher lands on a dashboard
- Teacher can click "Create New Room" — generates a random 6-character
  alphanumeric room code (e.g. "JX72KA")
- Room is saved to DB with status: "waiting"
- Teacher can have only ONE active room at a time
- Teacher can end/close the room (clears all participants and resets state)
- Fresh room each session (no persistent rooms across days — teacher just
  creates a new one each class period)

**Teacher Game Screen (once room is created)**
- Shows the room code prominently so teacher can read it to students
- Shows a live list of connected participant teams with their chosen names
- A participant team can be kicked from the list

**Buzzer Control Panel**
- "OPEN BUZZERS" button — enables buzzing for all participants
- "RESET BUZZERS" button — clears the current buzz ranking, re-enables buzzing
- "CLOSE BUZZERS" button — disables buzzing (e.g., between questions)
- Buzzer state is shown clearly (OPEN / CLOSED)

**Buzz Ranking Display**
- When buzzers are open and teams buzz in, show a ranked list in real-time:
  #1 [Team Name] — 0.0s
  #2 [Team Name] — 0.3s
  etc.
- Timestamps relative to when buzzers were opened
- Teams that haven't buzzed are shown below in grey

**Select to Answer + Timer**
- Teacher can click on any team in the ranking to "select" them to answer
- When selected, a 5-second countdown timer starts SIMULTANEOUSLY on:
  - The teacher's screen
  - The selected team's participant screen
  - All other participant screens (show them someone is answering)
- Timer counts down visually (large numbers, color changes: green → yellow → red)
- When timer hits 0, an alert sound plays (use a simple Web Audio API beep,
  no external audio files needed) and the timer resets
- After timer, teacher decides correct/incorrect manually (no scoring needed —
  teacher uses physical whiteboard answers)

---

### PARTICIPANT SIDE

**Join Flow**
- Participant navigates to the app URL (same domain, different route: /join)
- Enter the Room Code + choose a Team Name
- No login, no password — guests only
- If room code is invalid or room is closed, show a friendly error
- Team name must be unique within the room (server enforces this)

**Participant Game Screen**
- Shows their team name and current room code
- Large BUZZ button (takes up most of the screen — easy to tap on a phone/tablet)
- Button is greyed out / disabled when buzzers are CLOSED
- When buzzers are OPEN, button is bright and active
- When they buzz in, show their rank immediately:
  "You buzzed in #1!" or "You buzzed in #3!"
- Show the full ranking list of who buzzed in what order
- When teacher selects them to answer: 
  - Their screen shows a highlighted "YOUR TURN!" banner + 5-second countdown timer
- When teacher selects a DIFFERENT team to answer:
  - Their screen shows "[Team Name] is answering..." + the same 5-second countdown

---

## REAL-TIME ARCHITECTURE (Socket.IO Events)

Use these named events (document them in code comments):

Server → Client:
- `room:state` — full room state snapshot (sent on join)
- `buzzers:opened` — buzzers are now open (includes server timestamp)
- `buzzers:closed` — buzzers are now closed
- `buzzers:reset` — clear rankings, re-open
- `buzz:ranking` — updated ranking list after each buzz
- `answer:timer:start` — a team has been selected, timer starts (includes teamId)
- `answer:timer:end` — timer finished
- `participant:kicked` — sent to a specific participant when teacher kicks them

Client → Server:
- `buzz:in` — participant buzzes in (server records timestamp)
- `join:room` — participant joins with { roomCode, teamName }
- `teacher:open` — teacher opens buzzers
- `teacher:close` — teacher closes buzzers
- `teacher:reset` — teacher resets buzzers
- `teacher:select` — teacher selects team { teamId }
- `teacher:kick` — teacher kicks team { teamId }

---

## UI / UX REQUIREMENTS

- **Mobile-first** for participant screens (students use phones/tablets)
- **Desktop-optimized** for teacher screen
- Tailwind CSS for all styling — clean, minimal, modern
- Color scheme: Dark navy/blue for teacher, clean white/light for participants
- The BUZZ button on participant screen should be HUGE — at least 60% of
  the viewport height on mobile
- Countdown timer should be very large and visible on both screens
- All real-time updates should be smooth (no page refreshes)
- Add a simple favicon (emoji or SVG, no external image files)

---

## ENVIRONMENT VARIABLES (.env)
PORT=3001
JWT_SECRET=changeme
TEACHER_USERNAME=teacher
TEACHER_PASSWORD=jeopardy123
CLIENT_URL=http://localhost:5173

---

## LOCAL DEVELOPMENT SETUP

- `npm run dev` in /server starts the Express + Socket.IO server on port 3001
- `npm run dev` in /client starts the Vite dev server on port 5173
- CORS should be configured in Express to allow the Vite dev origin
- Provide a root-level package.json with a `dev` script that runs both
  concurrently using the `concurrently` package
- Include a thorough README.md with:
  - Prerequisites (Node 18+)
  - Setup steps (npm install, copy .env.example, npm run dev)
  - How to log in as teacher
  - How to test with multiple browser tabs as participants

---

## NICE-TO-HAVE FEATURES (implement if straightforward, skip if complex)

- Sound effect when buzzers are opened (a short "ding" via Web Audio API)
- Sound effect when a buzz is registered
- "Reconnect" logic — if a participant loses connection, they can rejoin
  the same room with the same team name and resume
- Teacher can rename the room (display name, not the code)
- Participant screen shows a pulsing animation while waiting for buzzers to open
- If teacher navigates away and comes back, their session is restored
  (JWT is still valid, room still exists)

---

## WHAT TO BUILD FIRST (in this order)

1. Project scaffolding (monorepo, package.json files, Tailwind config)
2. SQLite schema + server bootstrap
3. Teacher login (API + UI)
4. Room creation API
5. Socket.IO server setup
6. Participant join flow (UI + socket)
7. Teacher game screen (UI + socket)
8. Buzzer open/close/reset logic
9. Buzz-in ranking logic
10. Select-to-answer + countdown timer (both screens)
11. Polish: mobile layout, animations, sounds
12. README

Do not skip steps — build and test each layer before moving to the next.
