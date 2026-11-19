# Student Attendance System — Student B backend

This branch contains the Express API and MySQL schema. The frontend and the
root-level Docker Compose file are integration work and are not included here.

## Project files

```text
Student_Attendance_System/
├── backend/
│   ├── .dockerignore
│   ├── Dockerfile
│   ├── package.json
│   └── server.js
└── database/
    └── init.sql
```

`package-lock.json` is created by `npm install` and should be committed with the
other backend files.

## 1. Branch and project setup

Open the cloned repository folder in VS Code, then open **Terminal → New
Terminal**. From the repository root, check where you are and which branch is
active:

```powershell
git status
git branch
```

Work on `student-b-backend`, not `main`. To create the branch the first time:

```powershell
git switch -c student-b-backend
```

If it already exists locally, use `git switch student-b-backend` instead.
`git switch` changes branches; `git status` shows the branch and file changes;
`git branch` lists local branches. If you have not cloned the shared repository,
copy its HTTPS/SSH URL from GitHub and run `git clone <repository-url>`, then
`cd` into the cloned folder. Do not run `git switch -c` again if the branch
already exists.

## 2. Install and start the backend locally

From the repository root:

```powershell
cd backend
npm install
```

`npm init -y` creates a default Node project manifest (`package.json`). In this
project it has already been done. `npm install express mysql2 cors` installs
Express (HTTP routes), MySQL2 (database driver), and CORS (permits browser
requests from the frontend origin). `package.json` records project settings and
dependency versions; `package-lock.json` records the exact dependency tree so
installs are repeatable. Run `npm install` after cloning to install dependencies.

Start a local MySQL server first, then open `database/init.sql` in MySQL
Workbench and execute it to create the database and tables. The API's local
defaults are:

| Variable | Default |
|---|---|
| `DB_HOST` | `localhost` |
| `DB_USER` | `root` |
| `DB_PASSWORD` | `root123` |
| `DB_NAME` | `attendance_db` |
| `PORT` | `5000` |

Set different values in the current PowerShell terminal before starting, if
needed. These values apply to that terminal only:

```powershell
$env:DB_HOST = "localhost"
$env:DB_USER = "root"
$env:DB_PASSWORD = "your-local-mysql-password"
$env:DB_NAME = "attendance_db"
$env:PORT = "5000"
npm start
```

`npm start` runs `node server.js`. The API checks its database connection before
listening on `0.0.0.0:5000`; a database connection failure is reported in the
terminal instead of starting a server that cannot serve requests. Do not commit
real passwords. The example defaults are for local practice only.

## 3. API endpoints

Base URL: `http://localhost:5000`. All responses are JSON. IDs must be positive
integers; required text fields cannot be blank.

| Method and URL | Request JSON | Result |
|---|---|---|
| `POST /students` | `{"name":"John Doe","reg_number":"2024/BCS/001"}` | `201`, success message and generated `id` |
| `GET /students` | None | `200`, array of students |
| `POST /attendance` | `{"student_id":1,"status":"Present"}` | `201`, success message and generated attendance `id` |
| `GET /attendance` | None | `200`, attendance records including student name and registration number |

Example PowerShell requests (keep `npm start` running in another terminal):

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:5000/students `
  -ContentType "application/json" `
  -Body '{"name":"John Doe","reg_number":"2024/BCS/001"}'

Invoke-RestMethod -Method Get -Uri http://localhost:5000/students

Invoke-RestMethod -Method Post -Uri http://localhost:5000/attendance `
  -ContentType "application/json" `
  -Body '{"student_id":1,"status":"Present"}'

Invoke-RestMethod -Method Get -Uri http://localhost:5000/attendance
```

You can open `http://localhost:5000/students` and
`http://localhost:5000/attendance` in a browser to test the GET requests.
POST requests need Postman, the PowerShell examples above, or frontend code.
Success responses use HTTP `201` for inserts and `200` for reads. Invalid input
returns `400`, a duplicate registration number returns `409`, an unknown route
returns `404`, and unexpected server/database errors return `500`.

The API uses parameterized SQL (`?` placeholders), so user input is not joined
into SQL text. Student registration numbers are unique. Attendance dates are
filled in by MySQL when a record is inserted.

## 4. How the frontend calls the API

The frontend can send JSON with `fetch`. If the student ID is held in a form or
selected student row, use it for the attendance request:

```javascript
const response = await fetch("http://localhost:5000/students", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "John Doe", reg_number: "2024/BCS/001" })
});
const result = await response.json();
if (!response.ok) throw new Error(result.error);
```

Use the same pattern with `/attendance` and a JSON body containing
`student_id` and `status`. CORS is enabled by the backend so a browser frontend
on another local port can make requests. Browser `localhost` means the computer
running the browser; inside a container, `localhost` means that container
itself.

## 5. Build and run the backend container

From the repository root, the image can be built with:

```powershell
docker build -t student-attendance-backend ./backend
```

The Dockerfile starts with the official Node.js 22 Alpine image (`FROM`),
sets `/app` as its working folder (`WORKDIR`), copies package files (`COPY`),
installs packages (`RUN`), copies the application (`COPY`), documents port
5000 (`EXPOSE`), and starts the server (`CMD`). `EXPOSE` documents the
container port; publishing it to the host is done with `-p` or Compose.

The backend container also needs a MySQL server. For final integration, run it
with the project's root-level `docker-compose.yml` and set `DB_HOST=db` on the
backend service. `db` is the Compose service name and resolves to MySQL on the
Compose network; `localhost` inside the backend container would point back to
the backend itself.

Compose integration requirements for the integration student:

- Build frontend from `./frontend` and backend from `./backend`.
- Use `mysql:8.4` for the database; configure its environment and a named data
  volume, and mount `database/init.sql` to
  `/docker-entrypoint-initdb.d/init.sql`.
- Set backend variables including `DB_HOST=db`, `DB_USER`, `DB_PASSWORD`,
  `DB_NAME=attendance_db`, and `PORT=5000`.
- Add a MySQL health check and make the backend depend on the healthy `db`
  service. The API independently checks its connection at startup.
- Publish frontend `8080:80` (depending on its web server) and backend
  `5000:5000`.
- Use matching database credentials in both services. MySQL initialization
  scripts run only when the data directory is first initialized; changing an
  init script does not alter an existing database volume.

Common Compose commands, from the folder containing `docker-compose.yml`:

```powershell
docker compose up --build -d
docker compose ps
docker ps
docker compose logs backend
docker compose logs db
docker compose restart backend
docker compose down
```

`docker compose down` stops and removes the containers but retains named
volumes. `docker compose down -v` also removes the volumes and permanently
deletes the database data stored there. Use `-v` only when you intend to reset
that data.

## 6. Troubleshooting and final checks

- **`ECONNREFUSED` / cannot connect to MySQL:** Confirm MySQL is running, its
  host and port are reachable, and `DB_HOST` is correct (`localhost` locally,
  `db` inside Compose).
- **Access denied:** Check the username/password in the backend environment
  against the MySQL configuration. For Compose, both services must agree.
- **Unknown database:** Execute `database/init.sql` or check `DB_NAME`.
- **Port already in use:** Stop the other process using port 5000 or set a
  different `PORT`, then use that port in the frontend URL.
- **Container exits:** Run `docker compose logs backend` and `docker compose
  logs db`; confirm environment variables and database health.
- **HTTP 500:** Read the backend terminal/container logs and confirm that the
  tables exist. The API returns a generic error to callers and logs details
  server-side.
- **CORS error:** Use the correct API URL and keep CORS enabled. A browser page
  opened from a different host/container may not share the browser's
  `localhost`.
- **Data disappears:** Confirm Compose uses a named MySQL volume and avoid
  `docker compose down -v`.

Before submission, check that MySQL starts, all four endpoints work, invalid
input is rejected, attendance links to an existing student, the frontend can
call the API, and data remains after a normal container restart.

## 7. GitHub submission

From the repository root, review the branch and files, then stage, commit, and
push only Student B's work:

```powershell
git status
git add backend/ database/ README.md
git status
git commit -m "Build attendance backend and database"
git push -u origin student-b-backend
```

`git add` stages the selected files, `git commit` saves a local snapshot, and
`git push -u` publishes the branch and sets its upstream. Confirm
`student-b-backend` appears in the GitHub branch list. Create a Pull Request
with base `main` and compare `student-b-backend`, titled **Add Student
Attendance Backend and Database**. Review the changed files and let the team
review and merge it. A Pull Request is a proposal for review and merging; it
does not merge automatically.

After both branches are merged, update the local integration branch:

```powershell
git switch main
git pull origin main
```

This switches to `main` and downloads the latest merged changes.

## 8. Examination quick review

Commands to remember:

- Node: `npm install`, `npm start`.
- Git: `git status`, `git branch`, `git switch student-b-backend`,
  `git add backend/ database/`, `git commit -m "message"`,
  `git push -u origin student-b-backend`.
- MySQL: `CREATE DATABASE attendance_db;`, `USE attendance_db;`,
  `SHOW TABLES;`, `SELECT * FROM students;`,
  `SELECT * FROM attendance;`.
- Docker: `docker compose up --build -d`, `docker compose ps`,
  `docker compose logs backend`, `docker compose down`.

Short theory:

- **What is Express?** A Node.js framework for defining HTTP routes and
  middleware.
- **What is MySQL2?** A Node.js client library for connecting to MySQL.
- **Why parameterized queries?** They treat input as data rather than SQL code,
  helping prevent SQL injection.
- **What is a foreign key?** A database rule connecting a record to an existing
  record in another table.
- **Why use environment variables?** They configure the app per environment
  without embedding credentials in source code.
- **What does CORS do?** It lets a browser permit frontend requests to an API
  hosted at a different origin, subject to the server's CORS policy.
- **Why use `db` instead of `localhost` in Compose?** Compose services reach
  each other by service name; container-local `localhost` refers to itself.
- **What is the difference between `down` and `down -v`?** `down` removes
  containers but keeps named data volumes; `down -v` removes both.

Practical checklist: confirm the correct branch; install packages; create the
schema; start the API; register and list a student; record and list attendance;
test an invalid request; inspect logs; build/run via Compose with the integration
team; verify persisted data; push the branch; open the Pull Request. Keep
screenshots of the running app/API, successful requests, GitHub branch/PR, and
Compose containers if your instructor asks for evidence.
